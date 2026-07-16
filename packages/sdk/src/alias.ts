import type { MappingMethod } from './adapter';

/**
 * Deterministic header→field matching helpers (spec §10). Adapters run this
 * first (exact → alias → fuzzy) and only fall back to the LLM for leftovers —
 * cheaper, faster, and more impressive to explain.
 */

const TR_MAP: Record<string, string> = {
  ş: 's',
  ı: 'i',
  ğ: 'g',
  ü: 'u',
  ö: 'o',
  ç: 'c',
  â: 'a',
  î: 'i',
  û: 'u',
};

/** Lowercase, transliterate Turkish letters, strip punctuation, collapse space. */
export function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .replace(/[şığüöçâîû]/g, (c) => TR_MAP[c] ?? c)
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Levenshtein edit distance (iterative, O(m·n) space O(n)). */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1]! + 1, prev[j]! + 1, prev[j - 1]! + cost);
    }
    prev = curr;
  }
  return prev[b.length]!;
}

/** Similarity in [0,1] derived from edit distance. */
export function similarity(a: string, b: string): number {
  const max = Math.max(a.length, b.length);
  return max === 0 ? 1 : 1 - levenshtein(a, b) / max;
}

export interface AliasMatch {
  canonicalField: string;
  method: Extract<MappingMethod, 'exact' | 'alias' | 'fuzzy'>;
  confidence: number;
}

export interface MatchOptions {
  /** Minimum fuzzy similarity to accept a match. Default 0.82. */
  fuzzyThreshold?: number;
}

/**
 * Match one header to a canonical field using an alias dictionary
 * (`{ canonicalField: [aliases...] }`). Returns the best match or `null`.
 */
export function matchHeader(
  header: string,
  aliases: Record<string, string[]>,
  opts: MatchOptions = {},
): AliasMatch | null {
  const threshold = opts.fuzzyThreshold ?? 0.82;
  const norm = normalizeHeader(header);
  if (norm === '') return null;

  let best: AliasMatch | null = null;
  for (const [field, terms] of Object.entries(aliases)) {
    const candidates = [field, ...terms].map(normalizeHeader);
    for (const cand of candidates) {
      if (cand === norm) {
        // Exact against the field name beats an alias hit.
        const method = normalizeHeader(field) === norm ? 'exact' : 'alias';
        return { canonicalField: field, method, confidence: method === 'exact' ? 1 : 0.95 };
      }
      const score = similarity(norm, cand);
      if (score >= threshold && (!best || score > best.confidence)) {
        best = { canonicalField: field, method: 'fuzzy', confidence: score };
      }
    }
  }
  return best;
}

export interface HeaderMatchResult {
  /** header → match. Only headers that matched appear. */
  matches: Map<string, AliasMatch>;
  unmapped: string[];
}

/** Match a whole header row, keeping unmatched headers for the LLM/manual pass. */
export function matchHeaders(
  headers: string[],
  aliases: Record<string, string[]>,
  opts: MatchOptions = {},
): HeaderMatchResult {
  const matches = new Map<string, AliasMatch>();
  const unmapped: string[] = [];
  for (const header of headers) {
    const match = matchHeader(header, aliases, opts);
    if (match) matches.set(header, match);
    else unmapped.push(header);
  }
  return { matches, unmapped };
}
