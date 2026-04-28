import { describe, expect, it } from 'vitest';
import { SuperSaas } from '../../src/index.js';
import { MockHttpClient } from '../helpers/mockHttp.js';

function setup(): { client: SuperSaas; http: MockHttpClient } {
  const http = new MockHttpClient();
  return {
    client: new SuperSaas({ accountName: 'a', apiKey: 'k', httpClient: http }),
    http,
  };
}

describe('Forms', () => {
  it('list issues GET /forms with form_id', async () => {
    const { client, http } = setup();
    http.push({ body: [{ id: 1, fields: {} }] });
    await client.forms.list({ formId: 5 });
    expect(http.calls[0]).toMatchObject({
      method: 'GET',
      path: '/forms',
      query: { form_id: 5 },
    });
  });

  it('get issues GET /forms with id', async () => {
    const { client, http } = setup();
    http.push({ body: { id: 1, fields: {} } });
    await client.forms.get(1);
    expect(http.calls[0]).toMatchObject({
      method: 'GET',
      path: '/forms',
      query: { id: 1 },
    });
  });

  it('templates issues GET /super_forms', async () => {
    const { client, http } = setup();
    http.push({ body: [{ id: 1, name: 'Customer Intake' }] });
    await client.forms.templates();
    expect(http.calls[0]).toMatchObject({ method: 'GET', path: '/super_forms' });
  });
});
