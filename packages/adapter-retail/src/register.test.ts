import { describe, expect, it } from 'vitest';
import { clearAdapters, getAdapter, registerAdapter } from '@mercek/core';
import { retailAdapter } from './index';

describe('registry integration (§8.5)', () => {
  it('registers with a single line and resolves by sector id', () => {
    clearAdapters();
    registerAdapter(retailAdapter);
    expect(getAdapter('RETAIL')).toBe(retailAdapter);
    clearAdapters();
  });

  it('exposes 11 KPIs, each with a bilingual formula', () => {
    expect(retailAdapter.kpis).toHaveLength(11);
    for (const k of retailAdapter.kpis) {
      expect(k.formula.tr).toBeTruthy();
      expect(k.formula.en).toBeTruthy();
    }
  });
});
