/**
 * A SuperSaaS promotion / coupon code.
 *
 * @category Models
 */
export interface Promotion {
  id: number;
  /** The promotion code itself (alphanumeric). */
  code: string;
  /** Discount percent (0–100). */
  discount_percent?: number;
  /** Discount amount in account currency. */
  discount_amount?: number;
  /** Maximum number of times this code can be used. */
  max_uses?: number;
  /** Number of times this code has been redeemed. */
  uses?: number;
  /** ISO timestamp this code expires. */
  expires_at?: string;
  /** ISO timestamp of creation. */
  created_at?: string;
}
