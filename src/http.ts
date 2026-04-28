/**
 * HTTP layer. Provides a swappable {@link HttpClient} interface and a
 * default {@link FetchHttpClient} backed by the global `fetch` API.
 *
 * @module
 */

import { errorForStatus, NetworkError, SuperSaasError, TimeoutError } from './errors.js';
import type { Logger } from './logger.js';
import { noopLogger } from './logger.js';
import { RateLimiter } from './rateLimit.js';
import { retry, type RetryConfig } from './retry.js';
import type { RequestOptions } from './types/common.js';

/**
 * Supported HTTP methods.
 *
 * @category HTTP
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

/**
 * A request to be issued by an {@link HttpClient}.
 *
 * @category HTTP
 */
export interface HttpRequest {
  method: HttpMethod;
  path: string;
  query?: Record<string, unknown> | undefined;
  body?: unknown;
  headers?: Record<string, string>;
  options?: RequestOptions;
}

/**
 * The successful response shape returned by {@link HttpClient.request}.
 *
 * @category HTTP
 */
export interface HttpResponse<T = unknown> {
  status: number;
  body: T;
  headers: Headers;
}

/**
 * Pluggable HTTP transport. The SDK ships with {@link FetchHttpClient}; pass
 * a custom implementation to {@link SuperSaas} for testing, custom retry
 * policies, request signing, observability, etc.
 *
 * @category HTTP
 */
export interface HttpClient {
  request<T = unknown>(req: HttpRequest): Promise<HttpResponse<T>>;
}

/**
 * Configuration for {@link FetchHttpClient}.
 *
 * @category HTTP
 */
export interface FetchHttpClientConfig {
  host: string;
  accountName: string;
  apiKey: string;
  userAgent: string;
  /** Default request timeout in milliseconds. */
  timeoutMs: number;
  /** Default retry configuration. */
  retry: RetryConfig;
  /** Rate limiter shared across requests. */
  rateLimiter?: RateLimiter;
  logger?: Logger;
  /** Override fetch (for testing). */
  fetchImpl?: typeof fetch;
}

/**
 * Default `fetch`-based HTTP transport. Handles auth, query stringification,
 * timeouts via AbortSignal, retry with exponential backoff for idempotent
 * methods, rate limiting, and structured error mapping.
 *
 * @category HTTP
 */
export class FetchHttpClient implements HttpClient {
  private readonly host: string;
  private readonly authHeader: string;
  private readonly userAgent: string;
  private readonly timeoutMs: number;
  private readonly retryConfig: RetryConfig;
  private readonly rateLimiter: RateLimiter | undefined;
  private readonly logger: Logger;
  private readonly fetchImpl: typeof fetch;

  constructor(config: FetchHttpClientConfig) {
    this.host = config.host.replace(/\/$/, '');
    const credentials = `${config.accountName}:${config.apiKey}`;
    this.authHeader = `Basic ${Buffer.from(credentials).toString('base64')}`;
    this.userAgent = config.userAgent;
    this.timeoutMs = config.timeoutMs;
    this.retryConfig = config.retry;
    this.rateLimiter = config.rateLimiter;
    this.logger = config.logger ?? noopLogger;
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  async request<T = unknown>(req: HttpRequest): Promise<HttpResponse<T>> {
    const idempotent = req.method === 'GET' || req.method === 'PUT' || req.method === 'DELETE';
    const hasIdempotencyKey = Boolean(req.options?.idempotencyKey);
    const shouldRetry = idempotent || hasIdempotencyKey;

    const exec = async (): Promise<HttpResponse<T>> => {
      if (this.rateLimiter) {
        await this.rateLimiter.acquire(req.options?.signal);
      }
      return this.dispatch<T>(req);
    };

    if (!shouldRetry) {
      return exec();
    }
    return retry(exec, {
      ...this.retryConfig,
      ...(req.options?.maxRetries !== undefined ? { maxRetries: req.options.maxRetries } : {}),
      ...(req.options?.signal !== undefined ? { signal: req.options.signal } : {}),
    });
  }

  private async dispatch<T>(req: HttpRequest): Promise<HttpResponse<T>> {
    const url = this.buildUrl(req.path, req.query);
    const timeoutMs = req.options?.timeout ?? this.timeoutMs;
    const controller = new AbortController();
    const externalSignal = req.options?.signal;
    const timeoutHandle = timeoutMs > 0 ? setTimeout(() => controller.abort(timeoutReason()), timeoutMs) : undefined;
    if (externalSignal) {
      if (externalSignal.aborted) controller.abort(externalSignal.reason);
      else externalSignal.addEventListener('abort', () => controller.abort(externalSignal.reason), { once: true });
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: this.authHeader,
      'User-Agent': this.userAgent,
      ...(req.headers ?? {}),
    };
    if (req.options?.idempotencyKey) {
      headers['Idempotency-Key'] = req.options.idempotencyKey;
    }

    this.logger.debug('http request', { method: req.method, path: req.path });

    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: req.method,
        headers,
        body: req.body !== undefined && req.body !== null ? JSON.stringify(req.body) : null,
        signal: controller.signal,
      });
    } catch (err) {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      if (isAbortError(err)) {
        if (controller.signal.reason === TIMEOUT_REASON) {
          throw new TimeoutError(`Request timed out after ${timeoutMs}ms`, {
            method: req.method,
            path: req.path,
            timeoutMs,
            cause: err,
          });
        }
        throw new SuperSaasError('Request aborted', {
          method: req.method,
          path: req.path,
          cause: err,
        });
      }
      throw new NetworkError(`Network error: ${(err as Error).message}`, {
        method: req.method,
        path: req.path,
        cause: err,
      });
    }
    if (timeoutHandle) clearTimeout(timeoutHandle);

    const requestId = response.headers.get('x-request-id') ?? undefined;
    const body = await this.parseBody(response);

    if (!response.ok) {
      const retryAfter = parseRetryAfter(response.headers.get('retry-after'));
      const fieldErrors = extractFieldErrors(body);
      this.logger.warn('http error', {
        method: req.method,
        path: req.path,
        status: response.status,
      });
      throw errorForStatus(response.status, {
        method: req.method,
        path: req.path,
        body,
        ...(requestId !== undefined ? { requestId } : {}),
        ...(retryAfter !== undefined ? { retryAfterMs: retryAfter } : {}),
        ...(fieldErrors !== undefined ? { fieldErrors } : {}),
      });
    }

    // SuperSaaS returns a `Location` header on POST 201 with the new resource URL.
    if (response.status === 201 && req.method === 'POST') {
      const location = response.headers.get('location');
      if (location) {
        return { status: response.status, body: location as unknown as T, headers: response.headers };
      }
    }

    return { status: response.status, body: body as T, headers: response.headers };
  }

  private buildUrl(path: string, query?: Record<string, unknown>): string {
    const url = new URL(`${this.host}/api${path}.json`);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value === null || value === undefined || value === '') continue;
        url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
  }

  private async parseBody(response: Response): Promise<unknown> {
    const contentType = response.headers.get('content-type') ?? '';
    const contentLength = response.headers.get('content-length');
    if (contentLength === '0' || response.status === 204) return undefined;
    if (contentType.includes('application/json')) {
      const text = await response.text();
      return text.length > 0 ? JSON.parse(text) : undefined;
    }
    if (contentType.includes('text/')) {
      return await response.text();
    }
    // Best-effort: try to parse as text. Empty bodies are common.
    try {
      const text = await response.text();
      return text.length > 0 ? text : undefined;
    } catch {
      return undefined;
    }
  }
}

const TIMEOUT_REASON = Symbol('supersaas.timeout');

function timeoutReason(): unknown {
  return TIMEOUT_REASON;
}

function isAbortError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const name = (err as { name?: unknown }).name;
  return name === 'AbortError';
}

function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = Number.parseInt(header, 10);
  if (!Number.isNaN(seconds)) return seconds * 1000;
  const date = Date.parse(header);
  if (!Number.isNaN(date)) return Math.max(0, date - Date.now());
  return undefined;
}

function extractFieldErrors(body: unknown): Record<string, string[]> | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const obj = body as Record<string, unknown>;
  const errors = obj['errors'];
  if (!errors || typeof errors !== 'object' || Array.isArray(errors)) return undefined;
  const out: Record<string, string[]> = {};
  for (const [field, messages] of Object.entries(errors as Record<string, unknown>)) {
    if (Array.isArray(messages)) {
      out[field] = messages.filter((m): m is string => typeof m === 'string');
    } else if (typeof messages === 'string') {
      out[field] = [messages];
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}
