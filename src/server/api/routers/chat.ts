import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { runChatAgent } from "~/server/agents/chatAgent";
import { analyzeRecording } from "~/services/analysisService";

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
        const { response, toolResults, updatedHistory } = await runChatAgent(
          input.message,
          {
            key: input.key,
            modality: input.modality,
            strudelCode: input.strudelCode,
            savedChords: input.savedChords,
            conversationHistory: input.conversationHistory,
          },
        );

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
  analyzeRecording: publicProcedure
    .input(
      z.object({
        midiData: z.array(
          z.object({
            pitch: z.number().int(),
            velocity: z.number().int(),
            startTime: z.number(),
            duration: z.number(),
          }),
        ),
        parsedChords: z.array(
          z.object({
            chord: z.union([z.string(), z.array(z.string())]),
            index: z.number(),
          }),
        ),
        tempo: z.number().min(30).max(260),
        timeSignature: z.string(),
        key: z.string(),
        modality: z.string(),
        skillLevel: z.enum(["beginner", "intermediate", "advanced"]).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return analyzeRecording(input);
    }),
});
