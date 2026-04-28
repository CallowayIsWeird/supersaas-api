import { describe, expect, it } from 'vitest';
import { SuperSaas } from '../../src/index.js';
import { MockHttpClient } from '../helpers/mockHttp.js';

describe('Groups', () => {
  it('list issues GET /groups', async () => {
    const http = new MockHttpClient();
    const client = new SuperSaas({ accountName: 'a', apiKey: 'k', httpClient: http });
    http.push({ body: [{ id: 1, name: 'Members' }] });
    const groups = await client.groups.list();
    expect(groups[0]?.name).toBe('Members');
    expect(http.calls[0]).toMatchObject({ method: 'GET', path: '/groups' });
  });

  it('list normalizes single object response into an array', async () => {
    const http = new MockHttpClient();
    const client = new SuperSaas({ accountName: 'a', apiKey: 'k', httpClient: http });
    http.push({ body: { id: 1, name: 'Members' } });
    const groups = await client.groups.list();
    expect(groups).toHaveLength(1);
  });
});
