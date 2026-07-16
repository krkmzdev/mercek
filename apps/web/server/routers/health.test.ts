import { describe, expect, it } from 'vitest';
import { createCaller } from '../root';

const caller = createCaller({ headers: new Headers() });

describe('health router', () => {
  it('ping round-trips typed', async () => {
    const res = await caller.health.ping();
    expect(res.ok).toBe(true);
    expect(res.service).toBe('mercek-web');
    expect(res.time).toBeInstanceOf(Date);
  });

  it('echo reflects input with computed length', async () => {
    const res = await caller.health.echo({ message: 'mercek' });
    expect(res.message).toBe('mercek');
    expect(res.length).toBe(6);
  });
});
