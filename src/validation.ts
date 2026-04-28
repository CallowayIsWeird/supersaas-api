/**
 * Input validation utilities. Stricter than the upstream equivalents and
 * timezone-aware for datetime formatting.
 *
 * @module
 */

import { ValidationError } from './errors.js';
import type { DateTimeInput } from './types/common.js';

const INTEGER_REGEX = /^\d+$/;
/** Strict `YYYY-MM-DD HH:MM:SS` — requires zero-padding. */
const DATETIME_REGEX = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
const PROMOTION_REGEX = /^[0-9a-zA-Z]+$/;

/**
 * Validates and normalizes an integer ID.
 *
 * @internal
 */
export function validateId(value: unknown, name = 'id'): number {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
    return value;
  }
  if (typeof value === 'string' && INTEGER_REGEX.test(value)) {
    return Number.parseInt(value, 10);
  }
  throw new ValidationError(
    `Invalid ${name} parameter: ${String(value)}. Provide a non-negative integer.`,
  );
}

/**
 * Validates a positive integer (e.g. limits, offsets).
 *
 * @internal
 */
export function validateNumber(value: unknown, name = 'value'): number {
  return validateId(value, name);
}

/**
 * Validates a user identifier — accepts numeric ID or string username.
 *
 * @internal
 */
export function validateUser(value: unknown): number | string {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
    return value;
  }
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  throw new ValidationError(`Invalid user parameter: ${String(value)}`);
}

/**
 * Validates a promotion code (alphanumeric, non-empty).
 *
 * @internal
 */
export function validatePromotion(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0 || !PROMOTION_REGEX.test(value)) {
    throw new ValidationError(
      'Invalid promotion code: must be a non-empty alphanumeric string.',
    );
  }
  return value;
}

/**
 * Validates that a value is one of an allowed set.
 *
 * @internal
 */
export function validateOption<T extends string | number>(value: unknown, options: readonly T[]): T {
  if (options.includes(value as T)) {
    return value as T;
  }
  throw new ValidationError(
    `Invalid option: ${String(value)}. Must be one of: ${options.join(', ')}.`,
  );
}

/**
 * Validates that a string is non-empty.
 *
 * @internal
 */
export function validatePresent(value: unknown, name = 'parameter'): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new ValidationError(`Required ${name} is missing or empty.`);
  }
  return value;
}

/**
 * Formats a {@link DateTimeInput} as a SuperSaaS-compatible
 * `YYYY-MM-DD HH:MM:SS` string.
 *
 * - If `value` is a string already in that format, returns it unchanged.
 * - If `value` is a `Date`, formats it in the supplied `timezone` (defaulting
 *   to `UTC`).
 *
 * The previous upstream implementation used the local-machine timezone via
 * `Date.prototype.getMonth()` etc., which silently produces wrong wall-clock
 * times whenever the consumer's machine timezone differs from the schedule's
 * configured timezone. This implementation is explicit and deterministic.
 *
 * @internal
 */
export function formatDateTime(value: DateTimeInput, timezone = 'UTC'): string {
  if (typeof value === 'string') {
    if (DATETIME_REGEX.test(value)) return value;
    throw new ValidationError(
      `Invalid datetime string: ${value}. Use 'YYYY-MM-DD HH:MM:SS' (zero-padded).`,
    );
  }
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new ValidationError('Invalid datetime: provide a Date or formatted string.');
  }
  return formatInTimezone(value, timezone);
}

function formatInTimezone(date: Date, timezone: string): string {
  // Intl.DateTimeFormat is the only stdlib-correct way to render a Date in a
  // specific IANA timezone without reaching for moment-timezone or similar.
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes): string => {
    const part = parts.find((p) => p.type === type);
    if (!part) {
      throw new ValidationError(`Could not format datetime in timezone "${timezone}".`);
    }
    return part.value;
  };

  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`;
}

/**
 * Removes keys whose values are `null` or `undefined`. Used before sending
 * params to SuperSaaS to avoid stringifying `"null"` or `"undefined"`.
 *
 * @internal
 */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined && value !== '') {
      (out as Record<string, unknown>)[key] = value;
    }
  }
  return out;
}
