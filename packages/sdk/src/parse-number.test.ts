import { describe, expect, it } from 'vitest';
import { parseLocaleNumber } from './parse-number';

describe('parseLocaleNumber — Turkish convention (1.234,56)', () => {
  it('parses TR thousands + decimal', () => {
    const r = parseLocaleNumber('1.234,56');
    expect(r.value).toBe(1234.56);
    expect(r.locale).toBe('tr');
  });

  it('parses TR multi-group thousands', () => {
    expect(parseLocaleNumber('1.234.567,89').value).toBe(1234567.89);
  });

  it('parses TR decimal with comma only', () => {
    const r = parseLocaleNumber('12,5');
    expect(r.value).toBe(12.5);
    expect(r.locale).toBe('tr');
  });

  it('parses TR decimal with 4 fraction digits', () => {
    expect(parseLocaleNumber('1,2345').value).toBe(1.2345);
  });

  it('treats repeated dots as TR thousands (integer)', () => {
    const r = parseLocaleNumber('1.234.567');
    expect(r.value).toBe(1234567);
    expect(r.locale).toBe('tr');
  });
});

describe('parseLocaleNumber — US convention (1,234.56)', () => {
  it('parses US thousands + decimal', () => {
    const r = parseLocaleNumber('1,234.56');
    expect(r.value).toBe(1234.56);
    expect(r.locale).toBe('us');
  });

  it('parses US multi-group thousands', () => {
    expect(parseLocaleNumber('12,345,678.90').value).toBe(12345678.9);
  });

  it('parses US decimal with dot only', () => {
    const r = parseLocaleNumber('12.5');
    expect(r.value).toBe(12.5);
    expect(r.locale).toBe('us');
  });

  it('treats repeated commas as US thousands (integer)', () => {
    const r = parseLocaleNumber('1,234,567');
    expect(r.value).toBe(1234567);
    expect(r.locale).toBe('us');
  });
});

describe('parseLocaleNumber — ambiguity + hints', () => {
  it('marks single 3-digit comma group ambiguous, defaults to thousands', () => {
    const r = parseLocaleNumber('1,234');
    expect(r.value).toBe(1234);
    expect(r.locale).toBe('ambiguous');
  });

  it('honors tr hint: 1,234 → 1.234 decimal', () => {
    const r = parseLocaleNumber('1,234', { locale: 'tr' });
    expect(r.value).toBe(1.234);
    expect(r.locale).toBe('tr');
  });

  it('honors tr hint: 1.234 → 1234 thousands', () => {
    const r = parseLocaleNumber('1.234', { locale: 'tr' });
    expect(r.value).toBe(1234);
    expect(r.locale).toBe('tr');
  });

  it('honors us hint: 1.234 → 1.234 decimal (dot is US decimal point)', () => {
    const r = parseLocaleNumber('1.234', { locale: 'us' });
    expect(r.value).toBe(1.234);
    expect(r.locale).toBe('us');
  });

  it('honors us hint: 1,234 → 1234 thousands', () => {
    expect(parseLocaleNumber('1,234', { locale: 'us' }).value).toBe(1234);
  });
});

describe('parseLocaleNumber — currency symbols', () => {
  it('strips ₺ and records TRY', () => {
    const r = parseLocaleNumber('₺1.234,56');
    expect(r.value).toBe(1234.56);
    expect(r.currency).toBe('TRY');
  });

  it('strips trailing TL word and records TRY', () => {
    const r = parseLocaleNumber('1.234,56 TL');
    expect(r.value).toBe(1234.56);
    expect(r.currency).toBe('TRY');
  });

  it('strips $ and records USD', () => {
    const r = parseLocaleNumber('$1,234.56');
    expect(r.value).toBe(1234.56);
    expect(r.currency).toBe('USD');
  });

  it('strips € and records EUR', () => {
    expect(parseLocaleNumber('€99,90').currency).toBe('EUR');
  });
});

describe('parseLocaleNumber — negatives', () => {
  it('parses a leading minus', () => {
    expect(parseLocaleNumber('-1,5').value).toBe(-1.5);
  });

  it('parses accounting parentheses as negative', () => {
    const r = parseLocaleNumber('(1.234,56)');
    expect(r.value).toBe(-1234.56);
  });

  it('parses parentheses with currency', () => {
    const r = parseLocaleNumber('(₺2.500,00)');
    expect(r.value).toBe(-2500);
    expect(r.currency).toBe('TRY');
  });

  it('parses a trailing minus (accounting)', () => {
    expect(parseLocaleNumber('1.234,56-').value).toBe(-1234.56);
  });
});

describe('parseLocaleNumber — percent', () => {
  it('flags percent and keeps the raw magnitude', () => {
    const r = parseLocaleNumber('34,2%');
    expect(r.value).toBe(34.2);
    expect(r.isPercent).toBe(true);
  });

  it('flags negative percent', () => {
    const r = parseLocaleNumber('-3,9%');
    expect(r.value).toBe(-3.9);
    expect(r.isPercent).toBe(true);
  });
});

describe('parseLocaleNumber — blanks + junk', () => {
  it('returns null for empty string', () => {
    expect(parseLocaleNumber('').value).toBeNull();
  });

  it('returns null for whitespace only', () => {
    expect(parseLocaleNumber('   ').value).toBeNull();
  });

  it('returns null for null/undefined', () => {
    expect(parseLocaleNumber(null).value).toBeNull();
    expect(parseLocaleNumber(undefined).value).toBeNull();
  });

  it('returns null for non-numeric junk', () => {
    const r = parseLocaleNumber('abc');
    expect(r.value).toBeNull();
    expect(r.locale).toBe('unknown');
  });

  it('returns null for a lone minus', () => {
    expect(parseLocaleNumber('-').value).toBeNull();
  });
});

describe('parseLocaleNumber — passthrough + spacing', () => {
  it('passes through a JS number unchanged', () => {
    const r = parseLocaleNumber(1234.56);
    expect(r.value).toBe(1234.56);
  });

  it('returns null for a non-finite number', () => {
    expect(parseLocaleNumber(Number.NaN).value).toBeNull();
  });

  it('strips space-grouped thousands', () => {
    expect(parseLocaleNumber('1 234 567,89').value).toBe(1234567.89);
  });

  it('parses a plain integer', () => {
    const r = parseLocaleNumber('42');
    expect(r.value).toBe(42);
    expect(r.locale).toBe('unknown');
  });
});
