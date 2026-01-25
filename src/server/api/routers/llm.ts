import { z } from "zod";
import { GoogleGenAI, Type, type Content, type Part } from "@google/genai";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { env } from "~/env";
import * as fs from "fs";
import * as path from "path";
import {
  validateStrudel,
  type StrudelValidationResult,
} from "~/services/strudelValidation";

// Load the system prompt and docs
const STRUDEL_PROMPT = fs.readFileSync(
  path.join(process.cwd(), "src/prompts/strudel-system-prompt.txt"),
  "utf-8",
);

const STRUDEL_DOCS = fs.readFileSync(
  path.join(process.cwd(), "src/condensedDocs.txt"),
  "utf-8",
);

const SYSTEM_INSTRUCTION = `IMPORTANT: ${STRUDEL_PROMPT}\n\n ## Strudel Documentation Reference:\n\n${STRUDEL_DOCS}\n\n## Validation Requirement:\nAlways call the \"validate_strudel_code\" tool with the full Strudel program before you present any output. Only return Strudel code that passes validation (transpiles and evaluates without errors). If validation fails, fix the code or explain why it cannot be fixed.`;
const MAX_GEMINI_ATTEMPTS = 5;

const VALIDATE_STRUDEL_FUNCTION_DECLARATION = {
  name: "validate_strudel_code",
  description:
    "Validates Strudel code by transpiling and running static analysis to surface syntax issues before execution.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      code: {
        type: Type.STRING,
        description: "Raw Strudel code that should be validated.",
      },
    },
    required: ["code"],
  },
} as const;

const logValidationSkip = (attempt: number, context: string) => {
  console.warn(
    `[Gemini Attempt ${attempt}] Skipping Strudel validation (${context}); DEBUG_SKIP_STRUDEL_VALIDATION is enabled.`,
  );
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

const isFunctionCallPart = (
  part: ConversationPart,
): part is ConversationPart & {
  functionCall: { name?: string; args?: unknown };
} => typeof part.functionCall === "object" && part.functionCall !== null;

const getCodeArgument = (args: unknown): string => {
  if (typeof args === "string") {
    return args;
  }

  if (args && typeof args === "object" && "code" in args) {
    const codeValue = (args as { code?: unknown }).code;
    return typeof codeValue === "string" ? codeValue : "";
  }

  return "";
};

const stripCodeFences = (raw: string) =>
  raw.replace(/```[\w]*\n?([\s\S]*?)\n?```/g, "$1").trim();

const serializeLogPayload = (payload: unknown) => {
  if (typeof payload === "string") {
    return payload;
  }

  try {
    return JSON.stringify(payload);
  } catch {
    return String(payload);
  }
};

const logGeminiAttempt = (attempt: number, label: string, payload: unknown) => {
  console.info(
    `[Gemini Attempt ${attempt}] ${label}`,
    serializeLogPayload(payload),
  );
};

const RESPONSE_TEXT_PREVIEW_LIMIT = 160;
const VALIDATION_SNIPPET_LIMIT = 120;

const createSnippet = (value: string, limit: number) =>
  value.length > limit ? `${value.slice(0, limit)}...` : value;

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

const createResponsePreview = (response: unknown) => {
  const typedResponse = response as {
    functionCalls?: Array<{ name?: string | null } | null> | null;
    candidates?: Array<{ content?: ConversationEntry | null } | null> | null;
  };

  const textPreview = typedResponse.candidates
    ?.map((candidate) =>
      extractTextFromParts(candidate?.content?.parts ?? undefined),
    )
    .find((text) => text.length > 0);

  return {
    functionCalls: typedResponse.functionCalls
      ?.map((call) => (call?.name ? { name: call.name } : null))
      .filter(Boolean),
    textPreview: textPreview
      ? createSnippet(textPreview, RESPONSE_TEXT_PREVIEW_LIMIT)
      : undefined,
  };
};

const extractCandidateText = (candidateContent?: ConversationEntry) =>
  stripCodeFences(extractTextFromParts(candidateContent?.parts ?? undefined));

const logValidatorResult = (
  attempt: number,
  code: string,
  result: StrudelValidationResult,
  context: "function-call" | "final-response",
) => {
  logGeminiAttempt(attempt, "validator result", {
    snippet: createSnippet(code, VALIDATION_SNIPPET_LIMIT),
    isValid: result.isValid,
    error: result.error,
    context,
  });
};

const runStrudelValidationWithLogging = async (
  attempt: number,
  code: string,
  context: "function-call" | "final-response",
) => {
  const validation = await validateStrudel(code);
  logValidatorResult(attempt, code, validation, context);
  return validation;
};

const handleValidatorFunctionCalls = async (
  conversation: ConversationEntry[],
  candidateContent: ConversationEntry | undefined,
  attempt: number,
): Promise<{ handled: boolean; validatedCode?: string }> => {
  const functionCallParts =
    candidateContent?.parts?.filter(isFunctionCallPart) ?? [];
  const validatorCallParts = functionCallParts.filter(
    (part) =>
      part.functionCall.name === VALIDATE_STRUDEL_FUNCTION_DECLARATION.name,
  );

  if (!validatorCallParts.length) {
    return { handled: false as const };
  }

  const functionResponseParts: ConversationPart[] = [];
  let validatedCode: string | undefined;

  for (const part of validatorCallParts) {
    const functionCall = part.functionCall;
    const rawCode = getCodeArgument(functionCall.args);
    const sanitizedCode = stripCodeFences(rawCode);

    if (!sanitizedCode) {
      throw new Error(
        "Gemini requested Strudel validation but did not provide code to validate.",
      );
    }

    const validation = await runStrudelValidationWithLogging(
      attempt,
      sanitizedCode,
      "function-call",
    );

    functionResponseParts.push({
      functionResponse: {
        name: functionCall.name ?? VALIDATE_STRUDEL_FUNCTION_DECLARATION.name,
        response: validation,
      },
    });

    if (validation.isValid && !validatedCode) {
      validatedCode = sanitizedCode;
    }
  }

  conversation.push({ role: "user", parts: functionResponseParts });
  return { handled: true as const, validatedCode };
};

async function callGeminiAPI(prompt: string): Promise<string> {
  const ai = new GoogleGenAI({
    apiKey: env.GEMINI_API_KEY,
  });

  const conversation: ConversationEntry[] = [createUserPrompt(prompt)];
  for (let attempt = 1; attempt <= MAX_GEMINI_ATTEMPTS; attempt++) {
    const lastMessage = conversation[conversation.length - 1];
    logGeminiAttempt(attempt, "-> request", lastMessage);

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: conversation,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        thinkingConfig: {
          thinkingBudget: 0,
        },
        tools: [
          {
            functionDeclarations: [VALIDATE_STRUDEL_FUNCTION_DECLARATION],
          },
        ],
      },
    });

    logGeminiAttempt(attempt, "<- response", createResponsePreview(response));

    const candidateContent = cloneContent(response.candidates?.[0]?.content);

    if (candidateContent) {
      conversation.push(candidateContent);
    }

    const handledFunctionCalls = await handleValidatorFunctionCalls(
      conversation,
      candidateContent,
      attempt,
    );

    if (handledFunctionCalls.validatedCode) {
      return handledFunctionCalls.validatedCode;
    }

    if (handledFunctionCalls.handled) {
      continue;
    }

    const strippedText = extractCandidateText(candidateContent);

    if (!strippedText) {
      throw new Error("No text in response from Gemini API");
    }

    const finalValidation = await runStrudelValidationWithLogging(
      attempt,
      strippedText,
      "final-response",
    );

    if (finalValidation.isValid) {
      return strippedText;
    }

    const errorMessage = finalValidation.error?.message ?? "Validation failed";
    conversation.push({
      role: "user",
      parts: [
        {
          text: `Validator rejected the Strudel code with: ${errorMessage}. Please fix the issue and retry, ensuring you call validate_strudel_code.`,
        },
      ],
    });

    continue;
  }

  throw new Error(
    "Gemini failed to produce valid Strudel code after 5 attempts.",
  );
}

export const llmRouter = createTRPCRouter({
  generateBackingTrack: publicProcedure
    .input(
      z.object({
        genre: z.string().describe("Music genre/style"),
        key: z.string().describe("Key of the backing track"),
        bars: z.number().int().min(1).max(64).describe("Number of bars"),
        instruments: z.array(z.string()).describe("List of instruments to use"),
        bpm: z.number().int().min(40).max(240).describe("Tempo in BPM"),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const userPrompt = `Generate a ${input.bars}-bar ${input.genre} backing track in ${input.key} at ${input.bpm} BPM with the following instruments: ${input.instruments.join(", ")}.`;
        const code = await callGeminiAPI(userPrompt);

        return {
          success: true,
          code,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        return {
          success: false,
          error: errorMessage,
        };
      }
    }),
});
