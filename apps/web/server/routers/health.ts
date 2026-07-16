import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';

export const healthRouter = createTRPCRouter({
  /** Liveness ping — round-trips typed, no DB dependency. */
  ping: publicProcedure.query(() => ({
    ok: true as const,
    service: 'mercek-web',
    time: new Date(),
  })),

  /** Typed echo — proves end-to-end type inference + superjson transform. */
  echo: publicProcedure.input(z.object({ message: z.string().min(1) })).query(({ input }) => ({
    message: input.message,
    length: input.message.length,
  })),
});
