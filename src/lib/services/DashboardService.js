/**
 * DashboardService - Stateless business logic for dashboard operations
 * Handles all dashboard-related API calls and data transformations
 */

export class DashboardService {
  /**
   * Get dashboard statistics (orders, customers, revenue, products)
   */
  static async getDashboardStats() {
    const response = await fetch('/api/stats');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch dashboard stats: HTTP ${response.status}`);
    }
    
    const apiStats = await response.json();
    
    // Transform API response to consistent format
    return {
      totalOrders: apiStats.total_orders || 0,
      totalCustomers: apiStats.total_customers || 0,
      totalRevenue: apiStats.total_revenue || 0,
      pendingRevenue: apiStats.pending_revenue || 0,
      totalProducts: apiStats.total_products || 0
    };
  }

  /**
   * Get recent orders for dashboard display
   */
  static async getRecentOrders(limit = 5) {
    const response = await fetch(`/api/orders?limit=${limit}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch recent orders: HTTP ${response.status}`);
    }
    
    const orders = await response.json();
    
    // Ensure it's an array and limit the results
    return Array.isArray(orders) ? orders.slice(0, limit) : [];
  }

  /**
   * Get system health status
   */
  static async getHealthStatus() {
    try {
      const response = await fetch('/api/health');
      
      if (!response.ok) {
        return { message: 'Error', db_status: 'error' };
      }
      
      return await response.json();
    } catch (error) {
      console.warn('Health check failed:', error);
      return { message: 'Error', db_status: 'error' };
    }
  }

  /**
   * Get sales comparison data (weekly/monthly trends)
   * Now implemented with real data from orders table
   */
  static async getSalesComparison() {
    try {
      const response = await fetch('/api/sales-comparison');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch sales comparison: HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Sales comparison endpoint error:', error.message);
      
      // Return fallback data on error (maintains dashboard stability)
      return [
        { period: 'Last Week', revenue: 0, change: 0, changeAbsolute: 0, changePercentage: 0 },
        { period: 'Week-to-date', revenue: 0, change: 0, changeAbsolute: 0, changePercentage: 0 },
        { period: 'Week-to-date Last Year', revenue: 0, change: 0, changeAbsolute: 0, changePercentage: 0 },
        { period: 'This week Last year', revenue: 0, change: 0, changeAbsolute: 0, changePercentage: 0 }
      ];
    }
  }

  /**
   * Load all dashboard data in parallel
   * More efficient than individual calls
   */
  static async loadDashboardData() {
    const [statsResult, ordersResult, healthResult, salesResult] = await Promise.allSettled([
      this.getDashboardStats(),
      this.getRecentOrders(5),
      this.getHealthStatus(),
      this.getSalesComparison()
    ]);

    const result = {
      stats: null,
      orders: [],
      health: null,
      salesComparison: [],
      errors: {}
    };

    // Handle stats
    if (statsResult.status === 'fulfilled') {
      result.stats = statsResult.value;
    } else {
      result.errors.stats = statsResult.reason?.message || 'Failed to load stats';
      // Provide fallback stats
      result.stats = {
        totalOrders: 0,
        totalCustomers: 0, 
        totalRevenue: 0,
        pendingRevenue: 0,
        totalProducts: 0
      };
    }

    // Handle orders
    if (ordersResult.status === 'fulfilled') {
      result.orders = ordersResult.value;
    } else {
      result.errors.orders = ordersResult.reason?.message || 'Failed to load recent orders';
    }

    // Handle health (non-critical)
    if (healthResult.status === 'fulfilled') {
      result.health = healthResult.value;
    } else {
      result.health = { message: 'OK', db_status: 'connected' };
    }

    // Handle sales comparison (non-critical)
    if (salesResult.status === 'fulfilled') {
      result.salesComparison = salesResult.value;
    } else {
      // Use default empty data
      result.salesComparison = [
        { period: 'Last Week', revenue: 0, change: 0, changeAbsolute: 0, changePercentage: 0 },
        { period: 'Week-to-date', revenue: 0, change: 0, changeAbsolute: 0, changePercentage: 0 },
        { period: 'Week-to-date Last Year', revenue: 0, change: 0, changeAbsolute: 0, changePercentage: 0 },
        { period: 'This week Last year', revenue: 0, change: 0, changeAbsolute: 0, changePercentage: 0 }
      ];
    }

    return result;
  }

  /**
   * Business logic for determining critical vs non-critical errors
   */
  static isCriticalError(section) {
    // Stats and orders are critical, health and sales are not
    return ['stats', 'orders'].includes(section);
  }

  /**
   * Business logic for determining if dashboard should show error state
   */
  static shouldShowErrorState(errors) {
    // Show error state only if critical sections failed
    return errors.stats || errors.orders;
  }
}