import { z } from "zod";
import { GoogleGenAI, Type, type Content, type Part } from "@google/genai";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { env } from "~/env";

const MAX_GEMINI_ATTEMPTS = 5;

const CHAT_SYSTEM_INSTRUCTION = `You are a helpful music assistant for a jam session application. You can:
1. Edit the backing track (Strudel code)
2. Show scales on the fretboard
3. Add chords to the saved chords list

When the user asks to make changes to the backing track, call the edit_backing_track tool.
When the user asks to see a scale or show notes on the fretboard, call the show_scale tool.
When the user asks to add or save a chord, call the add_chord tool.

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
    "Adds a chord to the saved chords list. Use this when the user wants to save or remember a chord for later use.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      chord: {
        type: Type.STRING,
        description:
          "The chord name in standard notation (e.g., Cmaj7, Dm7, G, Am, E7)",
      },
    },
    required: ["chord"],
  },
};

type ConversationEntry = Content;
type ConversationPart = Part;

export type ToolResult =
  | { type: "edit_backing_track"; newStrudelCode: string; explanation: string }
  | { type: "show_scale"; key: string; modality: string }
  | { type: "add_chord"; chord: string };

const isFunctionCallPart = (
  part: ConversationPart,
): part is ConversationPart & {
  functionCall: { name?: string; args?: unknown };
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
    const args = (functionCall.args ?? {}) as Record<string, unknown>;

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

        if (!chord) {
          response = {
            success: false,
            error: "No chord name provided",
          };
        } else if (currentContext.savedChords.includes(chord)) {
          response = {
            success: true,
            message: `Chord ${chord} is already in your saved chords`,
          };
        } else {
          response = {
            success: true,
            message: `Added ${chord} to saved chords`,
          };
          toolResult = { type: "add_chord", chord };
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
            ],
          },
        ],
      },
    });

    const candidateContent = cloneContent(response.candidates?.[0]?.content);

    if (candidateContent) {
      conversation.push(candidateContent);
    }

    const { handled, toolResults } = await handleToolCalls(
      conversation,
      candidateContent,
      context,
    );

    if (toolResults.length > 0) {
      allToolResults.push(...toolResults);
    }

    if (handled) {
      continue;
    }

    // Extract final response text
    const responseText = extractTextFromParts(candidateContent?.parts);

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
