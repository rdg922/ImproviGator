import { postRouter } from "~/server/api/routers/post";
import { llmRouter } from "~/server/api/routers/llm";
import { chatRouter } from "~/server/api/routers/chat";
import { analysisRouter } from "~/server/api/routers/analysis";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  post: postRouter,
  llm: llmRouter,
  chat: chatRouter,
  analysis: analysisRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
