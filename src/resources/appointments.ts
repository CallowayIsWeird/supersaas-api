/**
 * Booking and availability operations.
 *
 * @module
 */

import type { ClientContext } from '../client.js';
import { compact, formatDateTime, validateId, validateNumber, validateUser } from '../validation.js';
import type {
  AppointmentResult,
  Booking,
  BookingAttributes,
  Slot,
} from '../types/appointment.js';
import type { DateTimeInput, RequestOptions } from '../types/common.js';

/**
 * Parameters for {@link Appointments.list}.
 */
export interface ListAppointmentsParams {
  scheduleId: number;
  /** Include attached form data. */
  form?: boolean;
  start?: DateTimeInput;
  finish?: DateTimeInput;
  limit?: number;
}

/**
 * Parameters for {@link Appointments.range}.
 */
export interface RangeAppointmentsParams {
  scheduleId: number;
  today?: boolean;
  from?: DateTimeInput;
  to?: DateTimeInput;
  /** Return slots instead of bookings (for capacity schedules). */
  slot?: boolean;
  user?: number | string;
  resourceId?: number;
  serviceId?: number;
  limit?: number;
  offset?: number;
}

/**
 * Parameters for {@link Appointments.changes}.
 */
export interface ChangesAppointmentsParams {
  scheduleId: number;
  from?: DateTimeInput;
  to?: DateTimeInput;
  slot?: boolean;
  user?: number | string;
  limit?: number;
  offset?: number;
}

/**
 * Parameters for {@link Appointments.available}.
 */
export interface AvailableSlotsParams {
  scheduleId: number;
  from: DateTimeInput;
  /** Slot length in minutes. */
  lengthMinutes?: number;
  /** Resource ID to filter by. */
  resource?: number;
  /** If true, return full slot details; otherwise return start times only. */
  full?: boolean;
  limit?: number;
}

/**
 * Parameters for {@link Appointments.agenda}.
 */
export interface AgendaParams {
  scheduleId: number;
  user: number | string;
  from?: DateTimeInput;
  slot?: boolean;
}

/**
 * Parameters for {@link Appointments.create}.
 */
export interface CreateBookingParams {
  scheduleId: number;
  userId: number;
  attributes: BookingAttributes;
  /** Include attached form data in the response. */
  form?: boolean;
  /** Trigger SuperSaaS webhooks for this change. */
  webhook?: boolean;
}

/**
 * Parameters for {@link Appointments.update}.
 */
export interface UpdateBookingParams {
  scheduleId: number;
  appointmentId: number;
  attributes: BookingAttributes;
  form?: boolean;
  webhook?: boolean;
}

/**
 * Parameters for {@link Appointments.delete}.
 */
export interface DeleteBookingParams {
  scheduleId: number;
  appointmentId: number;
  webhook?: boolean;
}

/**
 * Booking operations on SuperSaaS schedules.
 *
 * @category Resources
 */
export class Appointments {
  constructor(private readonly ctx: ClientContext) {}

  /**
   * List bookings for a schedule.
   */
  async list(
    params: ListAppointmentsParams,
    options?: RequestOptions,
  ): Promise<AppointmentResult[]> {
    const query = compact({
      schedule_id: validateId(params.scheduleId, 'scheduleId'),
      form: params.form ? true : null,
      start: params.start ? formatDateTime(params.start, this.ctx.timezone) : null,
      finish: params.finish ? formatDateTime(params.finish, this.ctx.timezone) : null,
      limit: params.limit !== undefined ? validateNumber(params.limit, 'limit') : null,
    });
    const res = await this.ctx.http.request<unknown>({
      method: 'GET',
      path: '/bookings',
      query,
      ...(options !== undefined ? { options } : {}),
    });
    return mapAppointmentResults(res.body);
  }

  /**
   * Get a single booking by ID.
   */
  async get(
    params: { scheduleId: number; appointmentId: number },
    options?: RequestOptions,
  ): Promise<Booking> {
    const res = await this.ctx.http.request<Booking>({
      method: 'GET',
      path: `/bookings/${validateId(params.appointmentId, 'appointmentId')}`,
      query: { schedule_id: validateId(params.scheduleId, 'scheduleId') },
      ...(options !== undefined ? { options } : {}),
    });
    return res.body;
  }

  /**
   * Create a new booking.
   *
   * If `options.idempotencyKey` is set, the request becomes safe to retry
   * automatically; the same key submitted twice will not double-book.
   */
  async create(params: CreateBookingParams, options?: RequestOptions): Promise<string | Booking> {
    const body = {
      schedule_id: validateId(params.scheduleId, 'scheduleId'),
      user_id: validateId(params.userId, 'userId'),
      webhook: params.webhook ? true : undefined,
      form: params.form ? true : undefined,
      booking: compact(this.normalizeBookingAttrs(params.attributes)),
    };
    const res = await this.ctx.http.request<Booking | string>({
      method: 'POST',
      path: '/bookings',
      body,
      ...(options !== undefined ? { options } : {}),
    });
    return res.body;
  }

  /**
   * Update an existing booking.
   */
  async update(params: UpdateBookingParams, options?: RequestOptions): Promise<Booking> {
    const body = {
      schedule_id: validateId(params.scheduleId, 'scheduleId'),
      form: params.form ? true : undefined,
      booking: compact(this.normalizeBookingAttrs(params.attributes)),
    };
    const res = await this.ctx.http.request<Booking>({
      method: 'PUT',
      path: `/bookings/${validateId(params.appointmentId, 'appointmentId')}`,
      query: compact({ webhook: params.webhook ? true : null }),
      body,
      ...(options !== undefined ? { options } : {}),
    });
    return res.body;
  }

  /**
   * Cancel / delete a booking.
   */
  async delete(params: DeleteBookingParams, options?: RequestOptions): Promise<void> {
    await this.ctx.http.request<unknown>({
      method: 'DELETE',
      path: `/bookings/${validateId(params.appointmentId, 'appointmentId')}`,
      query: { schedule_id: validateId(params.scheduleId, 'scheduleId') },
      body: compact({ webhook: params.webhook ? true : null }),
      ...(options !== undefined ? { options } : {}),
    });
  }

  /**
   * Get a user's agenda — their upcoming bookings on a schedule.
   *
   * The upstream client wrapped the array result in a single
   * `Appointment.appointment(res)` which produced a malformed object. We
   * return the array directly.
   */
  async agenda(params: AgendaParams, options?: RequestOptions): Promise<AppointmentResult[]> {
    const query = compact({
      user: validateUser(params.user),
      from: params.from ? formatDateTime(params.from, this.ctx.timezone) : null,
      slot: params.slot ? true : null,
    });
    const res = await this.ctx.http.request<unknown>({
      method: 'GET',
      path: `/agenda/${validateId(params.scheduleId, 'scheduleId')}`,
      query,
      ...(options !== undefined ? { options } : {}),
    });
    return mapAppointmentResults(res.body);
  }

  /**
   * Find available slots on a schedule.
   */
  async available(params: AvailableSlotsParams, options?: RequestOptions): Promise<Slot[]> {
    const query = compact({
      from: formatDateTime(params.from, this.ctx.timezone),
      length: params.lengthMinutes !== undefined ? validateNumber(params.lengthMinutes, 'lengthMinutes') : null,
      resource: params.resource !== undefined ? validateId(params.resource, 'resource') : null,
      full: params.full ? true : null,
      maxresults: params.limit !== undefined ? validateNumber(params.limit, 'limit') : null,
    });
    const res = await this.ctx.http.request<unknown>({
      method: 'GET',
      path: `/free/${validateId(params.scheduleId, 'scheduleId')}`,
      query,
      ...(options !== undefined ? { options } : {}),
    });
    return mapAppointmentResults(res.body)
      .filter((r): r is { kind: 'slot'; data: Slot } => r.kind === 'slot')
      .map((r) => r.data);
  }

  /**
   * Get bookings within a date range.
   */
  async range(params: RangeAppointmentsParams, options?: RequestOptions): Promise<AppointmentResult[]> {
    const query = compact({
      today: params.today ? true : null,
      from: params.from ? formatDateTime(params.from, this.ctx.timezone) : null,
      to: params.to ? formatDateTime(params.to, this.ctx.timezone) : null,
      slot: params.slot ? true : null,
      user: params.user !== undefined ? validateUser(params.user) : null,
      resource_id: params.resourceId !== undefined ? validateId(params.resourceId, 'resourceId') : null,
      service_id: params.serviceId !== undefined ? validateId(params.serviceId, 'serviceId') : null,
      limit: params.limit !== undefined ? validateNumber(params.limit, 'limit') : null,
      offset: params.offset !== undefined ? validateNumber(params.offset, 'offset') : null,
    });
    const res = await this.ctx.http.request<unknown>({
      method: 'GET',
      path: `/range/${validateId(params.scheduleId, 'scheduleId')}`,
      query,
      ...(options !== undefined ? { options } : {}),
    });
    return mapAppointmentResults(res.body);
  }

  /**
   * Get recent changes to bookings on a schedule.
   */
  async changes(
    params: ChangesAppointmentsParams,
    options?: RequestOptions,
  ): Promise<AppointmentResult[]> {
    const query = compact({
      from: params.from ? formatDateTime(params.from, this.ctx.timezone) : null,
      to: params.to ? formatDateTime(params.to, this.ctx.timezone) : null,
      slot: params.slot ? true : null,
      user: params.user !== undefined ? validateUser(params.user) : null,
      limit: params.limit !== undefined ? validateNumber(params.limit, 'limit') : null,
      offset: params.offset !== undefined ? validateNumber(params.offset, 'offset') : null,
    });
    const res = await this.ctx.http.request<unknown>({
      method: 'GET',
      path: `/changes/${validateId(params.scheduleId, 'scheduleId')}`,
      query,
      ...(options !== undefined ? { options } : {}),
    });
    return mapAppointmentResults(res.body);
  }

  private normalizeBookingAttrs(attrs: BookingAttributes): Record<string, unknown> {
    return {
      start: attrs.start,
      finish: attrs.finish,
      email: attrs.email,
      full_name: attrs.full_name,
      address: attrs.address,
      mobile: attrs.mobile,
      phone: attrs.phone,
      country: attrs.country,
      field_1: attrs.field_1,
      field_2: attrs.field_2,
      field_1_r: attrs.field_1_r,
      field_2_r: attrs.field_2_r,
      super_field: attrs.super_field,
      resource_id: attrs.resource_id,
      slot_id: attrs.slot_id,
    };
  }
}

/**
 * Normalizes a SuperSaaS response into a discriminated union of bookings
 * vs slots. Replaces the upstream `mapSlotsOrBookings` helper which had
 * a confusing fallthrough chain.
 */
function mapAppointmentResults(body: unknown): AppointmentResult[] {
  if (!body) return [];
  if (Array.isArray(body)) {
    return body.map((item) => coerceAppointmentResult(item));
  }
  if (typeof body === 'object') {
    const obj = body as Record<string, unknown>;
    if (Array.isArray(obj['slots'])) {
      return (obj['slots'] as unknown[]).map((s) => ({ kind: 'slot' as const, data: s as Slot }));
    }
    if (Array.isArray(obj['bookings'])) {
      return (obj['bookings'] as unknown[]).map((b) => ({
        kind: 'booking' as const,
        data: b as Booking,
      }));
    }
  }
  return [];
}

function coerceAppointmentResult(item: unknown): AppointmentResult {
  if (item && typeof item === 'object' && 'bookings' in (item as object)) {
    return { kind: 'slot', data: item as Slot };
  }
  return { kind: 'booking', data: item as Booking };
}
