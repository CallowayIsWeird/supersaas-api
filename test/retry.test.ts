import { describe, expect, it, vi } from 'vitest';
import { backoffDelay, isRetryableError, retry } from '../src/retry.js';
import {
  AuthError,
  NetworkError,
  RateLimitError,
  ServerError,
  TimeoutError,
  ValidationError,
} from '../src/errors.js';

describe('isRetryableError', () => {
  it('returns true for transient errors', () => {
    expect(isRetryableError(new RateLimitError())).toBe(true);
    expect(isRetryableError(new ServerError())).toBe(true);
    expect(isRetryableError(new NetworkError())).toBe(true);
    expect(isRetryableError(new TimeoutError())).toBe(true);
  });

  it('returns false for non-retryable', () => {
    expect(isRetryableError(new ValidationError())).toBe(false);
    expect(isRetryableError(new AuthError())).toBe(false);
    expect(isRetryableError(new Error('plain'))).toBe(false);
  });
});

describe('backoffDelay', () => {
  it('grows exponentially with attempt', () => {
    expect(backoffDelay(0, 100, 10_000, () => 1)).toBeLessThan(101);
    expect(backoffDelay(3, 100, 10_000, () => 1)).toBeLessThanOrEqual(800);
  });

  it('caps at maxDelayMs', () => {
    expect(backoffDelay(20, 100, 5_000, () => 1)).toBeLessThanOrEqual(5_000);
  });

  it('applies jitter via random()', () => {
    expect(backoffDelay(2, 100, 10_000, () => 0)).toBe(0);
  });
});

describe('retry', () => {
  it('returns the result on first success', async () => {
    const fn = vi.fn(async () => 'ok');
    expect(await retry(fn)).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on retryable error and succeeds', async () => {
    let calls = 0;
    const fn = async (): Promise<string> => {
      calls += 1;
      if (calls < 3) throw new ServerError();
      return 'ok';
    };
    const sleep = vi.fn(async () => undefined);
    const result = await retry(fn, { sleep, maxRetries: 5 });
    expect(result).toBe('ok');
    expect(calls).toBe(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it('does not retry on non-retryable error', async () => {
    const fn = vi.fn(async () => {
      throw new ValidationError();
    });
    await expect(retry(fn, { sleep: async () => undefined })).rejects.toBeInstanceOf(
      ValidationError,
    );
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('throws after maxRetries', async () => {
    const fn = vi.fn(async () => {
      throw new ServerError();
    });
    await expect(
      retry(fn, { sleep: async () => undefined, maxRetries: 2 }),
    ).rejects.toBeInstanceOf(ServerError);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('honors RateLimitError.retryAfterMs over computed backoff', async () => {
    let calls = 0;
    const sleep = vi.fn(async () => undefined);
    const fn = async (): Promise<string> => {
      calls += 1;
      if (calls === 1) throw new RateLimitError('rate limited', { retryAfterMs: 12_345 });
      return 'ok';
    };
    await retry(fn, { sleep, maxRetries: 3, maxDelayMs: 60_000 });
    expect(sleep).toHaveBeenCalledWith(12_345, undefined);
  });
});
