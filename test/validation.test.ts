import { describe, expect, it } from 'vitest';
import {
  compact,
  formatDateTime,
  validateId,
  validateNumber,
  validateOption,
  validatePresent,
  validatePromotion,
  validateUser,
} from '../src/validation.js';
import { ValidationError } from '../src/errors.js';

describe('validateId', () => {
  it('accepts non-negative integers', () => {
    expect(validateId(0)).toBe(0);
    expect(validateId(42)).toBe(42);
  });

  it('parses numeric strings', () => {
    expect(validateId('123')).toBe(123);
  });

  it('rejects negatives, decimals, NaN, non-strings', () => {
    expect(() => validateId(-1)).toThrow(ValidationError);
    expect(() => validateId(1.5)).toThrow(ValidationError);
    expect(() => validateId('abc')).toThrow(ValidationError);
    expect(() => validateId(null)).toThrow(ValidationError);
    expect(() => validateId(undefined)).toThrow(ValidationError);
    expect(() => validateId('-1')).toThrow(ValidationError);
  });
});

describe('validateNumber', () => {
  it('delegates to validateId', () => {
    expect(validateNumber(7)).toBe(7);
    expect(() => validateNumber(-1)).toThrow(ValidationError);
  });
});

describe('validateUser', () => {
  it('accepts integer and non-empty string', () => {
    expect(validateUser(5)).toBe(5);
    expect(validateUser('alice')).toBe('alice');
  });

  it('rejects empty string and other types', () => {
    expect(() => validateUser('')).toThrow(ValidationError);
    expect(() => validateUser(null)).toThrow(ValidationError);
    expect(() => validateUser(-1)).toThrow(ValidationError);
  });
});

describe('validatePromotion', () => {
  it('accepts alphanumeric strings', () => {
    expect(validatePromotion('SAVE10')).toBe('SAVE10');
  });

  it('rejects empty and non-alphanumeric', () => {
    expect(() => validatePromotion('')).toThrow(ValidationError);
    expect(() => validatePromotion('save-10')).toThrow(ValidationError);
    expect(() => validatePromotion(123)).toThrow(ValidationError);
  });
});

describe('validateOption', () => {
  it('returns the value when in the list', () => {
    expect(validateOption('a', ['a', 'b'] as const)).toBe('a');
  });

  it('throws when not in the list', () => {
    expect(() => validateOption('c', ['a', 'b'] as const)).toThrow(ValidationError);
  });
});

describe('validatePresent', () => {
  it('returns non-empty strings', () => {
    expect(validatePresent('hello')).toBe('hello');
  });

  it('throws on empty / non-string', () => {
    expect(() => validatePresent('')).toThrow(ValidationError);
    expect(() => validatePresent(undefined)).toThrow(ValidationError);
    expect(() => validatePresent(123)).toThrow(ValidationError);
  });
});

describe('formatDateTime', () => {
  it('passes through valid YYYY-MM-DD HH:MM:SS strings', () => {
    expect(formatDateTime('2026-04-28 09:30:00')).toBe('2026-04-28 09:30:00');
  });

  it('rejects single-digit datetime strings', () => {
    expect(() => formatDateTime('2026-4-28 9:30:00')).toThrow(ValidationError);
  });

  it('rejects garbage strings', () => {
    expect(() => formatDateTime('tomorrow')).toThrow(ValidationError);
  });

  it('formats Date in UTC by default', () => {
    const d = new Date('2026-04-28T16:30:00Z');
    expect(formatDateTime(d)).toBe('2026-04-28 16:30:00');
  });

  it('formats Date in a specific IANA timezone', () => {
    const d = new Date('2026-04-28T16:30:00Z');
    // Phoenix is UTC-7 (no DST).
    expect(formatDateTime(d, 'America/Phoenix')).toBe('2026-04-28 09:30:00');
  });

  it('rejects invalid Date', () => {
    expect(() => formatDateTime(new Date('nope'))).toThrow(ValidationError);
  });
});

describe('compact', () => {
  it('drops null, undefined, empty strings', () => {
    expect(compact({ a: 1, b: null, c: undefined, d: '', e: 'x' })).toEqual({ a: 1, e: 'x' });
  });

  it('preserves false and 0', () => {
    expect(compact({ a: false, b: 0 })).toEqual({ a: false, b: 0 });
  });
});
