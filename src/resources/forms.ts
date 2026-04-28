/**
 * Custom form retrieval.
 *
 * @module
 */

import type { ClientContext } from '../client.js';
import { compact, formatDateTime, validateId, validateNumber, validateUser } from '../validation.js';
import type { Form, SuperForm } from '../types/form.js';
import type { DateTimeInput, RequestOptions } from '../types/common.js';

/** Parameters for {@link Forms.list}. */
export interface ListFormsParams {
  formId: number;
  from?: DateTimeInput;
  user?: number | string;
  limit?: number;
  offset?: number;
}

/**
 * Custom form operations.
 *
 * @category Resources
 */
export class Forms {
  constructor(private readonly ctx: ClientContext) {}

  /** List form submissions for a given form template. */
  async list(params: ListFormsParams, options?: RequestOptions): Promise<Form[]> {
    const query = compact({
      form_id: validateId(params.formId, 'formId'),
      from: params.from ? formatDateTime(params.from, this.ctx.timezone) : null,
      user: params.user !== undefined ? validateUser(params.user) : null,
      limit: params.limit !== undefined ? validateNumber(params.limit, 'limit') : null,
      offset: params.offset !== undefined ? validateNumber(params.offset, 'offset') : null,
    });
    const res = await this.ctx.http.request<Form[]>({
      method: 'GET',
      path: '/forms',
      query,
      ...(options !== undefined ? { options } : {}),
    });
    return res.body;
  }

  /** Get a single form submission by ID. */
  async get(formId: number, options?: RequestOptions): Promise<Form> {
    const res = await this.ctx.http.request<Form>({
      method: 'GET',
      path: '/forms',
      query: { id: validateId(formId, 'formId') },
      ...(options !== undefined ? { options } : {}),
    });
    return res.body;
  }

  /** List all form templates ("super forms") in the account. */
  async templates(options?: RequestOptions): Promise<SuperForm[]> {
    const res = await this.ctx.http.request<SuperForm[]>({
      method: 'GET',
      path: '/super_forms',
      ...(options !== undefined ? { options } : {}),
    });
    return res.body;
  }
}
