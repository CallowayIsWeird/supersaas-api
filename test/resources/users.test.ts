import { describe, expect, it } from 'vitest';
import { Role, SuperSaas, ValidationError } from '../../src/index.js';
import { MockHttpClient } from '../helpers/mockHttp.js';

function setup(): { client: SuperSaas; http: MockHttpClient } {
  const http = new MockHttpClient();
  const client = new SuperSaas({ accountName: 'a', apiKey: 'k', httpClient: http });
  return { client, http };
}

describe('Users', () => {
  it('list issues GET /users with optional form/limit/offset', async () => {
    const { client, http } = setup();
    http.push({ body: [{ id: 1, name: 'alice' }] });
    const users = await client.users.list({ form: true, limit: 10, offset: 0 });
    expect(users[0]?.name).toBe('alice');
    expect(http.calls[0]).toMatchObject({
      method: 'GET',
      path: '/users',
      query: { form: true, limit: 10 },
    });
  });

  it('iterate pages until empty', async () => {
    const { client, http } = setup();
    http.push({ body: [{ id: 1, name: 'a' }, { id: 2, name: 'b' }] });
    http.push({ body: [] });
    const collected: string[] = [];
    for await (const u of client.users.iterate({ pageSize: 2 })) {
      collected.push(u.name);
    }
    expect(collected).toEqual(['a', 'b']);
  });

  it('get issues GET /users/:id', async () => {
    const { client, http } = setup();
    http.push({ body: { id: 5, name: 'b' } });
    const u = await client.users.get({ userId: 5 });
    expect(u.id).toBe(5);
    expect(http.calls[0]?.path).toBe('/users/5');
  });

  it('create requires name and validates role', async () => {
    const { client, http } = setup();
    http.push({ body: '/api/users/9.json', status: 201 });
    const result = await client.users.create({
      attributes: { name: 'new', role: Role.Customer },
    });
    expect(result).toBe('/api/users/9.json');
    expect(http.calls[0]).toMatchObject({ method: 'POST', path: '/users' });
  });

  it('create rejects missing name', async () => {
    const { client } = setup();
    await expect(
      client.users.create({ attributes: { name: '' as unknown as string } }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('create rejects invalid role', async () => {
    const { client } = setup();
    await expect(
      client.users.create({ attributes: { name: 'x', role: 99 } }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('update issues PUT /users/:id', async () => {
    const { client, http } = setup();
    http.push({ body: { id: 5, name: 'b', email: 'b@x.com' } });
    await client.users.update({ userId: 5, attributes: { email: 'b@x.com' } });
    expect(http.calls[0]).toMatchObject({ method: 'PUT', path: '/users/5' });
  });

  it('delete issues DELETE /users/:id', async () => {
    const { client, http } = setup();
    http.push({ body: null, status: 204 });
    await client.users.delete({ userId: 5 });
    expect(http.calls[0]).toMatchObject({ method: 'DELETE', path: '/users/5' });
  });

  it('fieldList issues GET /field_list', async () => {
    const { client, http } = setup();
    http.push({ body: [{ id: 1, name: 'field_1' }] });
    await client.users.fieldList();
    expect(http.calls[0]).toMatchObject({ method: 'GET', path: '/field_list' });
  });
});
