import type { Form } from './form.js';

/**
 * A SuperSaaS user account.
 *
 * @category Models
 */
export interface User {
  id: number;
  name: string;
  email?: string;
  full_name?: string;
  address?: string;
  mobile?: string;
  phone?: string;
  country?: string;
  timezone?: string;
  field_1?: string;
  field_2?: string;
  super_field?: string;
  credit?: number;
  /** Numeric SuperSaaS role. See {@link Role} for named values. */
  role?: number;
  /** Group ID. */
  group?: number;
  /** Optional embedded form data, populated when `form: true` is passed. */
  form?: Form;
  /** ISO timestamp of last update. */
  updated_at?: string;
  /** ISO timestamp of creation. */
  created_at?: string;
}

/**
 * Attributes accepted when creating a user. `name` is required by SuperSaaS;
 * everything else is optional.
 *
 * @category Models
 */
export interface CreateUserAttributes {
  name: string;
  email?: string;
  password?: string;
  full_name?: string;
  address?: string;
  mobile?: string;
  phone?: string;
  country?: string;
  timezone?: string;
  field_1?: string;
  field_2?: string;
  super_field?: string;
  credit?: number;
  role?: number;
  group?: number;
}

/**
 * Attributes accepted when updating a user. All fields are optional —
 * only provided fields are updated.
 *
 * @category Models
 */
export type UpdateUserAttributes = Partial<CreateUserAttributes>;

/**
 * Custom field metadata for users.
 *
 * @category Models
 */
export interface FieldList {
  id: number;
  name: string;
  field_type?: string;
  required?: boolean;
  options?: string[];
}
