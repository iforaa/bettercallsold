/**
 * Order-related type definitions
 */

import type { BaseEntity, ShippingAddress } from './common';

export type OrderStatus = 'pending' | 'paid' | 'processing' | 'completed' | 'cancelled';

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_description?: string;
  product_images?: { url: string; alt?: string }[];
  quantity: number;
  price: number;
  variant_data?: {
    color?: string;
    size?: string;
    [key: string]: any;
  };
}

export interface Order extends BaseEntity {
  customer_id: string;
  customer_name: string;
  customer_email: string;
  status: OrderStatus;
  total_amount: number;
  payment_method: string;
  payment_id?: {
    Valid: boolean;
    String: string;
  };
  shipping_address?: ShippingAddress;
  items?: OrderItem[];
}

export interface OrderMetrics {
  totalOrders: number;
  totalRevenue: number;
  ordersByStatus: Record<OrderStatus, number>;
  averageOrderValue: number;
}