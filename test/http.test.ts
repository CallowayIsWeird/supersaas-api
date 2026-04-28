import { describe, expect, it, vi } from 'vitest';
import { FetchHttpClient } from '../src/http.js';
import {
  AuthError,
  NotFoundError,
  RateLimitError,
  ServerError,
  TimeoutError,
  ValidationError,
} from '../src/errors.js';

function makeFetch(handler: (req: Request) => Response | Promise<Response>): typeof fetch {
  return (async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    const req = input instanceof Request ? input : new Request(input as string, init);
    return handler(req);
  }) as typeof fetch;
}

function client(fetchImpl: typeof fetch, overrides: Partial<ConstructorParameters<typeof FetchHttpClient>[0]> = {}): FetchHttpClient {
  return new FetchHttpClient({
    host: 'https://api.test',
    accountName: 'acct',
    apiKey: 'key',
    userAgent: 'test/1.0',
    timeoutMs: 1_000,
    retry: { maxRetries: 0 },
    fetchImpl,
    ...overrides,
  });
}

describe('FetchHttpClient', () => {
  it('builds the URL with /api prefix and .json suffix', async () => {
    const seen: string[] = [];
    const c = client(
      makeFetch((req) => {
        seen.push(req.url);
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }),
    );
    await c.request({ method: 'GET', path: '/schedules' });
    expect(seen[0]).toBe('https://api.test/api/schedules.json');
  });

  it('attaches Basic auth header', async () => {
    let seenAuth: string | null = null;
    const c = client(
      makeFetch((req) => {
        seenAuth = req.headers.get('authorization');
        return new Response('null', {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }),
    );
    await c.request({ method: 'GET', path: '/users' });
    expect(seenAuth).toMatch(/^Basic /);
    const decoded = Buffer.from((seenAuth as string).replace('Basic ', ''), 'base64').toString();
    expect(decoded).toBe('acct:key');
  });

  it('serializes query parameters and skips null/undefined/empty', async () => {
    let seenUrl = '';
    const c = client(
      makeFetch((req) => {
        seenUrl = req.url;
        return new Response('[]', {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }),
    );
    await c.request({
      method: 'GET',
      path: '/bookings',
      query: { schedule_id: 42, slot: true, empty: '', missing: null, undef: undefined },
    });
    expect(seenUrl).toContain('schedule_id=42');
    expect(seenUrl).toContain('slot=true');
    expect(seenUrl).not.toContain('empty=');
    expect(seenUrl).not.toContain('missing=');
    expect(seenUrl).not.toContain('undef=');
  });

  it('parses JSON bodies', async () => {
    const c = client(
      makeFetch(() =>
        new Response(JSON.stringify({ id: 1, name: 'x' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );
    const res = await c.request<{ id: number; name: string }>({ method: 'GET', path: '/users/1' });
    expect(res.body).toEqual({ id: 1, name: 'x' });
  });

  it('returns Location header on POST 201', async () => {
    const c = client(
      makeFetch(
        () =>
          new Response('', {
            status: 201,
            headers: { location: '/api/users/99.json' },
          }),
      ),
    );
    const res = await c.request<string>({ method: 'POST', path: '/users', body: {} });
    expect(res.body).toBe('/api/users/99.json');
  });

  it('maps 401 to AuthError', async () => {
    const c = client(
      makeFetch(
        () =>
          new Response(JSON.stringify({ message: 'bad key' }), {
            status: 401,
            headers: { 'content-type': 'application/json' },
          }),
      ),
    );
    await expect(c.request({ method: 'GET', path: '/users' })).rejects.toBeInstanceOf(AuthError);
  });

  it('maps 404 to NotFoundError', async () => {
    const c = client(
      makeFetch(
        () =>
          new Response('{}', {
            status: 404,
            headers: { 'content-type': 'application/json' },
          }),
      ),
    );
    await expect(c.request({ method: 'GET', path: '/users/9999' })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('maps 422 to ValidationError with field errors', async () => {
    const c = client(
      makeFetch(
        () =>
          new Response(
            JSON.stringify({
              errors: { email: ['is invalid'], name: ['too short'] },
            }),
            {
              status: 422,
              headers: { 'content-type': 'application/json' },
            },
          ),
      ),
    );
    try {
      await c.request({ method: 'POST', path: '/users', body: {} });
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      const ve = err as ValidationError;
      expect(ve.fieldErrors).toEqual({ email: ['is invalid'], name: ['too short'] });
    }
  });

  it('maps 429 to RateLimitError with retryAfterMs', async () => {
    const c = client(
      makeFetch(
        () =>
          new Response('{}', {
            status: 429,
            headers: { 'content-type': 'application/json', 'retry-after': '5' },
          }),
      ),
    );
    try {
      await c.request({ method: 'GET', path: '/users' });
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(RateLimitError);
      expect((err as RateLimitError).retryAfterMs).toBe(5000);
    }
  });

  it('retries idempotent GET on 5xx', async () => {
    let calls = 0;
    const c = client(
      makeFetch(() => {
        calls += 1;
        if (calls < 2) {
          return new Response('{}', {
            status: 503,
            headers: { 'content-type': 'application/json' },
          });
        }
        return new Response('[]', {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }),
      { retry: { maxRetries: 2, baseDelayMs: 1, maxDelayMs: 1, sleep: async () => undefined } },
    );
    const res = await c.request({ method: 'GET', path: '/users' });
    expect(res.status).toBe(200);
    expect(calls).toBe(2);
  });

  it('does not retry non-idempotent POST without idempotency key', async () => {
    let calls = 0;
    const c = client(
      makeFetch(() => {
        calls += 1;
        return new Response('{}', {
          status: 503,
          headers: { 'content-type': 'application/json' },
        });
      }),
      { retry: { maxRetries: 5, baseDelayMs: 1, maxDelayMs: 1, sleep: async () => undefined } },
    );
    await expect(
      c.request({ method: 'POST', path: '/bookings', body: {} }),
    ).rejects.toBeInstanceOf(ServerError);
    expect(calls).toBe(1);
  });

  it('retries POST when an idempotency key is provided', async () => {
    let calls = 0;
    const c = client(
      makeFetch(() => {
        calls += 1;
        if (calls < 2) {
          return new Response('{}', {
            status: 503,
            headers: { 'content-type': 'application/json' },
          });
        }
        return new Response('{"id":1}', {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }),
      { retry: { maxRetries: 3, baseDelayMs: 1, maxDelayMs: 1, sleep: async () => undefined } },
    );
    await c.request({
      method: 'POST',
      path: '/bookings',
      body: {},
      options: { idempotencyKey: 'abc-123' },
    });
    expect(calls).toBe(2);
  });

  it('aborts requests that exceed timeout', async () => {
    // Read init.signal directly — Request constructor may proxy the signal
    // and we want to be sure we observe aborts on the exact instance.
    const fetchImpl = (async (_input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
      return new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal;
        if (!signal) {
          reject(new Error('no signal'));
          return;
        }
        const onAbort = (): void => {
          const err = new Error('aborted');
          err.name = 'AbortError';
          reject(err);
        };
        if (signal.aborted) onAbort();
        else signal.addEventListener('abort', onAbort, { once: true });
      });
    }) as typeof fetch;
    const c = client(fetchImpl, { timeoutMs: 5 });
    await expect(c.request({ method: 'GET', path: '/slow' })).rejects.toBeInstanceOf(TimeoutError);
  });

  it('sends Idempotency-Key header when set', async () => {
    let seen = '';
    const c = client(
      makeFetch((req) => {
        seen = req.headers.get('idempotency-key') ?? '';
        return new Response('{}', {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }),
    );
    await c.request({
      method: 'POST',
      path: '/bookings',
      body: {},
      options: { idempotencyKey: 'key-abc' },
    });
    expect(seen).toBe('key-abc');
  });

  it('uses the rate limiter when configured', async () => {
    const acquire = vi.fn(async () => undefined);
    const fakeLimiter = { acquire } as unknown as ConstructorParameters<typeof FetchHttpClient>[0]['rateLimiter'];
    const c = client(
      makeFetch(
        () =>
          new Response('[]', {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
      ),
      { rateLimiter: fakeLimiter },
    );
    await c.request({ method: 'GET', path: '/users' });
    expect(acquire).toHaveBeenCalledTimes(1);
  });
});
