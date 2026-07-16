import type { z } from 'zod';

/**
 * LLM router contract (spec §9.1). Adapters receive an implementation via
 * {@link MapContext} for fuzzy schema mapping. The concrete router (routing,
 * caching, telemetry, cost accounting) is built in the core LLM layer in S4;
 * this is only the interface adapters program against.
 */
export type LlmTask = 'vision-extract' | 'schema-map' | 'analyze' | 'analyze-deep';

export interface LlmUsage {
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
}

export interface LlmCompleteOpts<T> {
  system?: string;
  prompt: string;
  /** When present, the router returns a validated structured object. */
  schema?: z.ZodType<T>;
  temperature?: number;
}

export interface LlmResult<T> {
  data: T;
  model: string;
  usage: LlmUsage;
}

export interface LlmStreamChunk<T> {
  textDelta?: string;
  final?: LlmResult<T>;
}

export interface LlmRouter {
  complete<T>(task: LlmTask, opts: LlmCompleteOpts<T>): Promise<LlmResult<T>>;
  stream<T>(task: LlmTask, opts: LlmCompleteOpts<T>): AsyncIterable<LlmStreamChunk<T>>;
}
