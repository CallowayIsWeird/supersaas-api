import { describe, expect, it } from 'vitest';
import { SuperSaas } from '../../src/index.js';
import { MockHttpClient } from '../helpers/mockHttp.js';

function setup(): { client: SuperSaas; http: MockHttpClient } {
  const http = new MockHttpClient();
  const client = new SuperSaas({
    accountName: 'a',
    apiKey: 'k',
    httpClient: http,
    timezone: 'Asia/Tokyo',
  });
  return { client, http };
}

describe('Appointments', () => {
  it('list issues GET /bookings with schedule_id', async () => {
    const { client, http } = setup();
    http.push({ body: [{ id: 1, schedule_id: 7, start: '2026-04-28 09:00:00', finish: '2026-04-28 10:00:00' }] });
    const result = await client.appointments.list({ scheduleId: 7 });
    expect(result).toHaveLength(1);
    expect(http.calls[0]).toMatchObject({
      method: 'GET',
      path: '/bookings',
      query: { schedule_id: 7 },
    });
  });

  it('range formats Date params in the configured timezone', async () => {
    const { client, http } = setup();
    http.push({ body: [] });
    await client.appointments.range({
      scheduleId: 7,
      from: new Date('2026-04-28T00:30:00Z'),
      to: new Date('2026-04-28T07:30:00Z'),
    });
    // Tokyo is UTC+9, no DST.
    expect(http.calls[0]?.query).toMatchObject({
      from: '2026-04-28 09:30:00',
      to: '2026-04-28 16:30:00',
    });
  });

  it('available filters out booking results and returns slots', async () => {
    const { client, http } = setup();
    http.push({
      body: [
        { id: 1, start: '2026-04-28 09:00:00', finish: '2026-04-28 10:00:00', bookings: [] },
        { id: 2, start: '2026-04-28 10:00:00', finish: '2026-04-28 11:00:00', bookings: [] },
      ],
    });
    const slots = await client.appointments.available({
      scheduleId: 7,
      from: '2026-04-28 09:00:00',
    });
    expect(slots).toHaveLength(2);
    expect(slots[0]?.start).toBe('2026-04-28 09:00:00');
  });

  it('agenda returns array of bookings (upstream bug fix)', async () => {
    const { client, http } = setup();
    http.push({
      body: [
        { id: 11, schedule_id: 7, user_id: 5, start: '2026-04-28 09:00:00', finish: '2026-04-28 10:00:00' },
        { id: 12, schedule_id: 7, user_id: 5, start: '2026-04-29 09:00:00', finish: '2026-04-29 10:00:00' },
      ],
    });
    const result = await client.appointments.agenda({ scheduleId: 7, user: 5 });
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
    expect(result[0]?.kind).toBe('booking');
  });

  it('create posts to /bookings', async () => {
    const { client, http } = setup();
    http.push({ status: 201, body: '/api/bookings/77.json' });
    const result = await client.appointments.create({
      scheduleId: 7,
      userId: 5,
      attributes: { start: '2026-04-28 09:00:00', finish: '2026-04-28 10:00:00' },
    });
    expect(result).toBe('/api/bookings/77.json');
    expect(http.calls[0]).toMatchObject({ method: 'POST', path: '/bookings' });
  });

  it('update puts to /bookings/:id', async () => {
    const { client, http } = setup();
    http.push({ body: { id: 77, schedule_id: 7, start: '2026-04-28 09:00:00', finish: '2026-04-28 10:00:00' } });
    await client.appointments.update({
      scheduleId: 7,
      appointmentId: 77,
      attributes: { start: '2026-04-28 09:00:00' },
    });
    expect(http.calls[0]).toMatchObject({ method: 'PUT', path: '/bookings/77' });
  });

  it('delete deletes /bookings/:id', async () => {
    const { client, http } = setup();
    http.push({ status: 204, body: null });
    await client.appointments.delete({ scheduleId: 7, appointmentId: 77 });
    expect(http.calls[0]).toMatchObject({ method: 'DELETE', path: '/bookings/77' });
  });

  it('handles slot+booking discriminated union response', async () => {
    const { client, http } = setup();
    http.push({
      body: {
        slots: [
          { id: 1, start: '2026-04-28 09:00:00', finish: '2026-04-28 10:00:00', bookings: [] },
        ],
      },
    });
    const result = await client.appointments.list({ scheduleId: 7 });
    expect(result[0]?.kind).toBe('slot');
  });
});
