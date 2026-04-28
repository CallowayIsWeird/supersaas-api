import { describe, expect, it } from 'vitest';
import { SuperSaas, ValidationError } from '../../src/index.js';
import { MockHttpClient } from '../helpers/mockHttp.js';

function setup(): { client: SuperSaas; http: MockHttpClient } {
  const http = new MockHttpClient();
  return {
    client: new SuperSaas({ accountName: 'a', apiKey: 'k', httpClient: http }),
    http,
  };
}

describe('Promotions', () => {
  it('list issues GET /promotions', async () => {
    const { client, http } = setup();
    http.push({ body: [{ id: 1, code: 'SAVE10' }] });
    await client.promotions.list({ limit: 50 });
    expect(http.calls[0]).toMatchObject({ method: 'GET', path: '/promotions' });
  });

  it('get validates the code is alphanumeric', async () => {
    const { client } = setup();
    await expect(client.promotions.get('not-valid')).rejects.toBeInstanceOf(ValidationError);
  });

  it('duplicate posts to /promotions', async () => {
    const { client, http } = setup();
    http.push({ body: '/api/promotions/NEW.json', status: 201 });
    await client.promotions.duplicate('NEWCODE', 'TEMPLATE');
    expect(http.calls[0]).toMatchObject({ method: 'POST', path: '/promotions' });
  });
});
