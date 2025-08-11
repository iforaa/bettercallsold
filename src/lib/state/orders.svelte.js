/**
 * Global Orders State - Svelte 5 Runes
 * Universal reactivity for order management across the entire app
 */

import { OrderService } from '../services/OrderService.js';

// IMPORTANT: Use objects for automatic proxy reactivity
export const ordersState = $state({
  // Orders list state
  orders: [],
  loading: false,
  error: '',
  lastFetch: null,
  
  // Single order state
  currentOrder: null,
  orderLoading: false,
  orderError: '',
  
  // UI state
  filters: {
    status: 'all',
    search: '',
    limit: 50
  }
});

// Computed values as functions (can't export $derived from modules)
export function getFilteredOrders() {
  if (!ordersState.orders) return [];
  
  return ordersState.orders.filter(order => {
    const matchesStatus = ordersState.filters.status === 'all' || 
                         order.status === ordersState.filters.status;
    const matchesSearch = !ordersState.filters.search ||
                         order.customer_name.toLowerCase().includes(ordersState.filters.search.toLowerCase()) ||
                         order.customer_email.toLowerCase().includes(ordersState.filters.search.toLowerCase()) ||
                         order.id.toLowerCase().includes(ordersState.filters.search.toLowerCase());
    return matchesStatus && matchesSearch;
  });
}

export function getOrderMetrics() {
  if (!ordersState.orders) return { total: 0, revenue: 0, statusCounts: {} };
  
  const statusCounts = ordersState.orders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {});
  
  const revenue = ordersState.orders.reduce((sum, order) => sum + order.total_amount, 0);
  
  return {
    total: ordersState.orders.length,
    revenue,
    statusCounts
  };
}

// Actions for state management
export const ordersActions = {
  async loadOrders(params) {
    ordersState.loading = true;
    ordersState.error = '';
    
    try {
      const orders = await OrderService.getOrders(params || ordersState.filters);
      ordersState.orders = orders;
      ordersState.lastFetch = new Date();
    } catch (error) {
      ordersState.error = error.message;
      console.error('Failed to load orders:', error);
    } finally {
      ordersState.loading = false;
    }
  },

  async loadOrder(id) {
    ordersState.orderLoading = true;
    ordersState.orderError = '';
    
    try {
      const order = await OrderService.getOrder(id);
      ordersState.currentOrder = order;
    } catch (error) {
      ordersState.orderError = error.message;
      console.error('Failed to load order:', error);
    } finally {
      ordersState.orderLoading = false;
    }
  },

  async updateOrder(id, updates) {
    try {
      const updatedOrder = await OrderService.updateOrder(id, updates);
      
      // Update current order if it's the one being edited
      if (ordersState.currentOrder?.id === id) {
        ordersState.currentOrder = updatedOrder;
      }
      
      // Update in orders list
      const index = ordersState.orders.findIndex(order => order.id === id);
      if (index !== -1) {
        ordersState.orders[index] = updatedOrder;
      }
      
      return updatedOrder;
    } catch (error) {
      ordersState.orderError = error.message;
      throw error;
    }
  },

  async deleteOrder(id) {
    try {
      await OrderService.deleteOrder(id);
      
      // Remove from current order if it's the one being deleted
      if (ordersState.currentOrder?.id === id) {
        ordersState.currentOrder = null;
      }
      
      // Remove from orders list
      ordersState.orders = ordersState.orders.filter(order => order.id !== id);
      
      return true;
    } catch (error) {
      ordersState.orderError = error.message;
      throw error;
    }
  },

  async searchOrders(query) {
    ordersState.loading = true;
    ordersState.error = '';
    
    try {
      const orders = await OrderService.searchOrders(query);
      ordersState.orders = orders;
      ordersState.lastFetch = new Date();
    } catch (error) {
      ordersState.error = error.message;
      console.error('Failed to search orders:', error);
    } finally {
      ordersState.loading = false;
    }
  },

  setFilter(key, value) {
    ordersState.filters[key] = value;
  },

  clearFilters() {
    ordersState.filters = {
      status: 'all',
      search: '',
      limit: 50
    };
  },

  clearCurrentOrder() {
    ordersState.currentOrder = null;
    ordersState.orderError = '';
  },

  retry() {
    if (ordersState.error) {
      return this.loadOrders();
    }
    if (ordersState.orderError && ordersState.currentOrder) {
      return this.loadOrder(ordersState.currentOrder.id);
    }
  }
};