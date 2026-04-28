/**
 * User group operations.
 *
 * @module
 */

import type { ClientContext } from '../client.js';
import type { Group } from '../types/group.js';
import type { RequestOptions } from '../types/common.js';

/**
 * User group operations.
 *
 * @category Resources
 */
export class Groups {
  constructor(private readonly ctx: ClientContext) {}

  /** List all user groups. */
  async list(options?: RequestOptions): Promise<Group[]> {
    const res = await this.ctx.http.request<Group[] | Group>({
      method: 'GET',
      path: '/groups',
      ...(options !== undefined ? { options } : {}),
    });
    return Array.isArray(res.body) ? res.body : [res.body];
  }
}
