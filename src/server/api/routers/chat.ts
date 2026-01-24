import { z } from "zod";
import { GoogleGenAI, Type, type Content, type Part } from "@google/genai";
import { Chord, Scale } from "tonal";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { env } from "~/env";

const MAX_GEMINI_ATTEMPTS = 5;

const CHAT_SYSTEM_INSTRUCTION = `You are a helpful music assistant for a music improvisation learning tool. Your goal is to help young guitarists learn how to improvise. 

You can:
1. Edit the backing track (Strudel code)
2. Show scales on the fretboard
3. Add chords to the saved chords list
4. Answer basic music theory questions (scales, modes, arpeggios) using the music_theory_query tool
5. Offer music theory solo suggestions and feedback to accompany the current backing track. This can range from high level theory of using a single scale for starting, to utilizing certain arpeggions that fit over the V.

When the user asks to make changes to the backing track, call the edit_backing_track tool.
When the user asks to see a scale or show notes on the fretboard, call the show_scale tool.
When the user asks to add or save a chord, call the add_chord tool. Chord voicings are available from chords-db; you can optionally set a 0-based voicingIndex.
When the user asks a music theory question (like what scales/arpeggios fit), call the music_theory_query tool and if applicable show_scale and/or add_chords
Always use the current backing track Strudel code and the session context when answering.

Be conversational and helpful. Understand musical terminology and context.`;

// Tool declarations
const EDIT_BACKING_TRACK_TOOL = {
  name: "edit_backing_track",
  description:
    "Edits the Strudel backing track code based on user request. Use this when the user wants to modify instruments, tempo, chords, or any aspect of the backing track.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      newStrudelCode: {
        type: Type.STRING,
        description:
          "The complete new Strudel code for the backing track. Must be valid Strudel syntax.",
      },
      explanation: {
        type: Type.STRING,
        description:
          "A brief explanation of what was changed in the backing track.",
      },
    },
    required: ["newStrudelCode", "explanation"],
  },
};

const SHOW_SCALE_TOOL = {
  name: "show_scale",
  description:
    "Shows a musical scale on the fretboard. Use this when the user wants to see scale patterns or practice specific scales.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      key: {
        type: Type.STRING,
        description:
          "The root note of the scale (e.g., C, D, E, F, G, A, B, with optional sharp # or flat b)",
      },
      modality: {
        type: Type.STRING,
        description:
          "The scale type or mode (e.g., Major, Minor, Dorian, Phrygian, Lydian, Mixolydian, Aeolian, Locrian)",
      },
    },
    required: ["key", "modality"],
  },
};

const ADD_CHORD_TOOL = {
  name: "add_chord",
  description:
    "Adds one or more chords to the saved chords list. Use this when the user wants to save or remember a chord for later use. Optionally include voicingIndex (0-based) to choose a chord voicing from chords-db.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      chord: {
        type: Type.STRING,
        description:
          "The chord name in standard notation (e.g., Cmaj7, Dm7, G, Am, E7)",
      },
      chords: {
        type: Type.ARRAY,
        items: {
          type: Type.STRING,
        },
        description:
          "A list of chord names to add in standard notation (e.g., [Cmaj7, Dm7, G7]).",
      },
      voicingIndex: {
        type: Type.NUMBER,
        description:
          "Optional 0-based index for the chord voicing to use from chords-db (use 0 if unsure).",
      },
      voicingIndexes: {
        type: Type.ARRAY,
        items: {
          type: Type.NUMBER,
        },
        description:
          "Optional list of 0-based voicing indexes aligned with the chords array.",
      },
    },
    required: [],
  },
};

const MUSIC_THEORY_TOOL = {
  name: "music_theory_query",
  description:
    "Answers music theory questions (scales, modes, arpeggios, chords) using Tonal. Use this to compute notes or intervals for a scale/chord/arpeggio.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      queryType: {
        type: Type.STRING,
        description: "The type of theory query: scale, arpeggio, or chord.",
      },
      root: {
        type: Type.STRING,
        description:
          "Root note for the scale (e.g., C, D#, Bb). Defaults to the current session key if omitted.",
      },
      scale: {
        type: Type.STRING,
        description:
          "Scale or mode name (e.g., major, minor, dorian, mixolydian). Defaults to current session modality if omitted.",
      },
      chord: {
        type: Type.STRING,
        description:
          "Chord name for chord/arpeggio queries (e.g., Cmaj7, Dm7, G7).",
      },
    },
    required: ["queryType"],
  },
};

type ConversationEntry = Content;
type ConversationPart = Part;

const MODALITY_TO_TONAL: Record<string, string> = {
  Major: "major",
  Minor: "minor",
  "Natural Minor": "natural minor",
  "Harmonic Minor": "harmonic minor",
  "Melodic Minor": "melodic minor",
  Dorian: "dorian",
  Phrygian: "phrygian",
  Lydian: "lydian",
  Mixolydian: "mixolydian",
  Aeolian: "aeolian",
  Locrian: "locrian",
};

const normalizeScaleName = (name: string) =>
  MODALITY_TO_TONAL[name] ?? name.toLowerCase();

export type ToolResult =
  | { type: "edit_backing_track"; newStrudelCode: string; explanation: string }
  | { type: "show_scale"; key: string; modality: string }
  | { type: "add_chord"; chord: string; voicingIndex?: number };

const isFunctionCallPart = (
  part: ConversationPart,
): part is ConversationPart & {
  functionCall: { name?: string; args?: Record<string, unknown> };
} => typeof part.functionCall === "object" && part.functionCall !== null;

const createUserPrompt = (prompt: string): ConversationEntry => ({
  role: "user",
  parts: [{ text: prompt }],
});

const cloneContent = (content?: ConversationEntry) =>
  content
    ? (JSON.parse(JSON.stringify(content)) as ConversationEntry)
    : undefined;

const extractTextFromParts = (parts?: ConversationPart[]) => {
  if (!parts?.length) {
    return "";
  }

  return parts
    .map((part) => (typeof part.text === "string" ? part.text : ""))
    .filter((text) => text.trim().length > 0)
    .join("\n")
    .trim();
};

const handleToolCalls = async (
  conversation: ConversationEntry[],
  candidateContent: ConversationEntry | undefined,
  currentContext: {
    key: string;
    modality: string;
    strudelCode: string;
    savedChords: string[];
  },
): Promise<{ handled: boolean; toolResults: ToolResult[] }> => {
  const functionCallParts =
    candidateContent?.parts?.filter(isFunctionCallPart) ?? [];

  if (!functionCallParts.length) {
    return { handled: false, toolResults: [] };
  }

  const functionResponseParts: ConversationPart[] = [];
  const toolResults: ToolResult[] = [];

  for (const part of functionCallParts) {
    const functionCall = part.functionCall;
    const functionName = functionCall.name;
    const args = functionCall.args ?? {};

    let response: Record<string, unknown>;
    let toolResult: ToolResult | null = null;

    switch (functionName) {
      case EDIT_BACKING_TRACK_TOOL.name: {
        const newStrudelCode =
          typeof args.newStrudelCode === "string" ? args.newStrudelCode : "";
        const explanation =
          typeof args.explanation === "string" ? args.explanation : "";

        if (!newStrudelCode) {
          response = {
            success: false,
            error: "No Strudel code provided",
          };
        } else {
          response = {
            success: true,
            message: `Backing track updated: ${explanation}`,
          };
          toolResult = {
            type: "edit_backing_track",
            newStrudelCode,
            explanation,
          };
        }
        break;
      }

      case SHOW_SCALE_TOOL.name: {
        const key =
          typeof args.key === "string" ? args.key : currentContext.key;
        const modality =
          typeof args.modality === "string"
            ? args.modality
            : currentContext.modality;

        response = {
          success: true,
          message: `Showing ${key} ${modality} scale on the fretboard`,
        };
        toolResult = { type: "show_scale", key, modality };
        break;
      }

      case ADD_CHORD_TOOL.name: {
        const chord = typeof args.chord === "string" ? args.chord : "";
        const chordList = Array.isArray(args.chords)
          ? args.chords.filter(
              (item): item is string => typeof item === "string",
            )
          : [];
        const voicingIndex =
          typeof args.voicingIndex === "number" &&
          Number.isFinite(args.voicingIndex)
            ? Math.max(0, Math.floor(args.voicingIndex))
            : undefined;
        const voicingIndexes = Array.isArray(args.voicingIndexes)
          ? args.voicingIndexes
              .filter(
                (value): value is number =>
                  typeof value === "number" && Number.isFinite(value),
              )
              .map((value) => Math.max(0, Math.floor(value)))
          : [];
        const requestedChords = [chord, ...chordList].filter(
          (item) => item.trim().length > 0,
        );
        const uniqueChords = Array.from(new Set(requestedChords));
        const chordVoicingMap = new Map<string, number>();

        requestedChords.forEach((name, index) => {
          const fromArray = voicingIndexes[index];
          const resolved =
            typeof fromArray === "number" ? fromArray : voicingIndex;
          if (typeof resolved === "number" && !chordVoicingMap.has(name)) {
            chordVoicingMap.set(name, resolved);
          }
        });

        if (uniqueChords.length === 0) {
          response = {
            success: false,
            error: "No chord name provided",
          };
        } else {
          const addedChords: string[] = [];
          const skippedChords: string[] = [];

          uniqueChords.forEach((name) => {
            if (currentContext.savedChords.includes(name)) {
              skippedChords.push(name);
            } else {
              addedChords.push(name);
              const resolvedVoicing = chordVoicingMap.get(name);
              toolResults.push({
                type: "add_chord",
                chord: name,
                ...(typeof resolvedVoicing === "number"
                  ? { voicingIndex: resolvedVoicing }
                  : {}),
              });
            }
          });

          const messages: string[] = [];
          if (addedChords.length > 0) {
            messages.push(`Added ${addedChords.join(", ")} to saved chords`);
          }
          if (skippedChords.length > 0) {
            messages.push(`Already saved: ${skippedChords.join(", ")}`);
          }

          response = {
            success: true,
            message: messages.join(". "),
          };
        }
        break;
      }

      case MUSIC_THEORY_TOOL.name: {
        const queryTypeRaw =
          typeof args.queryType === "string" ? args.queryType : "";
        const queryType = queryTypeRaw.toLowerCase();
        const root =
          typeof args.root === "string" && args.root.trim().length > 0
            ? args.root.trim()
            : currentContext.key;
        const scaleInput =
          typeof args.scale === "string" && args.scale.trim().length > 0
            ? args.scale.trim()
            : currentContext.modality;
        const scaleName = normalizeScaleName(scaleInput);
        const chordName =
          typeof args.chord === "string" ? args.chord.trim() : "";

        if (queryType === "scale") {
          const scale = Scale.get(`${root} ${scaleName}`.trim());
          if (!scale.notes.length) {
            response = {
              success: false,
              error: `Unknown scale: ${root} ${scaleName}`,
            };
          } else {
            response = {
              success: true,
              queryType: "scale",
              root,
              scale: scaleName,
              notes: scale.notes,
              intervals: scale.intervals,
            };
          }
        } else if (queryType === "arpeggio" || queryType === "chord") {
          if (!chordName) {
            response = {
              success: false,
              error:
                "Chord name required for arpeggio/chord queries (e.g., Cmaj7, Dm7, G7).",
            };
          } else {
            const chord = Chord.get(chordName);
            if (!chord.notes.length) {
              response = {
                success: false,
                error: `Unknown chord: ${chordName}`,
              };
            } else {
              response = {
                success: true,
                queryType,
                chord: chordName,
                notes: chord.notes,
                intervals: chord.intervals,
                aliases: chord.aliases,
              };
            }
          }
        } else {
          response = {
            success: false,
            error: "Unsupported queryType. Use scale, arpeggio, or chord.",
          };
        }
        break;
      }

      default: {
        response = {
          success: false,
          error: `Unknown tool: ${functionName}`,
        };
      }
    }

    functionResponseParts.push({
      functionResponse: {
        name: functionName ?? "unknown",
        response,
      },
    });

    if (toolResult) {
      toolResults.push(toolResult);
    }
  }

  conversation.push({ role: "user", parts: functionResponseParts });
  return { handled: true, toolResults };
};

async function callGeminiChatAPI(
  userMessage: string,
  context: {
    key: string;
    modality: string;
    strudelCode: string;
    savedChords: string[];
    conversationHistory?: ConversationEntry[];
  },
): Promise<{
  response: string;
  toolResults: ToolResult[];
  updatedHistory: ConversationEntry[];
}> {
  const ai = new GoogleGenAI({
    apiKey: env.GEMINI_API_KEY,
  });

  console.info("[chat] LLM request context", {
    key: context.key,
    modality: context.modality,
    savedChordsCount: context.savedChords.length,
    strudelCodeLength: context.strudelCode.length,
    conversationHistoryCount: context.conversationHistory?.length ?? 0,
    userMessage,
  });

  const systemInstruction = `${CHAT_SYSTEM_INSTRUCTION}

Current session context:
- Key: ${context.key}
- Modality: ${context.modality}
- Saved chords: ${context.savedChords.join(", ")}
- Current backing track code:
\`\`\`
${context.strudelCode}
\`\`\``;

  const conversation: ConversationEntry[] =
    context.conversationHistory && context.conversationHistory.length > 0
      ? [...context.conversationHistory, createUserPrompt(userMessage)]
      : [createUserPrompt(userMessage)];

  const allToolResults: ToolResult[] = [];

  for (let attempt = 1; attempt <= MAX_GEMINI_ATTEMPTS; attempt++) {
    console.info("[chat] LLM attempt", {
      attempt,
      maxAttempts: MAX_GEMINI_ATTEMPTS,
      conversationLength: conversation.length,
    });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: conversation,
      config: {
        systemInstruction,
        tools: [
          {
            functionDeclarations: [
              EDIT_BACKING_TRACK_TOOL,
              SHOW_SCALE_TOOL,
              ADD_CHORD_TOOL,
              MUSIC_THEORY_TOOL,
            ],
          },
        ],
      },
    });

    const candidateContent = cloneContent(response.candidates?.[0]?.content);

    console.info("[chat] LLM raw response", {
      candidates: response.candidates?.length ?? 0,
      finishReason: response.candidates?.[0]?.finishReason ?? null,
      hasContent: Boolean(candidateContent),
      partsCount: candidateContent?.parts?.length ?? 0,
    });

    if (candidateContent) {
      conversation.push(candidateContent);
    }

    const { handled, toolResults } = await handleToolCalls(
      conversation,
      candidateContent,
      context,
    );

    if (toolResults.length > 0) {
      console.info("[chat] LLM tool results", toolResults);
    }

    if (toolResults.length > 0) {
      allToolResults.push(...toolResults);
    }

    if (handled) {
      continue;
    }

    // Extract final response text
    const responseText = extractTextFromParts(candidateContent?.parts);

    console.info("[chat] LLM response text", {
      hasText: responseText.length > 0,
      textLength: responseText.length,
    });

    if (!responseText) {
      if (allToolResults.length > 0) {
        // If we have tool results but no text, generate a default response
        return {
          response: "I've made those changes for you!",
          toolResults: allToolResults,
          updatedHistory: conversation,
        };
      }
      throw new Error("No response from Gemini API");
    }

    return {
      response: responseText,
      toolResults: allToolResults,
      updatedHistory: conversation,
    };
  }

  throw new Error(
    "Gemini chat failed to produce a valid response after max attempts.",
  );
}

export const chatRouter = createTRPCRouter({
  sendMessage: publicProcedure
    .input(
      z.object({
        message: z.string().describe("User's chat message"),
        key: z.string().describe("Current musical key"),
        modality: z.string().describe("Current musical modality/scale"),
        strudelCode: z.string().describe("Current Strudel backing track code"),
        savedChords: z.array(z.string()).describe("List of saved chord names"),
        conversationHistory: z
          .array(
            z.object({
              role: z.enum(["user", "model"]),
              parts: z.array(z.any()),
            }),
          )
          .optional()
          .describe("Previous conversation history"),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const { response, toolResults, updatedHistory } =
          await callGeminiChatAPI(input.message, {
            key: input.key,
            modality: input.modality,
            strudelCode: input.strudelCode,
            savedChords: input.savedChords,
            conversationHistory: input.conversationHistory,
          });

        return {
          success: true,
          response,
          toolResults,
          updatedHistory,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        return {
          success: false,
          error: errorMessage,
          response: "Sorry, I encountered an error processing your request.",
          toolResults: [],
          updatedHistory: input.conversationHistory ?? [],
        };
      }
    }),
});
