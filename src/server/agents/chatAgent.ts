import { GoogleGenAI, Type, type Content, type Part } from "@google/genai";
import { Chord, Scale } from "tonal";
import { env } from "~/env";
import { normalizeScaleName } from "~/lib/music/theory";
import * as fs from "fs";
import * as path from "path";
import { generateStrudelCode } from "~/server/agents/strudelAgent";

const MAX_GEMINI_ATTEMPTS = 5;

// Load Strudel documentation
const STRUDEL_DOCS = fs.readFileSync(
  path.join(process.cwd(), "src/condensedDocs.txt"),
  "utf-8",
);

const CHAT_SYSTEM_INSTRUCTION = `You are a helpful music assistant for a music improvisation learning tool. Your goal is to help young guitarists learn how to improvise.

When responding to recorded solos, start with a high-level overview (sparse vs full, in-key vs out-of-key, resolution strength), then share 2–3 concrete improvement starting points and invite questions.

You can:
1. Request backing track edits
2. Show scales on the fretboard
3. Show chords with diagrams that users can save
4. Answer basic music theory questions (scales, modes, arpeggios) using the music_theory_query tool
5. Offer music theory solo suggestions and feedback to accompany the current backing track. This can range from high level theory of using a single scale for starting, to utilizing certain arpeggios that fit over the V.

IMPORTANT NOTE NOTATION: When mentioning note names or chords, always use FLAT notation (♭) instead of sharps (#). Use Db, Eb, Gb, Ab, Bb instead of C#, D#, F#, G#, A#.

IMPORTANT: Always use the appropriate tool when relevant:
- When the user asks to make changes to the backing track → call request_backing_track_update with a concise request. Do NOT write Strudel code yourself.
- When the user asks to see a scale or show notes on the fretboard → call show_scale
- When suggesting chords, discussing chord progressions, or answering "what chord should I use" → call show_chord with the chord names (using flat notation)
- When the user asks about music theory (scales/modes/arpeggios) → call music_theory_query, then follow up with show_scale and/or show_chord as needed.
- When recommending chords for practice or soloing → call show_chord to display them (using flat notation)
- When you need to understand or modify Strudel code syntax → call query_strudel_docs to access the documentation
- You can use show_chord and include a description if appropriate

Tool usage policy:
- Never include Strudel code in tool calls or responses.
- Never expose tool calls or raw tool responses to the user; use them only to craft your reply.

For chord voicings from chords-db, you can optionally set a 0-based voicingIndex (default to 0).

Be conversational and helpful. Understand musical terminology and context. When suggesting chords for the user to practice or try, ALWAYS use the show_chord tool so they can see the chord diagram and save it.

RESPONSE FORMAT: At the end of every response, add exactly 2 suggested follow-up questions or actions the user might want to take next. Format them like this:
---SUGGESTIONS---
Suggestion 1 text here
---
Suggestion 2 text here

Keep suggestions short (5-10 words), natural, and relevant to the conversation. 
Suggestions should either be questions about music theory, or tasks to carry out written as commands.
Examples: "Show me the G major scale", "Add more bass to the track", "What other chords work here?"`;

const REQUEST_BACKING_TRACK_UPDATE_TOOL = {
  name: "request_backing_track_update",
  description:
    "Requests an updated backing track based on a user change request. The system will generate valid Strudel code separately.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      userRequest: {
        type: Type.STRING,
        description:
          "A concise description of the change the user wants (e.g., slow down to 90 BPM, add bass, switch to swing feel).",
      },
      explanation: {
        type: Type.STRING,
        description: "A brief explanation of what was changed.",
      },
    },
    required: ["userRequest"],
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
          "The root note of the scale (prefer flat notation: Db, Eb, Gb, Ab, Bb instead of C#, D#, F#, G#, A#)",
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

const SHOW_CHORD_TOOL = {
  name: "show_chord",
  description:
    "Shows one or more chords in the chat with chord diagrams. Use this when the user asks about chords, wants to see chord shapes, or needs chord suggestions. The user can then add them to saved chords manually. Optionally include voicingIndex (0-based) to choose a chord voicing from chords-db. Prefer flat notation (Db, Eb, Gb, Ab, Bb) over sharps.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      chord: {
        type: Type.STRING,
        description:
          "The chord name in standard notation using flat notation (e.g., Dbmaj7, Ebm7, Gb, Abm, Bb7)",
      },
      chords: {
        type: Type.ARRAY,
        items: {
          type: Type.STRING,
        },
        description:
          "A list of chord names to show using flat notation (e.g., [Dbmaj7, Ebm7, Gb7]).",
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
    "Answers music theory questions (scales, modes, arpeggios, chords) using Tonal. Use this to compute notes or intervals for a scale/chord/arpeggio. Prefer flat notation.",
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
          "Root note using flat notation (e.g., C, Db, Eb, Gb, Ab, Bb). Defaults to the current session key if omitted.",
      },
      scale: {
        type: Type.STRING,
        description:
          "Scale or mode name (e.g., major, minor, dorian, mixolydian). Defaults to current session modality if omitted.",
      },
      chord: {
        type: Type.STRING,
        description:
          "Chord name for chord/arpeggio queries using flat notation (e.g., Dbmaj7, Ebm7, Gb7).",
      },
    },
    required: ["queryType"],
  },
};

const QUERY_STRUDEL_DOCS_TOOL = {
  name: "query_strudel_docs",
  description:
    "Retrieves the complete Strudel documentation. Use this when you need to understand Strudel syntax, functions, or capabilities before editing the backing track code.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
    required: [],
  },
};

type ConversationEntry = Content;
type ConversationPart = Part;

export type ToolResult =
  | { type: "edit_backing_track"; newStrudelCode: string; explanation: string }
  | { type: "show_scale"; key: string; modality: string }
  | { type: "show_chord"; chord: string; voicingIndex?: number };

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

const buildStrudelEditPrompt = (input: {
  strudelCode: string;
  userRequest: string;
}) => `Update the following Strudel backing track based on the user's request.

Current backing track:
\`\`\`
${input.strudelCode}
\`\`\`

User request:
${input.userRequest}

Return the full updated Strudel program only.`;

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
      case REQUEST_BACKING_TRACK_UPDATE_TOOL.name: {
        const userRequest =
          typeof args.userRequest === "string" ? args.userRequest.trim() : "";
        const explanation =
          typeof args.explanation === "string" && args.explanation.trim().length
            ? args.explanation.trim()
            : "Updated backing track per request.";

        if (!userRequest) {
          response = {
            success: false,
            error: "No backing track request provided",
          };
        } else {
          try {
            const newStrudelCode = await generateStrudelCode(
              buildStrudelEditPrompt({
                strudelCode: currentContext.strudelCode,
                userRequest,
              }),
            );

            response = {
              success: true,
              message: `Backing track updated: ${explanation}`,
            };
            toolResult = {
              type: "edit_backing_track",
              newStrudelCode,
              explanation,
            };
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : "Unknown error";
            response = {
              success: false,
              error: errorMessage,
            };
          }
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

      case SHOW_CHORD_TOOL.name: {
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
          uniqueChords.forEach((name) => {
            const resolvedVoicing = chordVoicingMap.get(name);
            toolResults.push({
              type: "show_chord",
              chord: name,
              ...(typeof resolvedVoicing === "number"
                ? { voicingIndex: resolvedVoicing }
                : {}),
            });
          });

          response = {
            success: true,
            message: `Showing chord${uniqueChords.length > 1 ? "s" : ""}: ${uniqueChords.join(", ")}`,
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

      case QUERY_STRUDEL_DOCS_TOOL.name: {
        response = {
          success: true,
          documentation: STRUDEL_DOCS,
        };
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

export async function runChatAgent(
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

  const prompt = `${CHAT_SYSTEM_INSTRUCTION}

  Current session context:
  - Key: ${context.key}
  - Modality: ${context.modality}
  - Saved chords: ${context.savedChords.join(", ")}
  - Current backing track code:
  \`\`\`
  ${context.strudelCode}
  \`\`\`

  User message:
  ${userMessage}`;

  const conversation: ConversationEntry[] =
    context.conversationHistory && context.conversationHistory.length > 0
      ? [...context.conversationHistory, createUserPrompt(prompt)]
      : [createUserPrompt(prompt)];

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
        tools: [
          {
            functionDeclarations: [
              REQUEST_BACKING_TRACK_UPDATE_TOOL,
              SHOW_SCALE_TOOL,
              SHOW_CHORD_TOOL,
              MUSIC_THEORY_TOOL,
              QUERY_STRUDEL_DOCS_TOOL,
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
