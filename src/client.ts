/**
 * Main entry point. Construct a {@link SuperSaas} instance and access the
 * SuperSaaS API through its resource namespaces.
 *
 * @module
 */

import { ConfigError } from './errors.js';
import type { HttpClient } from './http.js';
import { FetchHttpClient } from './http.js';
import type { Logger } from './logger.js';
import { noopLogger } from './logger.js';
import { RateLimiter } from './rateLimit.js';
import type { RetryConfig } from './retry.js';
import { Appointments } from './resources/appointments.js';
import { Users } from './resources/users.js';
import { Schedules } from './resources/schedules.js';
import { Forms } from './resources/forms.js';
import { Promotions } from './resources/promotions.js';
import { Groups } from './resources/groups.js';
import { API_VERSION, DEFAULT_HOST } from './constants.js';

/**
 * Package version. Updated by the release tooling.
 *
 * @internal
 */
export const SDK_VERSION = '0.1.0';

/**
 * Configuration accepted by the {@link SuperSaas} constructor.
 *
 * @category Client
 */
export interface SuperSaasConfig {
  /** SuperSaaS account name (subdomain). */
  accountName: string;
  /** SuperSaaS API key, generated under Account Info → API. */
  apiKey: string;
  /** Override the API host. Defaults to `https://www.supersaas.com`. */
  host?: string;
  /** Default request timeout in milliseconds. Defaults to `30000` (30s). */
  timeout?: number;
  /** Maximum retries per idempotent request. Defaults to `3`. */
  maxRetries?: number;
  /** Initial retry backoff in milliseconds. Defaults to `200`. */
  retryBaseDelayMs?: number;
  /** Maximum retry backoff in milliseconds. Defaults to `30000`. */
  retryMaxDelayMs?: number;
  /**
   * Minimum interval between requests in milliseconds. Defaults to `1000`
   * (matching SuperSaaS's documented rate limit). Set to `0` to disable.
   */
  rateLimitIntervalMs?: number;
  /** Pluggable logger. Defaults to a no-op. */
  logger?: Logger;
  /** Provide a custom {@link HttpClient}. Mainly for testing. */
  httpClient?: HttpClient;
  /**
   * IANA timezone for formatting `Date` parameters into SuperSaaS-compatible
   * datetime strings. Defaults to `'UTC'`. Set to your account's configured
   * timezone (e.g. `'America/New_York'`, `'Europe/Berlin'`, `'Asia/Tokyo'`)
   * so that `Date` objects you pass land at the wall-clock time you intended
   * in the schedule.
   */
  timezone?: string;
}

/**
 * Internal request context shared with resource classes.
 *
 * @internal
 */
export interface ClientContext {
  http: HttpClient;
  logger: Logger;
  timezone: string;
}

/**
 * SuperSaaS API client.
 *
 * @example
 * ```ts
 * import { SuperSaas } from '@callowayisweird/supersaas';
 *
 * const client = new SuperSaas({
 *   accountName: 'your-account-name',
 *   apiKey: process.env.SSS_API_KEY!,
 *   timezone: 'America/New_York',
 * });
 *
 * const schedules = await client.schedules.list();
 * ```
 *
 * @category Client
 */
export class SuperSaas {
  /** Booking-related operations. */
  readonly appointments: Appointments;
  /** User-related operations including SSO bridge methods. */
  readonly users: Users;
  /** Schedule and resource discovery. */
  readonly schedules: Schedules;
  /** Custom forms. */
  readonly forms: Forms;
  /** Promotion / coupon code operations. */
  readonly promotions: Promotions;
  /** User group operations. */
  readonly groups: Groups;

  /** SuperSaaS REST API version this client targets. */
  static readonly API_VERSION = API_VERSION;
  /** SDK version. */
  static readonly SDK_VERSION = SDK_VERSION;

  constructor(config: SuperSaasConfig) {
    if (!config.accountName) {
      throw new ConfigError('Missing required config: accountName');
    }
    if (!config.apiKey) {
      throw new ConfigError('Missing required config: apiKey');
    }

    const logger = config.logger ?? noopLogger;
    const timezone = config.timezone ?? 'UTC';
    const host = config.host ?? DEFAULT_HOST;
    const timeout = config.timeout ?? 30_000;
    const retryConfig: RetryConfig = {
      maxRetries: config.maxRetries ?? 3,
      baseDelayMs: config.retryBaseDelayMs ?? 200,
      maxDelayMs: config.retryMaxDelayMs ?? 30_000,
    };
    const rateLimitIntervalMs = config.rateLimitIntervalMs ?? 1000;

    const http: HttpClient =
      config.httpClient ??
      new FetchHttpClient({
        host,
        accountName: config.accountName,
        apiKey: config.apiKey,
        userAgent: `supersaas-ts/${SDK_VERSION} Node/${process.version} API/${API_VERSION}`,
        timeoutMs: timeout,
        retry: retryConfig,
        ...(rateLimitIntervalMs > 0
          ? {
              rateLimiter: new RateLimiter({ minIntervalMs: rateLimitIntervalMs }),
            }
          : {}),
        logger,
      });

    const ctx: ClientContext = { http, logger, timezone };
    this.appointments = new Appointments(ctx);
    this.users = new Users(ctx);
    this.schedules = new Schedules(ctx);
    this.forms = new Forms(ctx);
    this.promotions = new Promotions(ctx);
    this.groups = new Groups(ctx);
  }

  /**
   * Construct a client from `SSS_API_ACCOUNT_NAME` and `SSS_API_KEY`
   * environment variables. Useful for scripts and tests.
   *
   * Throws {@link ConfigError} if either variable is missing.
   */
  static fromEnv(overrides: Partial<SuperSaasConfig> = {}): SuperSaas {
    const accountName = process.env['SSS_API_ACCOUNT_NAME'];
    const apiKey = process.env['SSS_API_KEY'];
    if (!accountName) {
      throw new ConfigError('SSS_API_ACCOUNT_NAME environment variable is not set.');
    }
    if (!apiKey) {
      throw new ConfigError('SSS_API_KEY environment variable is not set.');
    }
    return new SuperSaas({ accountName, apiKey, ...overrides });
  }
}
