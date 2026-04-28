# @callowayisweird/supersaas

[![npm version](https://img.shields.io/npm/v/@callowayisweird/supersaas.svg)](https://www.npmjs.com/package/@callowayisweird/supersaas)
[![ci](https://github.com/CallowayIsWeird/supersaas-api/actions/workflows/ci.yml/badge.svg)](https://github.com/CallowayIsWeird/supersaas-api/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/@callowayisweird/supersaas.svg)](LICENSE)

Modern, fully-typed TypeScript SDK for the [SuperSaaS](https://www.supersaas.com) booking platform.

This library is a ground-up TypeScript rewrite of the [official SuperSaaS Node.js client](https://github.com/SuperSaaS/supersaas-nodejs-api-client) with strict typing, structured errors, real concurrency-safe rate limiting, retries with exponential backoff, request timeouts, async-iterator pagination, and a pluggable HTTP layer. Drop-in for any modern Node project.

---

## Install

```bash
npm install @callowayisweird/supersaas
```

Requires **Node ≥ 22**.

## Quickstart

```ts
import { SuperSaas } from '@callowayisweird/supersaas';

const client = new SuperSaas({
  accountName: 'your-account-name',
  apiKey: process.env.SSS_API_KEY!,
  timezone: 'America/Phoenix', // schedules' configured timezone
});

const schedules = await client.schedules.list();
console.log(schedules);
```

Or build from environment variables (`SSS_API_ACCOUNT_NAME` and `SSS_API_KEY`):

```ts
const client = SuperSaas.fromEnv({ timezone: 'America/Phoenix' });
```

## Why this library

The upstream `supersaas-api-client` package works but has several real issues:

| Upstream | This library |
|---|---|
| No TypeScript types — everything is `any` | Strict TS end-to-end, full inference at call sites |
| Methods take both Promise and Node-style callback (footgun) | Promise-only |
| Errors are bare `Error` with status-only message | Typed error hierarchy with status, path, method, body, requestId |
| Throttle is broken under concurrency (parallel calls all pass) | Real async-mutex queue, honors `Retry-After` |
| No request timeout | Configurable per-request timeout via `AbortSignal` |
| No retries on 5xx or transient errors | Exponential-backoff retry for idempotent + 5xx |
| `new Buffer.from(...)` (deprecated) | Modern `Buffer.from(...)` |
| Module-level singleton reads env at import time | Class-based, explicit instantiation |
| Datetime formatter uses local-machine TZ silently | Explicit IANA timezone, `Intl`-based |
| Magic numeric roles `[3, 4, -1]` | Named `Role.Customer`, `Role.Admin`, `Role.Restricted` |
| 10-arg positional method signatures | Options-object signatures |
| Manual limit/offset pagination | `for await` async iterators |
| `console.log` baked into library | Pluggable `Logger` interface (default: silent) |
| `Appointments.agenda` returns malformed result | Returns array of typed results |
| `dryRun` half-implemented | Test by injecting your own `HttpClient` |
| CommonJS only | Dual ESM + CJS, tree-shakeable |

## API surface

### Client

```ts
const client = new SuperSaas({
  accountName: string,           // required
  apiKey: string,                // required
  host?: string,                 // default: https://www.supersaas.com
  timezone?: string,             // default: 'UTC'
  timeout?: number,              // default: 30_000 (ms)
  maxRetries?: number,           // default: 3
  retryBaseDelayMs?: number,     // default: 200
  retryMaxDelayMs?: number,      // default: 30_000
  rateLimitIntervalMs?: number,  // default: 1000 (set to 0 to disable)
  logger?: Logger,               // default: noopLogger
  httpClient?: HttpClient,       // default: built-in FetchHttpClient
});
```

### Resources

| Namespace | Methods |
|---|---|
| `client.appointments` | `list`, `get`, `create`, `update`, `delete`, `agenda`, `available`, `range`, `changes` |
| `client.users` | `list`, `iterate`, `get`, `create`, `update`, `delete`, `fieldList` |
| `client.schedules` | `list`, `resources`, `fieldList` |
| `client.forms` | `list`, `get`, `templates` |
| `client.promotions` | `list`, `get`, `duplicate` |
| `client.groups` | `list` |

Every method returns a fully typed `Promise<T>`. Every method accepts an optional `RequestOptions` parameter for per-request `signal`, `timeout`, `maxRetries`, and `idempotencyKey`.

### Pagination

List endpoints return one page. To walk all results, use `iterate()`:

```ts
for await (const user of client.users.iterate({ pageSize: 100 })) {
  console.log(user.email);
}

// Or materialize with a cap:
import { collect } from '@callowayisweird/supersaas';
const all = await collect(client.users.iterate({ maxResults: 500 }));
```

### Errors

All errors extend `SuperSaasError` and carry context:

```ts
import {
  AuthError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  RateLimitError,
  ServerError,
  NetworkError,
  TimeoutError,
} from '@callowayisweird/supersaas';

try {
  await client.appointments.create({ ... });
} catch (err) {
  if (err instanceof RateLimitError) {
    await new Promise((r) => setTimeout(r, err.retryAfterMs));
  } else if (err instanceof ValidationError) {
    console.error(err.fieldErrors); // { field: [messages...] }
  } else if (err instanceof NotFoundError) {
    // ...
  }
}
```

Errors expose `status`, `method`, `path`, `requestId`, and `body` for production debugging.

### Idempotency

Pass an `idempotencyKey` to make POST requests safe to retry:

```ts
await client.appointments.create(
  { scheduleId, userId, attributes },
  { idempotencyKey: crypto.randomUUID() },
);
```

When set, the request is automatically retried on transient failures. SuperSaaS will not double-create resources for the same key.

### Custom HTTP transport

Inject a custom transport for testing, observability, or custom auth:

```ts
import type { HttpClient, HttpRequest, HttpResponse } from '@callowayisweird/supersaas';

class LoggingHttpClient implements HttpClient {
  constructor(private inner: HttpClient) {}
  async request<T>(req: HttpRequest): Promise<HttpResponse<T>> {
    console.time(`${req.method} ${req.path}`);
    try {
      return await this.inner.request<T>(req);
    } finally {
      console.timeEnd(`${req.method} ${req.path}`);
    }
  }
}
```

## Migrating from `supersaas-api-client`

```diff
- const Client = require('supersaas-api-client');
- Client.configure({ accountName: 'a', api_key: 'k' });
- const slots = await Client.Instance.appointments.range(
-   42, false, '2026-04-28 09:00:00', '2026-04-28 23:00:00',
-   false, null, null, null, 50, 0,
- );
+ import { SuperSaas } from '@callowayisweird/supersaas';
+ const client = new SuperSaas({ accountName: 'a', apiKey: 'k' });
+ const slots = await client.appointments.range({
+   scheduleId: 42,
+   from: '2026-04-28 09:00:00',
+   to: '2026-04-28 23:00:00',
+   limit: 50,
+ });
```

Key differences:

- `api_key` → `apiKey`
- All resource methods take an options object instead of positional args
- `Client.Instance` singleton pattern is gone; instantiate explicitly
- `Appointments.agenda` now returns an array (not a wrapped object)
- Typed errors instead of `Error('Request failed with status 422')`

## Configuration recipes

### Phoenix-timezone client for a US studio

```ts
const client = new SuperSaas({
  accountName: 'musicloft',
  apiKey: process.env.SSS_API_KEY!,
  timezone: 'America/Phoenix',
});
```

### Tight rate limiting / fast retries

```ts
const client = new SuperSaas({
  accountName: 'a',
  apiKey: 'k',
  rateLimitIntervalMs: 250,
  retryBaseDelayMs: 100,
  maxRetries: 5,
});
```

### Disable rate limiting (e.g. when SuperSaaS doesn't enforce one for your tier)

```ts
const client = new SuperSaas({
  accountName: 'a',
  apiKey: 'k',
  rateLimitIntervalMs: 0,
});
```

## Development

```bash
npm install
npm run typecheck
npm run lint
npm test
npm run build
```

## License

MIT — see [LICENSE](LICENSE).

This library is a derivative work of the official [SuperSaaS Node.js API Client](https://github.com/SuperSaaS/supersaas-nodejs-api-client) (© 2018 SuperSaaS), also MIT.
