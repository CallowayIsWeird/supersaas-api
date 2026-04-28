/**
 * Async-mutex rate limiter. The upstream client's "throttle" was a footgun:
 * it updated `lastRequestTime` *after* the wait, so concurrent callers all
 * passed the gate together. This implementation properly serializes through
 * a promise chain.
 *
 * @module
 */

import { defaultSleep } from './retry.js';

/**
 * Configuration for {@link RateLimiter}.
 *
 * @category HTTP
 */
export interface RateLimiterConfig {
  /** Minimum interval between requests, in milliseconds. */
  minIntervalMs: number;
  /** Optional sleep function for testing. */
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
  /** Optional clock for testing. */
  now?: () => number;
}

/**
 * Token-style rate limiter that serializes calls through a promise chain.
 * Each call waits for the previous to release before being scheduled, and
 * additionally waits until at least `minIntervalMs` has elapsed since the
 * previous call started.
 *
 * @category HTTP
 */
export class RateLimiter {
  private readonly minIntervalMs: number;
  private readonly sleep: (ms: number, signal?: AbortSignal) => Promise<void>;
  private readonly now: () => number;
  private chain: Promise<void> = Promise.resolve();
  private lastStart = 0;

  constructor(config: RateLimiterConfig) {
    this.minIntervalMs = config.minIntervalMs;
    this.sleep = config.sleep ?? defaultSleep;
    this.now = config.now ?? Date.now;
  }

  /**
   * Acquire a slot. Resolves when it's safe to proceed.
   */
  async acquire(signal?: AbortSignal): Promise<void> {
    const previous = this.chain;
    let release!: () => void;
    this.chain = new Promise<void>((resolve) => {
      release = resolve;
    });

    try {
      await previous;
      const now = this.now();
      const wait = Math.max(0, this.lastStart + this.minIntervalMs - now);
      if (wait > 0) {
        await this.sleep(wait, signal);
      }
      this.lastStart = this.now();
    } finally {
      release();
    }
  }
}
