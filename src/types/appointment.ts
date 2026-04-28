import type { Form } from './form.js';

/**
 * A confirmed booking on a SuperSaaS schedule.
 *
 * @category Models
 */
export interface Booking {
  id: number;
  schedule_id: number;
  user_id?: number;
  start: string;
  finish: string;
  email?: string;
  full_name?: string;
  address?: string;
  mobile?: string;
  phone?: string;
  country?: string;
  field_1?: string;
  field_2?: string;
  field_1_r?: string;
  field_2_r?: string;
  super_field?: string;
  resource_id?: number;
  slot_id?: number;
  /** Optional embedded form data, populated when `form: true` is passed. */
  form?: Form;
  /** ISO timestamp of creation. */
  created_at?: string;
  /** ISO timestamp of last update. */
  updated_at?: string;
}

/**
 * A bookable time slot on a capacity schedule. Slots may contain zero or
 * more bookings, depending on schedule type.
 *
 * @category Models
 */
export interface Slot {
  id?: number;
  schedule_id?: number;
  start: string;
  finish: string;
  resource_id?: number;
  service_id?: number;
  /** Bookings already attached to this slot. */
  bookings: Booking[];
}

/**
 * Discriminated union returned by endpoints that may return either bookings
 * or slots, depending on the schedule type and `slot` flag.
 *
 * @category Models
 */
export type AppointmentResult = { kind: 'booking'; data: Booking } | { kind: 'slot'; data: Slot };

/**
 * Booking attributes used when creating or updating a booking.
 *
 * @category Models
 */
export interface BookingAttributes {
  start: string;
  finish?: string;
  email?: string;
  full_name?: string;
  address?: string;
  mobile?: string;
  phone?: string;
  country?: string;
  field_1?: string;
  field_2?: string;
  field_1_r?: string;
  field_2_r?: string;
  super_field?: string;
  resource_id?: number;
  slot_id?: number;
}
