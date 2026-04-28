import type { HttpClient, HttpRequest, HttpResponse } from '../../src/http.js';

export interface RecordedCall {
  method: string;
  path: string;
  query?: Record<string, unknown> | undefined;
  body?: unknown;
}

export interface MockResponse {
  status?: number;
  body?: unknown;
  headers?: Record<string, string>;
  /** Throw this error instead of returning. */
  error?: unknown;
}

/**
 * Sequenced fake HttpClient. Push expected responses (or errors) onto
 * `responses`; each `request()` consumes the next one and records the call.
 */
export class MockHttpClient implements HttpClient {
  readonly calls: RecordedCall[] = [];
  readonly responses: MockResponse[] = [];

  push(response: MockResponse): this {
    this.responses.push(response);
    return this;
  }

  pushMany(responses: MockResponse[]): this {
    this.responses.push(...responses);
    return this;
  }

  async request<T = unknown>(req: HttpRequest): Promise<HttpResponse<T>> {
    this.calls.push({
      method: req.method,
      path: req.path,
      ...(req.query !== undefined ? { query: req.query } : {}),
      ...(req.body !== undefined ? { body: req.body } : {}),
    });
    const next = this.responses.shift();
    if (!next) {
      throw new Error(`MockHttpClient: no response queued for ${req.method} ${req.path}`);
    }
    if (next.error) throw next.error;
    return {
      status: next.status ?? 200,
      body: (next.body ?? null) as T,
      headers: new Headers(next.headers ?? {}),
    };
  }
}
