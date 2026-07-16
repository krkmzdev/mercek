import { initTRPC } from '@trpc/server';
import superjson from 'superjson';

/**
 * tRPC context. Kept DB-free in S0 — session/auth wiring lands in a later sprint.
 * The request headers are carried so procedures can resolve auth on demand.
 */
export async function createTRPCContext(opts: { headers: Headers }): Promise<{ headers: Headers }> {
  return { headers: opts.headers };
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;
