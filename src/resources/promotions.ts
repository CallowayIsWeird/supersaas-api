/**
 * Promotion / coupon code operations.
 *
 * @module
 */

import type { ClientContext } from '../client.js';
import { compact, validateNumber, validatePromotion } from '../validation.js';
import type { Promotion } from '../types/promotion.js';
import type { PaginationParams, RequestOptions } from '../types/common.js';

/**
 * Promotion / coupon code operations.
 *
 * @category Resources
 */
export class Promotions {
  constructor(private readonly ctx: ClientContext) {}

  /** List promotion codes. */
  async list(params: PaginationParams = {}, options?: RequestOptions): Promise<Promotion[]> {
    const query = compact({
      limit: params.limit !== undefined ? validateNumber(params.limit, 'limit') : null,
      offset: params.offset !== undefined ? validateNumber(params.offset, 'offset') : null,
    });
    const res = await this.ctx.http.request<Promotion[]>({
      method: 'GET',
      path: '/promotions',
      query,
      ...(options !== undefined ? { options } : {}),
    });
    return res.body;
  }

  /** Look up a single promotion by code. */
  async get(code: string, options?: RequestOptions): Promise<Promotion[]> {
    const res = await this.ctx.http.request<Promotion[]>({
      method: 'GET',
      path: '/promotions',
      query: { promotion_code: validatePromotion(code) },
      ...(options !== undefined ? { options } : {}),
    });
    return res.body;
  }

  /**
   * Create a new promotion code by duplicating an existing template code.
   */
  async duplicate(
    code: string,
    templateCode: string,
    options?: RequestOptions,
  ): Promise<Promotion | string> {
    const res = await this.ctx.http.request<Promotion | string>({
      method: 'POST',
      path: '/promotions',
      query: {
        id: validatePromotion(code),
        template_code: validatePromotion(templateCode),
      },
      ...(options !== undefined ? { options } : {}),
    });
    return res.body;
  }
}
