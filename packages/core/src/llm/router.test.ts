import { MockLanguageModelV4 } from 'ai/test';
import type { LanguageModel } from 'ai';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createLlmRouter, type UsageRecord } from './router';

type MockConfig = ConstructorParameters<typeof MockLanguageModelV4>[0];

function mockModel(text: string): LanguageModel {
  const config = {
    doGenerate: () =>
      Promise.resolve({
        finishReason: 'stop',
        usage: { inputTokens: 100, outputTokens: 20, totalTokens: 120 },
        content: [{ type: 'text', text }],
        warnings: [],
      }),
  } as unknown as MockConfig;
  return new MockLanguageModelV4(config);
}

function textModel(text: string): LanguageModel {
  return mockModel(text);
}

function jsonModel(obj: unknown): LanguageModel {
  return mockModel(JSON.stringify(obj));
}

describe('createLlmRouter (mock model, no live key)', () => {
  it('routes a task to its configured model and returns text', async () => {
    const seen: string[] = [];
    const records: UsageRecord[] = [];
    const router = createLlmRouter({
      resolveModel: (modelId) => {
        seen.push(modelId);
        return textModel('analiz sonucu');
      },
      onUsage: (r) => records.push(r),
    });

    const result = await router.complete('analyze', { prompt: 'veriyi analiz et' });

    expect(result.data).toBe('analiz sonucu');
    expect(seen).toEqual(['gemini-3-flash']); // analyze → gemini-3-flash (config)
    expect(records[0]?.task).toBe('analyze');
    expect(records[0]?.model).toBe('gemini-3-flash');
  });

  it('returns a validated structured object when given a schema', async () => {
    const schema = z.object({ headline: z.string(), score: z.number() });
    const router = createLlmRouter({
      resolveModel: () => jsonModel({ headline: 'ok', score: 42 }),
    });

    const result = await router.complete('analyze', { prompt: 'x', schema });
    expect(result.data).toEqual({ headline: 'ok', score: 42 });
  });

  it('escalates by routing analyze-deep to the Pro model', async () => {
    const seen: string[] = [];
    const router = createLlmRouter({
      resolveModel: (modelId) => {
        seen.push(modelId);
        return textModel('derin analiz');
      },
    });
    await router.complete('analyze-deep', { prompt: 'x' });
    expect(seen).toEqual(['gemini-3.1-pro']);
  });
});
