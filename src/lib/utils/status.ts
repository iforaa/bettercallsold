/**
 * Status-related utilities
 */

import type { OrderStatus } from '$lib/types/orders';
import type { WaitlistStatus, OrderSource } from '$lib/types/waitlists';
import type { ProductStatus } from '$lib/types/products';

export const STATUS_COLORS = {
  // Orders
  pending: 'warning',
  paid: 'success', 
  processing: 'accent',
  completed: 'success',
  cancelled: 'error',
  // Waitlists
  authorized: 'success',
  // Customers
  active: 'success',
  inactive: 'error',
  // Products
  draft: 'warning',
  published: 'success',
  archived: 'error',
  // Collections
  visible: 'success',
  hidden: 'warning',
  // Generic
  default: 'secondary'
} as const;

export const getStatusColor = (status: string): string => 
  STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS.default;

export const getOrderStatusDisplay = (status: OrderStatus): string => {
  const displays: Record<OrderStatus, string> = {
    pending: 'Pending',
    paid: 'Paid',
    processing: 'Processing',
    completed: 'Completed',
    cancelled: 'Cancelled'
  };
  return displays[status];
};

// =====================================
// Waitlist-specific utilities
// =====================================

export const WAITLIST_STATUS_COLORS = {
  pending: 'warning',
  authorized: 'success'
} as const;

export const ORDER_SOURCES = {
  1: { label: 'Instagram', color: 'blue' },
  2: { label: 'Facebook', color: 'purple' },
  3: { label: 'Website', color: 'green' },
  4: { label: 'TikTok', color: 'orange' }
} as const;

export const getWaitlistStatusColor = (status: WaitlistStatus): string => 
  WAITLIST_STATUS_COLORS[status] || STATUS_COLORS.default;

export const getWaitlistStatusDisplay = (status: WaitlistStatus): string => {
  const displays: Record<WaitlistStatus, string> = {
    pending: 'Pending',
    authorized: 'Authorized'
  };
  return displays[status];
};

export const getOrderSourceInfo = (source: OrderSource) => {
  return ORDER_SOURCES[source] || { label: 'Other', color: 'gray' };
};

export const getOrderSourceLabel = (source: OrderSource): string => {
  return getOrderSourceInfo(source).label;
};

export const getOrderSourceColor = (source: OrderSource): string => {
  return getOrderSourceInfo(source).color;
};

// =====================================
// Product-specific utilities
// =====================================

export const PRODUCT_STATUS_COLORS = {
  active: 'success',
  draft: 'warning', 
  archived: 'error'
} as const;

export const INVENTORY_STATUS_COLORS = {
  'in-stock': 'success',
  'low-stock': 'warning',
  'out-of-stock': 'error'
} as const;

export const getProductStatusColor = (status: ProductStatus): string => 
  PRODUCT_STATUS_COLORS[status] || STATUS_COLORS.default;

export const getProductStatusDisplay = (status: ProductStatus): string => {
  const displays: Record<ProductStatus, string> = {
    active: 'Active',
    draft: 'Draft',
    archived: 'Archived'
  };
  return displays[status];
};

export const getInventoryStatusInfo = (count: number) => {
  if (count === 0) {
    return { 
      label: 'Out of Stock', 
      class: 'out-of-stock',
      variant: 'error' as const
    };
  }
  if (count < 10) {
    return { 
      label: 'Low Stock', 
      class: 'low-stock',
      variant: 'warning' as const
    };
  }
  return { 
    label: 'In Stock', 
    class: 'in-stock',
    variant: 'success' as const
  };
};