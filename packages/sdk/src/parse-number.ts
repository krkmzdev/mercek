/**
 * Locale-aware number parser (spec §7.3) — the single highest-risk file in the
 * extract layer. A misread digit poisons the whole analysis, so this is unit
 * tested hard.
 *
 * Handles Turkish (`1.234,56`) and US (`1,234.56`) conventions, currency
 * symbols (`₺`, `TL`, `$`, `€`, `£`), percent signs, and negatives written
 * either with a minus or in accounting parentheses (`(1.234,56)`).
 *
 * When a single separator is genuinely ambiguous (e.g. `1,234` — TR decimal
 * `1.234` vs US thousands `1234`), a `locale` hint resolves it; with no hint the
 * result is marked `'ambiguous'` and the 3-digit group is treated as thousands.
 */

export type NumberLocale = 'tr' | 'us' | 'ambiguous' | 'unknown';

export interface ParsedNumber {
  /** Normalized numeric value, or `null` when the input is blank/unparseable. */
  value: number | null;
  /** The original input, stringified. */
  raw: string;
  /** Which convention was detected/assumed. */
  locale: NumberLocale;
  /** ISO-ish currency code if a symbol was found, else `null`. */
  currency: string | null;
  /** True if a `%` was present (value is NOT divided by 100 — caller decides). */
  isPercent: boolean;
}

export interface ParseNumberOptions {
  /** Disambiguates single-separator cases. Usually the vision-detected locale. */
  locale?: 'tr' | 'us';
}

const CURRENCY_MATCHERS: ReadonlyArray<{ re: RegExp; code: string }> = [
  { re: /₺/g, code: 'TRY' },
  { re: /\bTL\b/gi, code: 'TRY' },
  { re: /\$/g, code: 'USD' },
  { re: /€/g, code: 'EUR' },
  { re: /£/g, code: 'GBP' },
];

function empty(raw: string, locale: NumberLocale, currency: string | null, isPercent: boolean): ParsedNumber {
  return { value: null, raw, locale, currency, isPercent };
}

/** Resolve separators in a cleaned digits+`.`+`,` string to a JS-parseable form. */
function resolveSeparators(s: string, hint?: 'tr' | 'us'): { norm: string; locale: NumberLocale } {
  const hasDot = s.includes('.');
  const hasComma = s.includes(',');

  if (hasDot && hasComma) {
    // The last-occurring separator is the decimal point.
    const decimalIsComma = s.lastIndexOf(',') > s.lastIndexOf('.');
    return decimalIsComma
      ? { norm: s.replace(/\./g, '').replace(',', '.'), locale: 'tr' }
      : { norm: s.replace(/,/g, ''), locale: 'us' };
  }

  if (!hasDot && !hasComma) {
    return { norm: s, locale: 'unknown' };
  }

  const sep = hasComma ? ',' : '.';
  const parts = s.split(sep);
  const occurrences = parts.length - 1;

  // Repeated separator ⇒ unambiguously a thousands grouping.
  if (occurrences > 1) {
    return { norm: parts.join(''), locale: sep === '.' ? 'tr' : 'us' };
  }

  const before = parts[0] ?? '';
  const after = parts[1] ?? '';
  const decimalLocale: NumberLocale = sep === ',' ? 'tr' : 'us';

  // Ambiguous: exactly 3 trailing digits with a plausible leading group.
  if (after.length === 3 && before.length >= 1 && before.length <= 3) {
    if (hint === 'tr') {
      return sep === ','
        ? { norm: `${before}.${after}`, locale: 'tr' }
        : { norm: before + after, locale: 'tr' };
    }
    if (hint === 'us') {
      return sep === '.'
        ? { norm: `${before}.${after}`, locale: 'us' }
        : { norm: before + after, locale: 'us' };
    }
    return { norm: before + after, locale: 'ambiguous' };
  }

  // Otherwise the separator is a decimal point.
  return { norm: `${before}.${after}`, locale: decimalLocale };
}

/** Parse a messy cell value into a typed number with provenance about locale. */
export function parseLocaleNumber(
  input: string | number | null | undefined,
  opts: ParseNumberOptions = {},
): ParsedNumber {
  if (input === null || input === undefined) return empty(String(input ?? ''), 'unknown', null, false);
  const raw = String(input);
  if (typeof input === 'number') {
    return { value: Number.isFinite(input) ? input : null, raw, locale: 'unknown', currency: null, isPercent: false };
  }

  let s = input.trim();
  if (s === '') return empty(raw, 'unknown', null, false);

  // Currency symbols.
  let currency: string | null = null;
  for (const m of CURRENCY_MATCHERS) {
    const stripped = s.replace(m.re, '');
    if (stripped !== s) {
      currency = m.code;
      s = stripped;
    }
  }

  // Percent.
  let isPercent = false;
  if (s.includes('%')) {
    isPercent = true;
    s = s.replace(/%/g, '');
  }

  // Negatives: accounting parentheses, or a leading/trailing minus.
  let negative = false;
  s = s.trim();
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  s = s.trim();
  if (s.startsWith('-')) {
    negative = true;
    s = s.slice(1);
  } else if (s.endsWith('-')) {
    negative = true;
    s = s.slice(0, -1);
  }

  // Strip all whitespace (JS \s also covers NBSP/narrow-NBSP grouping spaces).
  s = s.replace(/\s/g, '');
  if (s === '') return empty(raw, 'unknown', currency, isPercent);

  // At this point only digits and separators are allowed.
  if (!/^[0-9.,]+$/.test(s)) return empty(raw, 'unknown', currency, isPercent);

  const { norm, locale } = resolveSeparators(s, opts.locale);
  const parsed = Number(norm);
  if (!Number.isFinite(parsed)) return empty(raw, 'unknown', currency, isPercent);

  return { value: negative ? -parsed : parsed, raw, locale, currency, isPercent };
}
