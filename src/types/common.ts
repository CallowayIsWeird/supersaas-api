/**
 * Shared types used across the SDK.
 *
 * @category Types
 */

/**
 * A datetime value accepted by booking and availability endpoints.
 *
 * Accepts a JavaScript {@link Date} or a string already formatted as
 * `YYYY-MM-DD HH:MM:SS`. The SDK normalizes either form against the
 * configured timezone before sending it to SuperSaaS.
 *
 * **Timezone behavior:** if you pass a `Date`, it will be formatted in the
 * client's configured timezone (defaulting to UTC). If you pass a string,
 * it is sent verbatim — SuperSaaS will interpret it in the schedule's
 * configured timezone.
 */
export type DateTimeInput = Date | string;

/**
 * Standard pagination parameters accepted by list endpoints.
 *
 * @category Types
 */
export interface PaginationParams {
  /** Maximum number of results to return per page. */
  limit?: number;
  /** Offset into the result set. */
  offset?: number;
}

/**
 * Options passed to async-iterator pagination helpers.
 *
 * @category Types
 */
export interface IteratePaginationParams {
  /** Page size to request from the server. Defaults to 100. */
  pageSize?: number;
  /** Maximum total number of items to yield. Defaults to unlimited. */
  maxResults?: number;
}

/**
 * Per-request override options. All fields override the corresponding
 * client-level defaults for a single call.
 *
 * @category Types
 */
export interface RequestOptions {
  /** Abort signal to cancel the request. */
  signal?: AbortSignal;
  /** Per-request timeout in milliseconds. Overrides client default. */
  timeout?: number;
  /** Override the maximum number of retries for this request. */
  maxRetries?: number;
  /** Idempotency key for write operations. */
  idempotencyKey?: string;
}
