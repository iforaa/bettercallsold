/**
 * Global Dashboard State - Svelte 5 Runes
 * Universal reactivity for dashboard data across the entire app
 */

import { DashboardService } from '../services/DashboardService.js';

// IMPORTANT: Use objects for automatic proxy reactivity
export const dashboardState = $state({
  // Stats data
  stats: {
    totalOrders: 0,
    totalCustomers: 0,
    totalRevenue: 0,
    pendingRevenue: 0,
    totalProducts: 0
  },
  
  // Recent orders
  recentOrders: [],
  
  // System health
  healthData: null,
  
  // Sales comparison
  salesComparison: [],
  
  // Loading states for different sections
  loading: {
    stats: false,
    orders: false,
    health: false,
    sales: false,
    dashboard: false  // Overall loading state
  },
  
  // Error states for different sections
  errors: {
    stats: '',
    orders: '',
    health: '',
    sales: '',
    dashboard: ''  // Overall error state
  },
  
  // Last fetch timestamp
  lastFetch: null
});

// Computed functions (can't export $derived from modules)
export function getDashboardMetrics() {
  const stats = dashboardState.stats;
  
  return [
    {
      key: 'orders',
      value: stats.totalOrders,
      label: 'TOTAL ORDERS',
      variant: 'accent'
    },
    {
      key: 'customers', 
      value: stats.totalCustomers,
      label: 'TOTAL CUSTOMERS',
      variant: 'error'
    },
    {
      key: 'revenue',
      value: stats.totalRevenue,
      label: 'TOTAL REVENUE 📈',
      variant: 'success',
      format: 'currency'
    },
    {
      key: 'pending',
      value: stats.pendingRevenue,
      label: 'PENDING REVENUE',
      variant: 'warning', 
      format: 'currency'
    }
  ];
}

export function getRecentOrdersDisplay() {
  return dashboardState.recentOrders.slice(0, 5);
}

export function hasCriticalErrors() {
  return DashboardService.shouldShowErrorState(dashboardState.errors);
}

export function isAnyLoading() {
  const loading = dashboardState.loading;
  return loading.dashboard || loading.stats || loading.orders;
}

// Actions for state management
export const dashboardActions = {
  async loadDashboard() {
    // Prevent multiple concurrent loads
    if (dashboardState.loading.dashboard) {
      console.log('Dashboard load already in progress, skipping');
      return;
    }
    
    dashboardState.loading.dashboard = true;
    dashboardState.errors.dashboard = '';
    
    // Set individual loading states
    dashboardState.loading.stats = true;
    dashboardState.loading.orders = true;
    dashboardState.loading.health = true;
    dashboardState.loading.sales = true;
    
    try {
      const result = await DashboardService.loadDashboardData();
      
      // Update state with results
      dashboardState.stats = result.stats;
      dashboardState.recentOrders = result.orders;
      dashboardState.healthData = result.health;
      dashboardState.salesComparison = result.salesComparison;
      
      // Update errors
      dashboardState.errors = {
        ...dashboardState.errors,
        ...result.errors
      };
      
      dashboardState.lastFetch = new Date();
      
      console.log('Dashboard data loaded successfully');
    } catch (error) {
      dashboardState.errors.dashboard = error.message;
      console.error('Failed to load dashboard:', error);
    } finally {
      // Clear all loading states
      dashboardState.loading = {
        stats: false,
        orders: false,
        health: false,
        sales: false,
        dashboard: false
      };
    }
  },

  async loadStats() {
    dashboardState.loading.stats = true;
    dashboardState.errors.stats = '';
    
    try {
      const stats = await DashboardService.getDashboardStats();
      dashboardState.stats = stats;
    } catch (error) {
      dashboardState.errors.stats = error.message;
      console.error('Failed to load stats:', error);
    } finally {
      dashboardState.loading.stats = false;
    }
  },

  async loadRecentOrders() {
    dashboardState.loading.orders = true;
    dashboardState.errors.orders = '';
    
    try {
      const orders = await DashboardService.getRecentOrders(5);
      dashboardState.recentOrders = orders;
    } catch (error) {
      dashboardState.errors.orders = error.message;
      console.error('Failed to load recent orders:', error);
    } finally {
      dashboardState.loading.orders = false;
    }
  },

  async loadHealthStatus() {
    dashboardState.loading.health = true;
    dashboardState.errors.health = '';
    
    try {
      const health = await DashboardService.getHealthStatus();
      dashboardState.healthData = health;
    } catch (error) {
      dashboardState.errors.health = error.message;
      console.error('Failed to load health status:', error);
    } finally {
      dashboardState.loading.health = false;
    }
  },

  clearErrors() {
    dashboardState.errors = {
      stats: '',
      orders: '',
      health: '',
      sales: '',
      dashboard: ''
    };
  },

  retry() {
    return this.loadDashboard();
  }
};