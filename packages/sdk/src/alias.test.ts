import { describe, expect, it } from 'vitest';
import { levenshtein, matchHeader, matchHeaders, normalizeHeader, similarity } from './alias';

const aliases: Record<string, string[]> = {
  revenue: ['ciro', 'satış tutarı', 'net satış', 'tutar', 'sales', 'amount'],
  quantity: ['adet', 'miktar', 'satış adedi', 'qty', 'units'],
  cost: ['maliyet', 'birim maliyet', 'cogs', 'unit cost'],
};

describe('normalizeHeader', () => {
  it('lowercases and transliterates Turkish letters', () => {
    expect(normalizeHeader('Ürün Adı')).toBe('urun adi');
    expect(normalizeHeader('Satış Tutarı (₺)')).toBe('satis tutari');
  });
});

describe('levenshtein / similarity', () => {
  it('computes edit distance', () => {
    expect(levenshtein('ciro', 'ciro')).toBe(0);
    expect(levenshtein('ciro', 'cir')).toBe(1);
  });
  it('similarity is 1 for equal strings', () => {
    expect(similarity('adet', 'adet')).toBe(1);
  });
});

describe('matchHeader', () => {
  it('matches an exact canonical field name', () => {
    expect(matchHeader('revenue', aliases)).toEqual({
      canonicalField: 'revenue',
      method: 'exact',
      confidence: 1,
    });
  });

  it('matches a Turkish alias', () => {
    const m = matchHeader('Ciro', aliases);
    expect(m?.canonicalField).toBe('revenue');
    expect(m?.method).toBe('alias');
  });

  it('matches an alias ignoring currency punctuation', () => {
    const m = matchHeader('Satış Tutarı', aliases);
    expect(m?.canonicalField).toBe('revenue');
  });

  it('fuzzy-matches a near miss (typo)', () => {
    const m = matchHeader('Maliyeti', aliases); // one edit from "maliyet"
    expect(m?.canonicalField).toBe('cost');
    expect(m?.method).toBe('fuzzy');
  });

  it('returns null when nothing is close', () => {
    expect(matchHeader('tamamen alakasız', aliases)).toBeNull();
  });
});

describe('matchHeaders', () => {
  it('splits matched from unmapped headers', () => {
    const { matches, unmapped } = matchHeaders(['Ciro', 'Adet', 'Notlar'], aliases);
    expect(matches.get('Ciro')?.canonicalField).toBe('revenue');
    expect(matches.get('Adet')?.canonicalField).toBe('quantity');
    expect(unmapped).toEqual(['Notlar']);
  });
});
