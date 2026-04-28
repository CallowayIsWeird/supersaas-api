/**
 * `@callowayisweird/supersaas` — modern, fully-typed TypeScript SDK for the
 * SuperSaaS booking platform.
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
 * for await (const user of client.users.iterate()) {
 *   console.log(user.email);
 * }
 * ```
 *
 * @packageDocumentation
 */

export { SuperSaas, type SuperSaasConfig } from './client.js';
export { Role, Duplicate, NotFound, DEFAULT_HOST, API_VERSION } from './constants.js';

// Errors
export {
  SuperSaasError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  RateLimitError,
  ServerError,
  NetworkError,
  TimeoutError,
  ConfigError,
  type ErrorContext,
} from './errors.js';

// HTTP layer (for custom transports / testing)
export {
  type HttpClient,
  type HttpRequest,
  type HttpResponse,
  type HttpMethod,
  type FetchHttpClientConfig,
  FetchHttpClient,
} from './http.js';

// Logger
export { type Logger, noopLogger, consoleLogger } from './logger.js';

// Pagination
export { paginate, collect, type PageFetcher } from './pagination.js';

// Resource classes (exported for advanced typing scenarios)
export { Appointments } from './resources/appointments.js';
export type {
  ListAppointmentsParams,
  RangeAppointmentsParams,
  ChangesAppointmentsParams,
  AvailableSlotsParams,
  AgendaParams,
  CreateBookingParams,
  UpdateBookingParams,
  DeleteBookingParams,
} from './resources/appointments.js';

export { Users } from './resources/users.js';
export type {
  ListUsersParams,
  GetUserParams,
  CreateUserParams,
  UpdateUserParams,
  DeleteUserParams,
} from './resources/users.js';

export { Schedules } from './resources/schedules.js';
export { Forms } from './resources/forms.js';
export type { ListFormsParams } from './resources/forms.js';
export { Promotions } from './resources/promotions.js';
export { Groups } from './resources/groups.js';

// Domain types
export type {
  DateTimeInput,
  PaginationParams,
  IteratePaginationParams,
  RequestOptions,
  User,
  CreateUserAttributes,
  UpdateUserAttributes,
  FieldList,
  Booking,
  Slot,
  AppointmentResult,
  BookingAttributes,
  Schedule,
  Resource,
  Form,
  SuperForm,
  SuperFormField,
  Promotion,
  Group,
} from './types/index.js';

// Retry / rate-limit primitives (for advanced consumers)
export { RateLimiter, type RateLimiterConfig } from './rateLimit.js';
export { retry, isRetryableError, backoffDelay, type RetryConfig } from './retry.js';
