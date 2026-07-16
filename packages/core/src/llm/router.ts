import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject, generateText, streamText, type LanguageModel } from 'ai';
import type {
  LlmCompleteOpts,
  LlmResult,
  LlmRouter,
  LlmStreamChunk,
  LlmTask,
} from '@mercek/sdk';
import { routingConfig, type RoutingConfig } from './config';
import { computeCostUsd, type TokenUsage } from './cost';

export interface UsageRecord {
  task: LlmTask;
  model: string;
  usage: TokenUsage;
  costUsd: number;
}

export interface LlmRouterDeps {
  /** Resolve a model id to an AI SDK model. See {@link googleModelResolver}. */
  resolveModel: (modelId: string) => LanguageModel;
  config?: RoutingConfig;
  /** Telemetry/cost hook, invoked after every completed call. */
  onUsage?: (record: UsageRecord) => void;
}

/** Default resolver: the Google provider. */
export function googleModelResolver(apiKey?: string): (modelId: string) => LanguageModel {
  const google = createGoogleGenerativeAI(apiKey ? { apiKey } : {});
  return (modelId: string) => google(modelId);
}

function toTokenUsage(usage: {
  inputTokens?: number;
  outputTokens?: number;
  inputTokenDetails?: { cacheReadTokens?: number };
}): TokenUsage {
  return {
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    // AI SDK v7 exposes cached input under inputTokenDetails.cacheReadTokens.
    cachedInputTokens: usage.inputTokenDetails?.cacheReadTokens,
  };
}

/**
 * The LLM router (spec §9.1): a thin domain layer over the AI SDK. The SDK
 * handles provider mechanics (streaming, structured output); the router owns
 * routing, telemetry, and cost accounting. Model resolution is injected so it
 * runs against a mock model in tests without a live key.
 */
export function createLlmRouter(deps: LlmRouterDeps): LlmRouter {
  const config = deps.config ?? routingConfig;

  function account(task: LlmTask, model: string, rawUsage: TokenUsage): number {
    const costUsd = computeCostUsd(rawUsage, config[task].pricing);
    deps.onUsage?.({ task, model, usage: rawUsage, costUsd });
    return costUsd;
  }

  return {
    async complete<T>(task: LlmTask, opts: LlmCompleteOpts<T>): Promise<LlmResult<T>> {
      const cfg = config[task];
      const model = deps.resolveModel(cfg.model);

      if (opts.schema) {
        const { object, usage } = await generateObject({
          model,
          schema: opts.schema,
          system: opts.system,
          prompt: opts.prompt,
          temperature: opts.temperature,
        });
        const raw = toTokenUsage(usage);
        const costUsd = account(task, cfg.model, raw);
        return {
          data: object as T,
          model: cfg.model,
          usage: { tokensIn: raw.inputTokens ?? 0, tokensOut: raw.outputTokens ?? 0, costUsd },
        };
      }

      const { text, usage } = await generateText({
        model,
        system: opts.system,
        prompt: opts.prompt,
        temperature: opts.temperature,
      });
      const raw = toTokenUsage(usage);
      const costUsd = account(task, cfg.model, raw);
      return {
        data: text as T,
        model: cfg.model,
        usage: { tokensIn: raw.inputTokens ?? 0, tokensOut: raw.outputTokens ?? 0, costUsd },
      };
    },

    async *stream<T>(
      task: LlmTask,
      opts: LlmCompleteOpts<T>,
    ): AsyncIterable<LlmStreamChunk<T>> {
      const cfg = config[task];
      const model = deps.resolveModel(cfg.model);

      const result = streamText({
        model,
        system: opts.system,
        prompt: opts.prompt,
        temperature: opts.temperature,
      });

      let text = '';
      for await (const delta of result.textStream) {
        text += delta;
        yield { textDelta: delta };
      }

      const raw = toTokenUsage(await result.usage);
      const costUsd = account(task, cfg.model, raw);
      yield {
        final: {
          data: text as T,
          model: cfg.model,
          usage: { tokensIn: raw.inputTokens ?? 0, tokensOut: raw.outputTokens ?? 0, costUsd },
        },
      };
    },
  };
}
