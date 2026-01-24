import { GoogleGenAI, Type, type Content, type Part } from "@google/genai";
import { env } from "~/env";
import {
  analyzeHarmonicContext,
  buildChordScaleRecommendation,
  buildChordToneRecommendation,
  type MidiNoteEvent,
  type ParsedChordToken,
} from "~/lib/audio/harmonic-analysis";
import type { AnalysisInput, AnalysisOutput, AnalysisToolResult } from "~/types/analysis";

const MAX_GEMINI_ATTEMPTS = 3;

const ANALYSIS_PROMPT_INSTRUCTION = `You are a friendly, human-sounding improvisation coach. Start with a high-level overview of how the solo went (e.g., sparse vs full, in-key vs out-of-key, strong/weak resolution). Then highlight 2–3 concrete places to begin improving and invite the user to ask questions. When chord-specific alternatives are needed, call the appropriate tools to fetch chord tones or chord-scale options. Keep the response short, clear, and encouraging.`;

const RECOMMEND_CHORD_TONES_TOOL = {
  name: "recommend_chord_tones",
  description:
    "Return chord tones and a short recommendation for emphasizing arpeggio targets.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      chord: {
        type: Type.STRING,
        description: "Chord symbol (e.g., Dm7, G7, Cmaj7).",
      },
    },
    required: ["chord"] as string[],
  },
};

const RECOMMEND_CHORD_SCALE_TOOL = {
  name: "recommend_chord_scale",
  description:
    "Return a chord-scale suggestion and notes based on chord quality and key.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      chord: {
        type: Type.STRING,
        description: "Chord symbol (e.g., Dm7, G7, Cmaj7).",
      },
      key: {
        type: Type.STRING,
        description: "Session key (e.g., C, D#, Bb).",
      },
      modality: {
        type: Type.STRING,
        description: "Session modality (e.g., Major, Dorian, Mixolydian).",
      },
    },
    required: ["chord"] as string[],
  },
};

type ConversationEntry = Content;

type ConversationPart = Part;

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

const isFunctionCallPart = (
  part: ConversationPart,
): part is ConversationPart & {
  functionCall: { name?: string; args?: Record<string, unknown> };
} => typeof part.functionCall === "object" && part.functionCall !== null;

const handleToolCalls = async (
  conversation: ConversationEntry[],
  candidateContent: ConversationEntry | undefined,
  context: { key: string; modality: string },
): Promise<{ handled: boolean; toolResults: AnalysisToolResult[] }> => {
  const functionCallParts =
    candidateContent?.parts?.filter(isFunctionCallPart) ?? [];

  if (!functionCallParts.length) {
    return { handled: false, toolResults: [] };
  }

  const functionResponseParts: ConversationPart[] = [];
  const toolResults: AnalysisToolResult[] = [];

  for (const part of functionCallParts) {
    const functionCall = part.functionCall;
    const functionName = functionCall.name;
    const args = functionCall.args ?? {};

    let response: Record<string, unknown> = { success: false };

    switch (functionName) {
      case RECOMMEND_CHORD_TONES_TOOL.name: {
        const chord = typeof args.chord === "string" ? args.chord : "";
        if (!chord) {
          response = { success: false, error: "Missing chord." };
          break;
        }

        const recommendation = buildChordToneRecommendation(chord);
        const suggestion = `Emphasize chord tones (${recommendation.chordTones.join(
          ", ",
        )}) on strong beats to outline ${recommendation.symbol}.`;

        response = {
          success: true,
          chord: recommendation.symbol,
          chordTones: recommendation.chordTones,
          suggestion,
        };

        toolResults.push({
          type: "chord_tone_recommendation",
          chord: recommendation.symbol,
          chordTones: recommendation.chordTones,
          quality: recommendation.quality,
          symbol: recommendation.symbol,
          suggestion,
        });
        break;
      }

      case RECOMMEND_CHORD_SCALE_TOOL.name: {
        const chord = typeof args.chord === "string" ? args.chord : "";
        const key = typeof args.key === "string" ? args.key : context.key;
        const modality =
          typeof args.modality === "string" ? args.modality : context.modality;

        if (!chord) {
          response = { success: false, error: "Missing chord." };
          break;
        }

        const recommendation = buildChordScaleRecommendation(
          chord,
          key,
          modality,
        );
        const suggestion = `Try ${recommendation.root} ${recommendation.scaleName} (${recommendation.scaleNotes.join(
          ", ",
        )}) to match ${recommendation.symbol}.`;

        response = {
          success: true,
          chord: recommendation.symbol,
          scaleName: recommendation.scaleName,
          scaleNotes: recommendation.scaleNotes,
          suggestion,
        };

        toolResults.push({
          type: "chord_scale_recommendation",
          chord: recommendation.symbol,
          scaleName: recommendation.scaleName,
          scaleNotes: recommendation.scaleNotes,
          quality: recommendation.quality,
          symbol: recommendation.symbol,
          suggestion,
        });
        break;
      }

      default:
        response = { success: false, error: "Unknown tool call." };
        break;
    }

    functionResponseParts.push({
      functionResponse: {
        name: functionName ?? "unknown",
        response,
      },
    });
  }

  conversation.push({ role: "user", parts: functionResponseParts });
  return { handled: true, toolResults };
};

const summarizeAnalysis = async (input: {
  summaryPayload: Record<string, unknown>;
  key: string;
  modality: string;
}): Promise<{ response: string; toolResults: AnalysisToolResult[] }> => {
  if (!env.GEMINI_API_KEY) {
    return {
      response:
        "Analysis complete. Configure GEMINI_API_KEY to enable AI feedback.",
      toolResults: [],
    };
  }

  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  const prompt = `${ANALYSIS_PROMPT_INSTRUCTION}\n\nAnalyze this solo and suggest improvements. Use tools for chord-tone or chord-scale alternatives when helpful.\n\n${JSON.stringify(
    input.summaryPayload,
    null,
    2,
  )}`;

  const conversation: ConversationEntry[] = [createUserPrompt(prompt)];
  const toolResults: AnalysisToolResult[] = [];

  for (let attempt = 1; attempt <= MAX_GEMINI_ATTEMPTS; attempt++) {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: conversation,
      config: {
        tools: [
          {
            functionDeclarations: [
              RECOMMEND_CHORD_TONES_TOOL,
              RECOMMEND_CHORD_SCALE_TOOL,
            ],
          },
        ],
      },
    });

    const candidateContent = cloneContent(response.candidates?.[0]?.content);
    if (candidateContent) {
      conversation.push(candidateContent);
    }

    const toolCallResult = await handleToolCalls(conversation, candidateContent, {
      key: input.key,
      modality: input.modality,
    });

    if (toolCallResult.handled) {
      toolResults.push(...toolCallResult.toolResults);
      continue;
    }

    const responseText = extractTextFromParts(candidateContent?.parts ?? []);
    return {
      response: responseText || "Analysis complete.",
      toolResults,
    };
  }

  return {
    response: "Analysis complete.",
    toolResults,
  };
};

export const analyzeRecording = async (
  input: AnalysisInput,
): Promise<AnalysisOutput> => {
  const harmonicAnalysis = analyzeHarmonicContext({
    midiData: input.midiData,
    parsedChords: input.parsedChords,
    tempo: input.tempo,
    timeSignature: input.timeSignature,
    key: input.key,
    modality: input.modality,
  });

  const summaryPayload = {
    key: input.key,
    modality: input.modality,
    tempo: input.tempo,
    timeSignature: input.timeSignature,
    skillLevel: input.skillLevel ?? "beginner",
    metrics: harmonicAnalysis.metrics,
    perChord: harmonicAnalysis.perChord,
    melodicContour: harmonicAnalysis.melodicContour,
    intervalDistribution: harmonicAnalysis.intervalDistribution,
  };

  const aiSummary = await summarizeAnalysis({
    summaryPayload,
    key: input.key,
    modality: input.modality,
  });

  return {
    success: true,
    analysis: harmonicAnalysis,
    recommendations: {
      summary: aiSummary.response,
      toolResults: aiSummary.toolResults,
    },
  };
};
