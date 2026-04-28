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

describe('Schedules', () => {
  it('list issues GET /schedules', async () => {
    const { client, http } = setup();
    http.push({ body: [{ id: 1, name: 'Studio A' }] });
    const result = await client.schedules.list();
    expect(result[0]?.name).toBe('Studio A');
    expect(http.calls[0]).toMatchObject({ method: 'GET', path: '/schedules' });
  });

  it('resources issues GET /resources with schedule_id', async () => {
    const { client, http } = setup();
    http.push({ body: [{ id: 10, name: 'Drum Kit' }] });
    await client.schedules.resources(7);
    expect(http.calls[0]).toMatchObject({
      method: 'GET',
      path: '/resources',
      query: { schedule_id: 7 },
    });
  });

  it('fieldList issues GET /field_list with schedule_id', async () => {
    const { client, http } = setup();
    http.push({ body: [] });
    await client.schedules.fieldList(7);
    expect(http.calls[0]).toMatchObject({
      method: 'GET',
      path: '/field_list',
      query: { schedule_id: 7 },
    });
  });
});
