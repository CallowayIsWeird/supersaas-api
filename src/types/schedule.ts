/**
 * A SuperSaaS schedule (also called a calendar).
 *
 * @category Models
 */
export interface Schedule {
  id: number;
  name: string;
  /** Schedule type, e.g. `capacity`, `resource`, `service`. */
  type?: string;
  description?: string;
  timezone?: string;
  /** ISO timestamp of last update. */
  updated_at?: string;
  /** ISO timestamp of creation. */
  created_at?: string;
}

/**
 * A bookable resource attached to a schedule (e.g. a room, a staff member).
 *
 * @category Models
 */
export interface Resource {
  id: number;
  schedule_id?: number;
  name: string;
  description?: string;
  capacity?: number;
}
