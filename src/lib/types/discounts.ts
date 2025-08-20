/**
 * Discount-related types
 */

import type { BaseEntity } from './common';

export type DiscountStatus = 'enabled' | 'disabled' | 'expired' | 'scheduled';
export type DiscountMethod = 'code' | 'automatic';
export type DiscountValueType = 'percentage' | 'fixed_amount';
export type DiscountType = 'amount_off_order' | 'percentage_off_order' | 'buy_x_get_y' | 'free_shipping';
export type MinimumRequirementType = 'none' | 'minimum_amount' | 'minimum_quantity';
export type CustomerEligibility = 'all' | 'specific_segments' | 'specific_customers';

export interface DiscountFormData {
  title: string;
  description: string;
  discount_type: DiscountType;
  method: DiscountMethod;
  value_type: DiscountValueType;
  value: string;
  minimum_requirement_type: MinimumRequirementType;
  minimum_amount: string;
  minimum_quantity: string;
  usage_limit: string;
  usage_limit_per_customer: string;
  can_combine_with_product_discounts: boolean;
  can_combine_with_order_discounts: boolean;
  can_combine_with_shipping_discounts: boolean;
  customer_eligibility: CustomerEligibility;
  applies_to_subscription: boolean;
  applies_to_one_time: boolean;
  starts_at: string;
  start_time: string;
  ends_at: string;
  end_time: string;
  set_end_date: boolean;
  available_on_online_store: boolean;
  available_on_mobile_app: boolean;
  discount_code: string;
  status?: DiscountStatus;
}

export interface Discount extends BaseEntity {
  title: string;
  description: string | null;
  discount_type: DiscountType;
  method: DiscountMethod;
  value_type: DiscountValueType;
  value: number;
  minimum_requirement_type: MinimumRequirementType;
  minimum_amount: number | null;
  minimum_quantity: number | null;
  usage_limit: number | null;
  usage_limit_per_customer: number | null;
  can_combine_with_product_discounts: boolean;
  can_combine_with_order_discounts: boolean;
  can_combine_with_shipping_discounts: boolean;
  customer_eligibility: CustomerEligibility;
  applies_to_subscription: boolean;
  applies_to_one_time: boolean;
  starts_at: string;
  ends_at: string | null;
  available_on_online_store: boolean;
  available_on_mobile_app: boolean;
  discount_code: string | null;
  status: DiscountStatus;
  total_usage_count?: number;
  is_expired?: boolean;
}