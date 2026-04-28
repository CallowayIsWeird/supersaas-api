# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-04-26

### Added

- Initial public release.
- Strict TypeScript port of the official `supersaas-api-client` (©2018 SuperSaaS).
- `SuperSaas` client class with explicit instantiation and `fromEnv()` factory.
- Resource namespaces: `appointments`, `users`, `schedules`, `forms`, `promotions`, `groups`.
- Options-object method signatures across the API.
- Discriminated `AppointmentResult` union for booking-vs-slot responses.
- Async-iterator pagination via `Users.iterate()` and `paginate()` helper.
- Pluggable `HttpClient` interface with default `FetchHttpClient`.
- Configurable per-request timeout via `AbortSignal`.
- Exponential-backoff retry with full jitter for idempotent requests.
- Concurrency-safe `RateLimiter` honoring `Retry-After` header.
- Typed error hierarchy: `SuperSaasError`, `AuthError`, `ForbiddenError`,
  `NotFoundError`, `ValidationError`, `RateLimitError`, `ServerError`,
  `NetworkError`, `TimeoutError`, `ConfigError`.
- Pluggable `Logger` interface with `noopLogger` default and `consoleLogger` adapter.
- Named constants: `Role`, `Duplicate`, `NotFound`.
- IANA-timezone-aware `formatDateTime` using `Intl.DateTimeFormat`.
- Idempotency key support for write operations.
- Dual ESM + CJS build with `.d.ts` and `.d.cts` output.
- Tree-shakeable named exports.
- Zero runtime dependencies.

### Fixed (vs. upstream)

- `Appointments.agenda` no longer wraps the array response in a single
  malformed `Appointment` object.
- Datetime formatter uses an explicit IANA timezone instead of the
  consumer's local machine timezone.
- Strict datetime regex requires zero-padding (`2026-04-28`, not `2026-4-28`).
- Replaced the broken `Client.throttle` (concurrent callers all passed
  the gate) with a proper async-mutex queue.
- Removed deprecated `new Buffer.from(...)` usage.
- Removed module-level singleton; tests no longer leak state.
- Errors carry full request context (status, path, method, body, requestId).
- 5xx and transient network errors are now retried for idempotent requests.
