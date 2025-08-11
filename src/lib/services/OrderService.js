/**
 * OrderService - Stateless business logic for order operations
 * Pure API calls, data transformations, and business logic
 */

export class OrderService {
  static async getOrders(params = {}) {
    const searchParams = new URLSearchParams();
    
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.status && params.status !== 'all') searchParams.set('status', params.status);
    if (params.search) searchParams.set('q', params.search);
    
    const url = `/api/orders${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch orders: HTTP ${response.status}`);
    }
    
    return await response.json();
  }

  static async getOrder(id) {
    const response = await fetch(`/api/orders/${id}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch order: HTTP ${response.status}`);
    }
    
    return await response.json();
  }

  static async updateOrder(id, updates) {
    const response = await fetch(`/api/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update order: HTTP ${response.status}`);
    }
    
    return await response.json();
  }

  static async deleteOrder(id) {
    const response = await fetch(`/api/orders/${id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete order: HTTP ${response.status}`);
    }
    
    return true;
  }

  static async searchOrders(query) {
    const response = await fetch(`/api/orders/search?q=${encodeURIComponent(query)}`);
    
    if (!response.ok) {
      throw new Error(`Failed to search orders: HTTP ${response.status}`);
    }
    
    return await response.json();
  }

  /**
   * Business logic for status validation
   */
  static isValidStatus(status) {
    const validStatuses = ['pending', 'paid', 'processing', 'completed', 'cancelled'];
    return validStatuses.includes(status);
  }

  /**
   * Business logic for order calculations
   */
  static calculateOrderTotal(items) {
    return items.reduce((total, item) => total + (item.price * item.quantity), 0);
  }

  /**
   * Business logic for order status progression
   */
  static getNextValidStatuses(currentStatus) {
    const statusFlow = {
      pending: ['paid', 'cancelled'],
      paid: ['processing', 'cancelled'],
      processing: ['completed', 'cancelled'],
      completed: [],
      cancelled: []
    };
    return statusFlow[currentStatus] || [];
  }
}