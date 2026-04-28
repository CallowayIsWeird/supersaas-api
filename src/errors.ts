/**
 * Structured error classes thrown by the SDK.
 *
 * All errors extend {@link SuperSaasError}. Catch the specific subclass for
 * known failure modes; catch the base class to handle anything from this SDK.
 *
 * @module
 */

/**
 * Context attached to every {@link SuperSaasError}.
 *
 * @category Errors
 */
export interface ErrorContext {
  /** HTTP method of the failing request. */
  method?: string;
  /** Request path (without host). */
  path?: string;
  /** HTTP status code, if a response was received. */
  status?: number;
  /** Raw response body. */
  body?: unknown;
  /** SuperSaaS request id, if returned. */
  requestId?: string;
  /** Underlying cause, if the error wraps another error. */
  cause?: unknown;
}

/**
 * Base class for all errors thrown by this SDK.
 *
 * @category Errors
 */
export class SuperSaasError extends Error {
  readonly method?: string;
  readonly path?: string;
  readonly status?: number;
  readonly body?: unknown;
  readonly requestId?: string;
  override readonly cause?: unknown;

  constructor(message: string, context: ErrorContext = {}) {
    super(message);
    this.name = 'SuperSaasError';
    if (context.method !== undefined) this.method = context.method;
    if (context.path !== undefined) this.path = context.path;
    if (context.status !== undefined) this.status = context.status;
    if (context.body !== undefined) this.body = context.body;
    if (context.requestId !== undefined) this.requestId = context.requestId;
    if (context.cause !== undefined) this.cause = context.cause;
  }
}

/**
 * Authentication failed (HTTP 401). The account name or API key is invalid
 * or the API key has been revoked.
 *
 * @category Errors
 */
export class AuthError extends SuperSaasError {
  constructor(message = 'Authentication failed', context: ErrorContext = {}) {
    super(message, context);
    this.name = 'AuthError';
  }
}

/**
 * Authorization failed (HTTP 403). The credentials are valid but lack
 * permission for the requested operation.
 *
 * @category Errors
 */
export class ForbiddenError extends SuperSaasError {
  constructor(message = 'Forbidden', context: ErrorContext = {}) {
    super(message, context);
    this.name = 'ForbiddenError';
  }
}

/**
 * Resource not found (HTTP 404).
 *
 * @category Errors
 */
export class NotFoundError extends SuperSaasError {
  constructor(message = 'Resource not found', context: ErrorContext = {}) {
    super(message, context);
    this.name = 'NotFoundError';
  }
}

/**
 * Request validation failed (HTTP 400 or 422).
 *
 * @category Errors
 */
export class ValidationError extends SuperSaasError {
  /** Field-level errors keyed by field name, when SuperSaaS returns them. */
  readonly fieldErrors?: Record<string, string[]>;

  constructor(
    message = 'Validation failed',
    context: ErrorContext & { fieldErrors?: Record<string, string[]> } = {},
  ) {
    super(message, context);
    this.name = 'ValidationError';
    if (context.fieldErrors !== undefined) this.fieldErrors = context.fieldErrors;
  }
}

/**
 * Rate limit exceeded (HTTP 429). Retry after {@link retryAfterMs}.
 *
 * @category Errors
 */
export class RateLimitError extends SuperSaasError {
  /** Milliseconds to wait before retrying, parsed from the `Retry-After` header. */
  readonly retryAfterMs: number;

  constructor(
    message = 'Rate limit exceeded',
    context: ErrorContext & { retryAfterMs?: number } = {},
  ) {
    super(message, context);
    this.name = 'RateLimitError';
    this.retryAfterMs = context.retryAfterMs ?? 1000;
  }
}

/**
 * SuperSaaS server error (HTTP 5xx).
 *
 * @category Errors
 */
export class ServerError extends SuperSaasError {
  constructor(message = 'Server error', context: ErrorContext = {}) {
    super(message, context);
    this.name = 'ServerError';
  }
}

/**
 * Network failure — could not reach the server.
 *
 * @category Errors
 */
export class NetworkError extends SuperSaasError {
  constructor(message = 'Network error', context: ErrorContext = {}) {
    super(message, context);
    this.name = 'NetworkError';
  }
}

/**
 * Request exceeded its timeout.
 *
 * @category Errors
 */
export class TimeoutError extends SuperSaasError {
  /** Configured timeout in milliseconds. */
  readonly timeoutMs: number;

  constructor(message = 'Request timed out', context: ErrorContext & { timeoutMs?: number } = {}) {
    super(message, context);
    this.name = 'TimeoutError';
    this.timeoutMs = context.timeoutMs ?? 0;
  }
}

/**
 * Configuration is invalid (e.g. missing API key, bad host URL).
 *
 * @category Errors
 */
export class ConfigError extends SuperSaasError {
  constructor(message: string, context: ErrorContext = {}) {
    super(message, context);
    this.name = 'ConfigError';
  }
}

/**
 * Maps an HTTP status + body into the appropriate {@link SuperSaasError}
 * subclass. Used internally by {@link HttpClient}.
 *
 * @internal
 */
export function errorForStatus(
  status: number,
  context: ErrorContext & {
    retryAfterMs?: number;
    fieldErrors?: Record<string, string[]>;
  } = {},
): SuperSaasError {
  const message = extractMessage(context.body) ?? `Request failed with status ${status}`;
  const fullContext = { ...context, status };
  switch (status) {
    case 400:
    case 422:
      return new ValidationError(message, fullContext);
    case 401:
      return new AuthError(message, fullContext);
    case 403:
      return new ForbiddenError(message, fullContext);
    case 404:
      return new NotFoundError(message, fullContext);
    case 429:
      return new RateLimitError(message, fullContext);
    default:
      if (status >= 500) return new ServerError(message, fullContext);
      return new SuperSaasError(message, fullContext);
  }
}

function extractMessage(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const obj = body as Record<string, unknown>;
  if (typeof obj['message'] === 'string') return obj['message'];
  if (typeof obj['error'] === 'string') return obj['error'];
  if (Array.isArray(obj['errors'])) {
    const first = obj['errors'][0];
    if (typeof first === 'string') return first;
    if (first && typeof first === 'object' && 'title' in first) {
      const title = (first as { title?: unknown }).title;
      if (typeof title === 'string') return title;
    }
  }
  return undefined;
}
