/**
 * Dashboard-specific TypeScript interfaces
 */

export interface DashboardStats {
  totalOrders: number;
  totalCustomers: number;
  totalRevenue: number;
  pendingRevenue: number;
  totalProducts: number;
}

export interface DashboardMetric {
  key: string;
  value: number;
  label: string;
  variant: 'accent' | 'success' | 'warning' | 'error';
  format?: 'currency' | 'number';
}

export interface SalesComparisonItem {
  period: string;
  revenue: number;
  change: number;
}

export interface HealthStatus {
  message: string;
  db_status: string;
}

export interface DashboardData {
  stats: DashboardStats;
  orders: any[]; // Using Order[] from orders.ts would create circular dependency
  health: HealthStatus;
  salesComparison: SalesComparisonItem[];
  errors: Record<string, string>;
}

export interface DashboardLoadingState {
  stats: boolean;
  orders: boolean;
  health: boolean;
  sales: boolean;
  dashboard: boolean;
}

export interface DashboardErrorState {
  stats: string;
  orders: string;
  health: string;
  sales: string;
  dashboard: string;
}