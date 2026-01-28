import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { generateStrudelCode } from "~/server/agents/strudelAgent";

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
        const code = await generateStrudelCode(userPrompt);

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
