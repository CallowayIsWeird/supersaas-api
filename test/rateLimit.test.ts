import { describe, expect, it, vi } from 'vitest';
import { RateLimiter } from '../src/rateLimit.js';

describe('RateLimiter', () => {
  it('allows the first call immediately', async () => {
    const sleep = vi.fn(async () => undefined);
    const rl = new RateLimiter({ minIntervalMs: 1000, sleep, now: () => 1000 });
    await rl.acquire();
    expect(sleep).not.toHaveBeenCalled();
  });

  it('enforces a minimum gap between subsequent calls', async () => {
    const sleep = vi.fn(async () => undefined);
    let clock = 1000;
    const rl = new RateLimiter({ minIntervalMs: 1000, sleep, now: () => clock });
    await rl.acquire();
    clock = 1200; // 200ms later
    await rl.acquire();
    expect(sleep).toHaveBeenCalledWith(800, undefined);
  });

  it('serializes concurrent calls in arrival order', async () => {
    const calls: number[] = [];
    let clock = 0;
    const rl = new RateLimiter({
      minIntervalMs: 100,
      sleep: async (ms) => {
        clock += ms;
      },
      now: () => clock,
    });
    const ops = [1, 2, 3].map(async (id) => {
      await rl.acquire();
      calls.push(id);
    });
    await Promise.all(ops);
    expect(calls).toEqual([1, 2, 3]);
  });

  it('does not sleep when interval has already elapsed', async () => {
    const sleep = vi.fn(async () => undefined);
    let clock = 1000;
    const rl = new RateLimiter({ minIntervalMs: 500, sleep, now: () => clock });
    await rl.acquire();
    clock = 2000; // 1000ms later, interval already elapsed
    await rl.acquire();
    expect(sleep).not.toHaveBeenCalled();
  });
});
