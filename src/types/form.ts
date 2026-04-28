/**
 * A SuperSaaS custom form attached to a user or booking.
 *
 * @category Models
 */
export interface Form {
  id: number;
  /** ID of the parent {@link SuperForm}. */
  super_form_id?: number;
  user_id?: number;
  appointment_id?: number;
  /** Form field values, keyed by field name. */
  fields: Record<string, unknown>;
  /** ISO timestamp of last update. */
  updated_at?: string;
  /** ISO timestamp of creation. */
  created_at?: string;
}

/**
 * A SuperSaaS form template definition.
 *
 * @category Models
 */
export interface SuperForm {
  id: number;
  name: string;
  description?: string;
  /** Field definitions for this form template. */
  fields?: SuperFormField[];
}

/**
 * A field definition within a {@link SuperForm}.
 *
 * @category Models
 */
export interface SuperFormField {
  name: string;
  field_type: string;
  required?: boolean;
  options?: string[];
  default?: unknown;
}
