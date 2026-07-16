import { createCallerFactory, createTRPCRouter } from './trpc';
import { healthRouter } from './routers/health';

export const appRouter = createTRPCRouter({
  health: healthRouter,
});

export type AppRouter = typeof appRouter;

/** Server-side caller factory (for RSC / tests). */
export const createCaller = createCallerFactory(appRouter);
