/**
 * Exponential backoff with full jitter. Used by the HTTP layer to retry
 * idempotent requests on transient failures (5xx, network errors, 429).
 *
 * @module
 */

import { NetworkError, RateLimitError, ServerError, SuperSaasError, TimeoutError } from './errors.js';

/**
 * Configuration for {@link retry}.
 *
 * @category HTTP
 */
export interface RetryConfig {
  /** Maximum number of retry attempts. Defaults to 3. */
  maxRetries?: number;
  /** Initial backoff in milliseconds. Defaults to 200. */
  baseDelayMs?: number;
  /** Maximum backoff in milliseconds. Defaults to 30000. */
  maxDelayMs?: number;
  /** Optional sleep function for testing. */
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
  /** Optional abort signal. */
  signal?: AbortSignal;
}

const DEFAULT_BASE_DELAY = 200;
const DEFAULT_MAX_DELAY = 30_000;
const DEFAULT_MAX_RETRIES = 3;

/**
 * Returns whether an error is worth retrying.
 *
 * @internal
 */
export function isRetryableError(err: unknown): boolean {
  if (err instanceof RateLimitError) return true;
  if (err instanceof ServerError) return true;
  if (err instanceof NetworkError) return true;
  if (err instanceof TimeoutError) return true;
  return false;
}

/**
 * Computes the delay for attempt `n` (0-indexed) using exponential
 * backoff with full jitter.
 *
 * @internal
 */
export function backoffDelay(
  attempt: number,
  baseDelayMs = DEFAULT_BASE_DELAY,
  maxDelayMs = DEFAULT_MAX_DELAY,
  random: () => number = Math.random,
): number {
  const exponential = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
  return Math.floor(random() * exponential);
}

/**
 * Default sleep that respects an abort signal.
 *
 * @internal
 */
export function defaultSleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new SuperSaasError('Aborted', { cause: signal.reason }));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = (): void => {
      clearTimeout(timer);
      reject(new SuperSaasError('Aborted', { cause: signal?.reason }));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * Executes `fn`, retrying on retryable errors with exponential backoff.
 *
 * If the error is a {@link RateLimitError} with a `retryAfterMs`, that
 * value takes precedence over the computed backoff for the next attempt.
 *
 * @category HTTP
 */
export async function retry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {},
): Promise<T> {
  const maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
  const baseDelayMs = config.baseDelayMs ?? DEFAULT_BASE_DELAY;
  const maxDelayMs = config.maxDelayMs ?? DEFAULT_MAX_DELAY;
  const sleep = config.sleep ?? defaultSleep;

  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!isRetryableError(err) || attempt === maxRetries) {
        throw err;
      }
      let delay = backoffDelay(attempt, baseDelayMs, maxDelayMs);
      if (err instanceof RateLimitError && err.retryAfterMs > 0) {
        delay = Math.min(maxDelayMs, err.retryAfterMs);
      }
      await sleep(delay, config.signal);
    }
  }
  throw lastError;
}
