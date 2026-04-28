/**
 * User operations including the SSO bridge methods that make SuperSaaS
 * usable as an auth backend for a custom frontend.
 *
 * @module
 */

import type { ClientContext } from '../client.js';
import { Duplicate, NotFound, Role } from '../constants.js';
import {
  compact,
  validateId,
  validateNumber,
  validateOption,
  validatePresent,
} from '../validation.js';
import { paginate } from '../pagination.js';
import type { IteratePaginationParams, PaginationParams, RequestOptions } from '../types/common.js';
import type {
  CreateUserAttributes,
  FieldList,
  UpdateUserAttributes,
  User,
} from '../types/user.js';

/** Parameters for {@link Users.list}. */
export interface ListUsersParams extends PaginationParams {
  /** Include attached form data. */
  form?: boolean;
}

/** Parameters for {@link Users.get}. */
export interface GetUserParams {
  userId: number;
  form?: boolean;
}

/** Parameters for {@link Users.create}. */
export interface CreateUserParams {
  attributes: CreateUserAttributes;
  /** Force-create at a specific user ID (admin-only). */
  userId?: number;
  /** Trigger SuperSaaS webhooks for this change. */
  webhook?: boolean;
  /** Strategy when name/email already exists. */
  duplicate?: Duplicate;
}

/** Parameters for {@link Users.update}. */
export interface UpdateUserParams {
  userId: number;
  attributes: UpdateUserAttributes;
  webhook?: boolean;
  /** Strategy when the user does not exist. */
  notFound?: NotFound;
}

/** Parameters for {@link Users.delete}. */
export interface DeleteUserParams {
  userId: number;
  webhook?: boolean;
}

/**
 * User operations.
 *
 * @category Resources
 */
export class Users {
  constructor(private readonly ctx: ClientContext) {}

  /** List users. */
  async list(params: ListUsersParams = {}, options?: RequestOptions): Promise<User[]> {
    const query = compact({
      form: params.form ? true : null,
      limit: params.limit !== undefined ? validateNumber(params.limit, 'limit') : null,
      offset: params.offset !== undefined ? validateNumber(params.offset, 'offset') : null,
    });
    const res = await this.ctx.http.request<User[]>({
      method: 'GET',
      path: '/users',
      query,
      ...(options !== undefined ? { options } : {}),
    });
    return res.body;
  }

  /**
   * Async iterator over all users. Pages automatically.
   *
   * @example
   * ```ts
   * for await (const user of client.users.iterate()) {
   *   console.log(user.email);
   * }
   * ```
   */
  iterate(
    params: IteratePaginationParams & { form?: boolean } = {},
    options?: RequestOptions,
  ): AsyncGenerator<User, void, void> {
    return paginate(
      ({ limit, offset }) =>
        this.list(
          {
            limit,
            offset,
            ...(params.form !== undefined ? { form: params.form } : {}),
          },
          options,
        ),
      params,
    );
  }

  /** Get a user by ID. */
  async get(params: GetUserParams, options?: RequestOptions): Promise<User> {
    const res = await this.ctx.http.request<User>({
      method: 'GET',
      path: `/users/${validateId(params.userId, 'userId')}`,
      query: compact({ form: params.form ? true : null }),
      ...(options !== undefined ? { options } : {}),
    });
    return res.body;
  }

  /**
   * Create a new user.
   *
   * Returns the new user resource location string when SuperSaaS responds
   * 201 with a `Location` header. Use {@link get} to fetch the full user.
   */
  async create(params: CreateUserParams, options?: RequestOptions): Promise<string | User> {
    const query = compact({
      webhook: params.webhook ? true : null,
      duplicate: params.duplicate
        ? validateOption(params.duplicate, [Duplicate.Ignore, Duplicate.Raise])
        : null,
    });
    const body = {
      user: compact({
        ...this.normalizeUserAttrs(params.attributes),
        name: validatePresent(params.attributes.name, 'name'),
      }),
    };
    const path =
      params.userId !== undefined ? `/users/${validateId(params.userId, 'userId')}` : '/users';
    const res = await this.ctx.http.request<User | string>({
      method: 'POST',
      path,
      query,
      body,
      ...(options !== undefined ? { options } : {}),
    });
    return res.body;
  }

  /** Update an existing user. */
  async update(params: UpdateUserParams, options?: RequestOptions): Promise<User> {
    const query = compact({
      webhook: params.webhook ? true : null,
      notfound: params.notFound
        ? validateOption(params.notFound, [NotFound.Ignore, NotFound.Error])
        : null,
    });
    const body = {
      user: compact(this.normalizeUserAttrs(params.attributes)),
    };
    const res = await this.ctx.http.request<User>({
      method: 'PUT',
      path: `/users/${validateId(params.userId, 'userId')}`,
      query,
      body,
      ...(options !== undefined ? { options } : {}),
    });
    return res.body;
  }

  /** Delete a user. */
  async delete(params: DeleteUserParams, options?: RequestOptions): Promise<void> {
    await this.ctx.http.request<unknown>({
      method: 'DELETE',
      path: `/users/${validateId(params.userId, 'userId')}`,
      body: compact({ webhook: params.webhook ? true : null }),
      ...(options !== undefined ? { options } : {}),
    });
  }

  /** Get the field list / schema for users. */
  async fieldList(options?: RequestOptions): Promise<FieldList[]> {
    const res = await this.ctx.http.request<FieldList[]>({
      method: 'GET',
      path: '/field_list',
      ...(options !== undefined ? { options } : {}),
    });
    return res.body;
  }

  private normalizeUserAttrs(
    attrs: CreateUserAttributes | UpdateUserAttributes,
  ): Record<string, unknown> {
    const out: Record<string, unknown> = {
      name: attrs.name,
      email: attrs.email,
      password: attrs.password,
      full_name: attrs.full_name,
      address: attrs.address,
      mobile: attrs.mobile,
      phone: attrs.phone,
      country: attrs.country,
      timezone: attrs.timezone,
      field_1: attrs.field_1,
      field_2: attrs.field_2,
      super_field: attrs.super_field,
    };
    if (attrs.credit !== undefined) {
      out['credit'] = validateNumber(attrs.credit, 'credit');
    }
    if (attrs.role !== undefined) {
      out['role'] = validateOption(attrs.role, [Role.Customer, Role.Admin, Role.Restricted]);
    }
    if (attrs.group !== undefined) {
      out['group'] = validateNumber(attrs.group, 'group');
    }
    return out;
  }
}
