import { describe, expect, it } from 'vitest';
import { ConfigError, SuperSaas } from '../src/index.js';
import { MockHttpClient } from './helpers/mockHttp.js';

describe('SuperSaas', () => {
  it('requires accountName', () => {
    expect(() => new SuperSaas({ accountName: '', apiKey: 'k' })).toThrow(ConfigError);
  });

  it('requires apiKey', () => {
    expect(() => new SuperSaas({ accountName: 'a', apiKey: '' })).toThrow(ConfigError);
  });

  it('builds with a custom HttpClient', () => {
    const http = new MockHttpClient();
    const client = new SuperSaas({ accountName: 'a', apiKey: 'k', httpClient: http });
    expect(client.appointments).toBeDefined();
    expect(client.users).toBeDefined();
    expect(client.schedules).toBeDefined();
  });

  describe('fromEnv', () => {
    it('throws if SSS_API_ACCOUNT_NAME is missing', () => {
      const prevAccount = process.env['SSS_API_ACCOUNT_NAME'];
      const prevKey = process.env['SSS_API_KEY'];
      delete process.env['SSS_API_ACCOUNT_NAME'];
      process.env['SSS_API_KEY'] = 'k';
      try {
        expect(() => SuperSaas.fromEnv()).toThrow(/SSS_API_ACCOUNT_NAME/);
      } finally {
        if (prevAccount !== undefined) process.env['SSS_API_ACCOUNT_NAME'] = prevAccount;
        if (prevKey === undefined) delete process.env['SSS_API_KEY'];
        else process.env['SSS_API_KEY'] = prevKey;
      }
    });

    it('throws if SSS_API_KEY is missing', () => {
      const prevAccount = process.env['SSS_API_ACCOUNT_NAME'];
      const prevKey = process.env['SSS_API_KEY'];
      process.env['SSS_API_ACCOUNT_NAME'] = 'a';
      delete process.env['SSS_API_KEY'];
      try {
        expect(() => SuperSaas.fromEnv()).toThrow(/SSS_API_KEY/);
      } finally {
        if (prevKey !== undefined) process.env['SSS_API_KEY'] = prevKey;
        if (prevAccount === undefined) delete process.env['SSS_API_ACCOUNT_NAME'];
        else process.env['SSS_API_ACCOUNT_NAME'] = prevAccount;
      }
    });

    it('builds when env vars are set', () => {
      const prevAccount = process.env['SSS_API_ACCOUNT_NAME'];
      const prevKey = process.env['SSS_API_KEY'];
      process.env['SSS_API_ACCOUNT_NAME'] = 'a';
      process.env['SSS_API_KEY'] = 'k';
      try {
        const client = SuperSaas.fromEnv({ httpClient: new MockHttpClient() });
        expect(client).toBeInstanceOf(SuperSaas);
      } finally {
        if (prevAccount === undefined) delete process.env['SSS_API_ACCOUNT_NAME'];
        else process.env['SSS_API_ACCOUNT_NAME'] = prevAccount;
        if (prevKey === undefined) delete process.env['SSS_API_KEY'];
        else process.env['SSS_API_KEY'] = prevKey;
      }
    });
  });
});
