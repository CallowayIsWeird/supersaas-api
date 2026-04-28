/**
 * Named constants for SuperSaaS magic values.
 *
 * The upstream client exposes these as bare numbers and strings, which is
 * brittle and undocumented. This module gives them names and types.
 *
 * @module
 */

/**
 * SuperSaaS user roles. The numeric values are dictated by SuperSaaS — do
 * not change them.
 *
 * @category Constants
 */
export const Role = {
  /** Standard registered customer. */
  Customer: 3,
  /** Account-level administrator. */
  Admin: 4,
  /** Restricted / blocked user. */
  Restricted: -1,
} as const;

/**
 * Numeric type of {@link Role} values.
 *
 * @category Constants
 */
export type Role = (typeof Role)[keyof typeof Role];

/**
 * Strategy for handling duplicate users when calling
 * {@link Users.create}.
 *
 * @category Constants
 */
export const Duplicate = {
  /** Silently ignore duplicate name/email collisions. */
  Ignore: 'ignore',
  /** Raise a {@link ValidationError} on duplicate. */
  Raise: 'raise',
} as const;

/**
 * String type of {@link Duplicate} values.
 *
 * @category Constants
 */
export type Duplicate = (typeof Duplicate)[keyof typeof Duplicate];

/**
 * Strategy for handling missing users when calling
 * {@link Users.update} with a user that doesn't exist.
 *
 * @category Constants
 */
export const NotFound = {
  /** Silently ignore — return without updating. */
  Ignore: 'ignore',
  /** Raise a {@link NotFoundError}. */
  Error: 'error',
} as const;

/**
 * String type of {@link NotFound} values.
 *
 * @category Constants
 */
export type NotFound = (typeof NotFound)[keyof typeof NotFound];

/**
 * Default SuperSaaS API host. Override via `SuperSaas` constructor for
 * testing or self-hosted deployments.
 *
 * @category Constants
 */
export const DEFAULT_HOST = 'https://www.supersaas.com';

/**
 * SuperSaaS REST API version this SDK targets.
 *
 * @category Constants
 */
export const API_VERSION = '3';
