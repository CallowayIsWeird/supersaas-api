/**
 * Schedule discovery — list schedules, list resources for a schedule,
 * fetch field list metadata.
 *
 * @module
 */

import type { ClientContext } from '../client.js';
import { validateId } from '../validation.js';
import type { Resource, Schedule } from '../types/schedule.js';
import type { FieldList } from '../types/user.js';
import type { RequestOptions } from '../types/common.js';

/**
 * Schedule and resource discovery.
 *
 * @category Resources
 */
export class Schedules {
  constructor(private readonly ctx: ClientContext) {}

  /** List all schedules in the account. */
  async list(options?: RequestOptions): Promise<Schedule[]> {
    const res = await this.ctx.http.request<Schedule[]>({
      method: 'GET',
      path: '/schedules',
      ...(options !== undefined ? { options } : {}),
    });
    return res.body;
  }

  /** List the resources (rooms, staff, etc.) attached to a schedule. */
  async resources(scheduleId: number, options?: RequestOptions): Promise<Resource[]> {
    const res = await this.ctx.http.request<Resource[]>({
      method: 'GET',
      path: '/resources',
      query: { schedule_id: validateId(scheduleId, 'scheduleId') },
      ...(options !== undefined ? { options } : {}),
    });
    return res.body;
  }

  /** Get the custom-field schema for a schedule. */
  async fieldList(scheduleId: number, options?: RequestOptions): Promise<FieldList[]> {
    const res = await this.ctx.http.request<FieldList[]>({
      method: 'GET',
      path: '/field_list',
      query: { schedule_id: validateId(scheduleId, 'scheduleId') },
      ...(options !== undefined ? { options } : {}),
    });
    return res.body;
  }
}
