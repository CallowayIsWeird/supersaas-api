import { describe, expect, it } from 'vitest';
import {
  AuthError,
  errorForStatus,
  ForbiddenError,
  NotFoundError,
  RateLimitError,
  ServerError,
  SuperSaasError,
  ValidationError,
} from '../src/errors.js';

describe('errorForStatus', () => {
  it('maps 400/422 to ValidationError', () => {
    expect(errorForStatus(400)).toBeInstanceOf(ValidationError);
    expect(errorForStatus(422)).toBeInstanceOf(ValidationError);
  });

  it('maps 401 to AuthError', () => {
    expect(errorForStatus(401)).toBeInstanceOf(AuthError);
  });

  it('maps 403 to ForbiddenError', () => {
    expect(errorForStatus(403)).toBeInstanceOf(ForbiddenError);
  });

  it('maps 404 to NotFoundError', () => {
    expect(errorForStatus(404)).toBeInstanceOf(NotFoundError);
  });

  it('maps 429 to RateLimitError with retryAfterMs', () => {
    const err = errorForStatus(429, { retryAfterMs: 5000 });
    expect(err).toBeInstanceOf(RateLimitError);
    expect((err as RateLimitError).retryAfterMs).toBe(5000);
  });

  it('maps 5xx to ServerError', () => {
    expect(errorForStatus(500)).toBeInstanceOf(ServerError);
    expect(errorForStatus(503)).toBeInstanceOf(ServerError);
  });

  it('falls back to SuperSaasError for unknown statuses', () => {
    const err = errorForStatus(418);
    expect(err).toBeInstanceOf(SuperSaasError);
    expect(err).not.toBeInstanceOf(ServerError);
  });

  it('extracts message from body.message', () => {
    const err = errorForStatus(400, { body: { message: 'bad input' } });
    expect(err.message).toBe('bad input');
  });

  it('extracts message from body.errors[0].title', () => {
    const err = errorForStatus(400, { body: { errors: [{ title: 'invalid name' }] } });
    expect(err.message).toBe('invalid name');
  });

  it('falls back to a generic message when no body message', () => {
    const err = errorForStatus(500);
    expect(err.message).toBe('Request failed with status 500');
  });

  it('attaches context fields', () => {
    const err = errorForStatus(404, {
      method: 'GET',
      path: '/users/42',
      requestId: 'req_xyz',
      body: { message: 'no such user' },
    });
    expect(err.method).toBe('GET');
    expect(err.path).toBe('/users/42');
    expect(err.requestId).toBe('req_xyz');
    expect(err.status).toBe(404);
  });
});
