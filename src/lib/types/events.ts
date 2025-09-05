/**
 * Advanced TypeScript Event System
 * 
 * Type-safe, scalable event payload factory with compile-time validation,
 * runtime checks, and seamless integration with the existing plugin system.
 */

import { PLUGIN_EVENTS } from '../constants.js';

// ============================================================================
// CORE EVENT TYPES AND INTERFACES
// ============================================================================

/**
 * Base metadata that all events include
 */
export interface EventMetadata {
  readonly schema_version: string;
  readonly generated_at: string;
  readonly tenant_id: string;
  readonly source: 'bettercallsold_api' | 'mobile_app' | 'webhook' | 'system';
}

/**
 * Brand type for event names to ensure type safety
 */
export type EventName = keyof typeof PLUGIN_EVENTS;

/**
 * Extract event names as literal types
 */
export type EventType = typeof PLUGIN_EVENTS[EventName];

// ============================================================================
// EVENT PAYLOAD INTERFACES
// ============================================================================

/**
 * Product Events
 */
export interface ProductCreatedPayload {
  product_id: string;
  name: string;
  description: string;
  price: number;
  status: 'active' | 'draft' | 'archived';
  images: string[];
  tags: string[];
  collections: string[];
  created_at: string;
  inventory_count?: number;
  vendor?: string;
}

export interface ProductUpdatedPayload extends Omit<ProductCreatedPayload, 'created_at'> {
  updated_at: string;
  previous_values?: Partial<Pick<ProductCreatedPayload, 'name' | 'price' | 'status'>>;
}

export interface ProductDeletedPayload {
  product_id: string;
  name: string;
  deleted_at: string;
  deletion_reason?: 'user_requested' | 'system_cleanup' | 'policy_violation';
}

/**
 * Order Events
 */
export interface OrderCreatedPayload {
  order_id: string;
  user_id: string;
  status: 'processing' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  total_amount: number;
  subtotal_amount: number;
  tax_amount: number;
  shipping_amount: number;
  item_count: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: ShippingAddress;
  payment_method: string;
  created_at: string;
  items: OrderItemSummary[];
}

export interface OrderPaidPayload extends Pick<OrderCreatedPayload, 
  'order_id' | 'user_id' | 'total_amount' | 'customer_email' | 'customer_name'
> {
  payment_provider: string;
  payment_id: string;
  payment_method: string;
  paid_at: string;
  transaction_id?: string;
  receipt_url?: string;
}

export interface OrderShippedPayload extends Pick<OrderCreatedPayload,
  'order_id' | 'customer_email' | 'customer_name' | 'shipping_address'
> {
  tracking_number?: string;
  carrier: string;
  estimated_delivery?: string;
  shipped_at: string;
  shipped_items: Array<{
    product_id: string;
    quantity: number;
    name: string;
  }>;
}

export interface OrderDeliveredPayload extends Pick<OrderShippedPayload,
  'order_id' | 'customer_email' | 'tracking_number'
> {
  delivered_at: string;
  delivery_method: 'carrier' | 'pickup' | 'digital';
  signature_required: boolean;
}

export interface OrderCancelledPayload extends Pick<OrderCreatedPayload,
  'order_id' | 'user_id' | 'total_amount' | 'customer_email'
> {
  cancelled_at: string;
  cancellation_reason: 'customer_request' | 'payment_failed' | 'out_of_stock' | 'fraud' | 'other';
  refund_amount?: number;
  refund_status?: 'pending' | 'completed' | 'failed';
}

/**
 * Customer Events
 */
export interface CustomerCreatedPayload {
  customer_id: string;
  name: string;
  email: string;
  phone?: string;
  created_at: string;
  registration_source: 'checkout' | 'account_creation' | 'social_login' | 'import';
  location?: {
    city?: string;
    state?: string;
    country?: string;
  };
}

export interface CustomerUpdatedPayload extends CustomerCreatedPayload {
  updated_at: string;
  updated_fields: Array<keyof Omit<CustomerCreatedPayload, 'customer_id' | 'created_at'>>;
}

/**
 * Cart Events
 */
export interface CartItemAddedPayload {
  cart_id: string;
  product_id: string;
  product_name: string;
  inventory_id: string;
  user_id: string;
  quantity: number;
  size: string;
  color: string;
  price: number;
  available_quantity: number;
  added_at: string;
}

export interface CartItemRemovedPayload extends Pick<CartItemAddedPayload,
  'cart_id' | 'product_id' | 'product_name' | 'user_id' | 'quantity'
> {
  removed_at: string;
  removal_reason: 'user_action' | 'out_of_stock' | 'cart_cleanup' | 'checkout';
}

export interface CartItemUpdatedPayload extends CartItemAddedPayload {
  updated_at: string;
  previous_quantity: number;
}

export interface CartClearedPayload {
  cart_id: string;
  user_id: string;
  items_count: number;
  total_value: number;
  cleared_at: string;
  clear_reason: 'checkout_completed' | 'user_action' | 'session_expired' | 'system_cleanup';
}

/**
 * Waitlist Events
 */
export interface WaitlistItemAddedPayload {
  waitlist_id: string;
  product_id: string;
  product_name: string;
  user_id: string;
  user_email: string;
  size?: string;
  color?: string;
  notify_when_available: boolean;
  added_at: string;
}

export interface WaitlistItemRemovedPayload extends Pick<WaitlistItemAddedPayload,
  'waitlist_id' | 'product_id' | 'user_id' | 'user_email'
> {
  removed_at: string;
  removal_reason: 'user_action' | 'item_purchased' | 'item_discontinued' | 'expired';
}

export interface WaitlistItemPreauthorizedPayload extends WaitlistItemAddedPayload {
  preauth_amount: number;
  preauth_expires_at: string;
  payment_method_id: string;
  preauthorized_at: string;
}

/**
 * Checkout Events
 */
export interface CheckoutStartedPayload {
  checkout_id: string;
  user_id: string;
  items_count: number;
  total_amount: number;
  customer_email?: string;
  started_at: string;
  source: 'web' | 'mobile' | 'social';
}

export interface CheckoutCompletedPayload extends CheckoutStartedPayload {
  order_id: string;
  payment_provider: string;
  payment_id: string;
  payment_method: string;
  customer_name: string;
  customer_phone: string;
  processing_time_ms: number;
  completed_at: string;
}

export interface CheckoutFailedPayload extends CheckoutStartedPayload {
  error_type: string;
  error_message: string;
  failure_stage: 'validation' | 'payment' | 'inventory' | 'order_creation';
  failed_at: string;
}

/**
 * Favorites Events
 */
export interface FavoriteAddedPayload {
  favorite_id: string;
  product_id: string;
  product_name: string;
  user_id: string;
  added_at: string;
}

export interface FavoriteRemovedPayload extends Omit<FavoriteAddedPayload, 'added_at'> {
  removed_at: string;
}

/**
 * Search Events
 */
export interface SearchPerformedPayload {
  search_id: string;
  query: string;
  user_id?: string;
  results_count: number;
  search_time_ms: number;
  filters_applied?: Record<string, any>;
  performed_at: string;
}

export interface SearchNoResultsPayload extends Omit<SearchPerformedPayload, 'results_count'> {
  suggestions?: string[];
}

/**
 * Inventory Events
 */
export interface InventoryLowPayload {
  inventory_id: string;
  product_id: string;
  product_name: string;
  current_quantity: number;
  threshold_quantity: number;
  location_id?: string;
  detected_at: string;
}

export interface InventoryOutPayload extends Omit<InventoryLowPayload, 'current_quantity' | 'threshold_quantity'> {
  last_available_at: string;
}

export interface InventoryUpdatedPayload {
  inventory_id: string;
  product_id: string;
  product_name: string;
  previous_quantity: number;
  new_quantity: number;
  change_reason: 'sale' | 'restock' | 'adjustment' | 'return' | 'damaged';
  updated_at: string;
}

// ============================================================================
// HELPER TYPES
// ============================================================================

export interface ShippingAddress {
  name: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone?: string;
}

export interface OrderItemSummary {
  product_id: string;
  name: string;
  quantity: number;
  price: number;
  variant_data?: Record<string, any>;
}

// ============================================================================
// EVENT PAYLOAD MAPPING
// ============================================================================

/**
 * Complete mapping of event types to their payload interfaces
 */
export interface EventPayloadMap {
  'product.created': ProductCreatedPayload;
  'product.updated': ProductUpdatedPayload;
  'product.deleted': ProductDeletedPayload;
  
  'order.created': OrderCreatedPayload;
  'order.paid': OrderPaidPayload;
  'order.shipped': OrderShippedPayload;
  'order.delivered': OrderDeliveredPayload;
  'order.cancelled': OrderCancelledPayload;
  
  'customer.created': CustomerCreatedPayload;
  'customer.updated': CustomerUpdatedPayload;
  
  'cart.item_added': CartItemAddedPayload;
  'cart.item_removed': CartItemRemovedPayload;
  'cart.item_updated': CartItemUpdatedPayload;
  'cart.cleared': CartClearedPayload;
  
  'waitlist.item_added': WaitlistItemAddedPayload;
  'waitlist.item_removed': WaitlistItemRemovedPayload;
  'waitlist.item_preauthorized': WaitlistItemPreauthorizedPayload;
  
  'checkout.started': CheckoutStartedPayload;
  'checkout.completed': CheckoutCompletedPayload;
  'checkout.failed': CheckoutFailedPayload;
  
  'favorite.added': FavoriteAddedPayload;
  'favorite.removed': FavoriteRemovedPayload;
  
  'search.performed': SearchPerformedPayload;
  'search.no_results': SearchNoResultsPayload;
  
  'inventory.low': InventoryLowPayload;
  'inventory.out': InventoryOutPayload;
  'inventory.updated': InventoryUpdatedPayload;
}

/**
 * Utility type to get payload type for specific event
 */
export type EventPayload<T extends keyof EventPayloadMap> = EventPayloadMap[T];

/**
 * Final event structure that includes metadata
 */
export type EventWithMetadata<T extends keyof EventPayloadMap> = EventPayloadMap[T] & {
  _meta: EventMetadata;
};