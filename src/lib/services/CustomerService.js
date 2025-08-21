/**
 * CustomerService - Stateless business logic for customer operations
 * Handles all customer-related API calls and data transformations
 */

import { CacheService } from './CacheService.js';
import { toastService } from './ToastService.js';
import { WaitlistService } from './WaitlistService.js';

export class CustomerService {
  // Cache TTLs
  static CACHE_TTL = {
    CUSTOMER: 300,        // 5 minutes - customer details
    CUSTOMERS_LIST: 180,  // 3 minutes - customers list
    CUSTOMER_ORDERS: 300, // 5 minutes - customer orders
    CUSTOMER_STATS: 240,  // 4 minutes - customer statistics
  };

  // Cache keys
  static getCacheKey = {
    customer: (id) => `customer:${id}`,
    customersList: (params = {}) => `customers:list:${JSON.stringify(params)}`,
    customerOrders: (id, params = {}) => `customer:${id}:orders:${JSON.stringify(params)}`,
    customerWaitlists: (id) => `customer:${id}:waitlists`,
    customerCart: (id) => `customer:${id}:cart`,
    customerCredits: (id) => `customer:${id}:credits`,
    customerStats: (id) => `customer:${id}:stats`,
  };

  /**
   * Get all customers with optional filtering and caching
   */
  static async getCustomers(params = {}) {
    const cacheKey = this.getCacheKey.customersList(params);
    
    try {
      // Try cache first
      const cached = await CacheService.getCached(cacheKey);
      if (cached) {
        return cached;
      }

      const searchParams = new URLSearchParams();
      
      if (params.page) searchParams.set('page', params.page.toString());
      if (params.limit) searchParams.set('limit', params.limit.toString());
      if (params.role && params.role !== 'all') searchParams.set('role', params.role);
      if (params.search) searchParams.set('search', params.search);
      if (params.status && params.status !== 'all') searchParams.set('status', params.status);
      
      const url = `/api/customers${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch customers: HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      // Cache the results
      await CacheService.setCache(cacheKey, data, this.CACHE_TTL.CUSTOMERS_LIST);
      
      return data;
    } catch (error) {
      console.error('CustomerService.getCustomers error:', error);
      throw error;
    }
  }

  /**
   * Get single customer by ID with caching
   */
  static async getCustomer(id) {
    if (!id) throw new Error('Customer ID is required');
    
    const cacheKey = this.getCacheKey.customer(id);
    
    try {
      // Try cache first
      const cached = await CacheService.getCached(cacheKey);
      if (cached) {
        return cached;
      }

      const response = await fetch(`/api/customers/${id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Customer not found');
        }
        throw new Error(`Failed to fetch customer: HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      // Cache the result
      await CacheService.setCache(cacheKey, data, this.CACHE_TTL.CUSTOMER);
      
      return data;
    } catch (error) {
      console.error('CustomerService.getCustomer error:', error);
      throw error;
    }
  }

  /**
   * Create new customer
   */
  static async createCustomer(customerData) {
    if (!customerData.name || !customerData.email) {
      throw new Error('Name and email are required');
    }

    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerData)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to create customer: HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      // Invalidate customers list cache
      await this.invalidateCustomersListCache();
      
      toastService.success('Customer created successfully');
      return data;
    } catch (error) {
      console.error('CustomerService.createCustomer error:', error);
      toastService.error(error.message || 'Failed to create customer');
      throw error;
    }
  }

  /**
   * Update customer by ID
   */
  static async updateCustomer(id, updates) {
    if (!id) throw new Error('Customer ID is required');
    
    try {
      const response = await fetch(`/api/customers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to update customer: HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      // Invalidate related caches
      await this.invalidateCustomerCache(id);
      
      toastService.success('Customer updated successfully');
      return data;
    } catch (error) {
      console.error('CustomerService.updateCustomer error:', error);
      toastService.error(error.message || 'Failed to update customer');
      throw error;
    }
  }

  /**
   * Delete customer by ID
   */
  static async deleteCustomer(id) {
    if (!id) throw new Error('Customer ID is required');
    
    try {
      const response = await fetch(`/api/customers/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to delete customer: HTTP ${response.status}`);
      }
      
      // Invalidate related caches
      await this.invalidateCustomerCache(id);
      
      toastService.success('Customer deleted successfully');
      return true;
    } catch (error) {
      console.error('CustomerService.deleteCustomer error:', error);
      toastService.error(error.message || 'Failed to delete customer');
      throw error;
    }
  }

  /**
   * Get customer orders
   */
  static async getCustomerOrders(customerId, params = {}) {
    if (!customerId) throw new Error('Customer ID is required');
    
    const cacheKey = this.getCacheKey.customerOrders(customerId, params);
    
    try {
      // Try cache first
      const cached = await CacheService.getCached(cacheKey);
      if (cached) {
        return cached;
      }

      const searchParams = new URLSearchParams();
      if (params.limit) searchParams.set('limit', params.limit.toString());
      if (params.status) searchParams.set('status', params.status);
      
      const url = `/api/customers/${customerId}/orders${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        // If orders endpoint fails (e.g., table doesn't exist), return empty array
        console.warn(`Orders endpoint failed with status ${response.status}, returning empty array`);
        const emptyData = [];
        await CacheService.setCache(cacheKey, emptyData, this.CACHE_TTL.CUSTOMER_ORDERS);
        return emptyData;
      }
      
      const data = await response.json();
      
      // Cache the results
      await CacheService.setCache(cacheKey, data, this.CACHE_TTL.CUSTOMER_ORDERS);
      
      return data;
    } catch (error) {
      console.error('CustomerService.getCustomerOrders error:', error);
      // Return empty array instead of throwing error
      const emptyData = [];
      await CacheService.setCache(cacheKey, emptyData, this.CACHE_TTL.CUSTOMER_ORDERS);
      return emptyData;
    }
  }

  /**
   * Get customer waitlists using WaitlistService
   */
  static async getCustomerWaitlists(customerId) {
    if (!customerId) throw new Error('Customer ID is required');
    
    const cacheKey = this.getCacheKey.customerWaitlists(customerId);
    
    try {
      // Try cache first
      const cached = await CacheService.getCached(cacheKey);
      if (cached) {
        return cached;
      }

      // Use WaitlistService to get waitlists for this specific user
      const customerWaitlists = await WaitlistService.getUserWaitlists(customerId);
      
      // Format the entries using WaitlistService
      const formattedWaitlists = customerWaitlists.map(waitlist => 
        WaitlistService.formatWaitlistEntry(waitlist)
      );
      
      // Cache the results
      await CacheService.setCache(cacheKey, formattedWaitlists, this.CACHE_TTL.CUSTOMER_ORDERS);
      
      return formattedWaitlists;
    } catch (error) {
      console.error('CustomerService.getCustomerWaitlists error:', error);
      // Return empty array instead of throwing error
      const emptyData = [];
      await CacheService.setCache(cacheKey, emptyData, this.CACHE_TTL.CUSTOMER_ORDERS);
      return emptyData;
    }
  }

  /**
   * Get customer cart items
   */
  static async getCustomerCart(customerId) {
    if (!customerId) throw new Error('Customer ID is required');
    
    const cacheKey = this.getCacheKey.customerCart(customerId);
    
    try {
      // Try cache first
      const cached = await CacheService.getCached(cacheKey);
      if (cached) {
        return cached;
      }

      const response = await fetch(`/api/customers/${customerId}/cart`);
      
      if (!response.ok) {
        // If cart endpoint fails (e.g., table doesn't exist), return empty array
        console.warn(`Cart endpoint failed with status ${response.status}, returning empty array`);
        const emptyData = [];
        await CacheService.setCache(cacheKey, emptyData, this.CACHE_TTL.CUSTOMER_ORDERS);
        return emptyData;
      }
      
      const data = await response.json();
      
      // Cache the results
      await CacheService.setCache(cacheKey, data, this.CACHE_TTL.CUSTOMER_ORDERS);
      
      return data;
    } catch (error) {
      console.error('CustomerService.getCustomerCart error:', error);
      // Return empty array instead of throwing error
      const emptyData = [];
      await CacheService.setCache(cacheKey, emptyData, this.CACHE_TTL.CUSTOMER_ORDERS);
      return emptyData;
    }
  }

  /**
   * Get customer credit balance and transactions
   */
  static async getCustomerCredits(customerId) {
    if (!customerId) throw new Error('Customer ID is required');
    
    const cacheKey = this.getCacheKey.customerCredits(customerId);
    
    try {
      // Try cache first
      const cached = await CacheService.getCached(cacheKey);
      if (cached) {
        return cached;
      }

      // Get credit balance
      const balanceResponse = await fetch(`/api/admin/credits/customers`);
      let creditBalance = { balance: 0, total_earned: 0, total_spent: 0 };
      
      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        if (balanceData.success) {
          const customerCredit = balanceData.customers.find(c => c.user_id === customerId);
          creditBalance = customerCredit || creditBalance;
        }
      }
      
      // Get transaction history
      let creditTransactions = [];
      const transactionsResponse = await fetch(`/api/admin/credits/transactions?user_id=${customerId}&limit=20`);
      
      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json();
        if (transactionsData.success) {
          creditTransactions = transactionsData.transactions;
        }
      }

      const data = {
        balance: creditBalance,
        transactions: creditTransactions
      };
      
      // Cache the results
      await CacheService.setCache(cacheKey, data, this.CACHE_TTL.CUSTOMER_ORDERS);
      
      return data;
    } catch (error) {
      console.error('CustomerService.getCustomerCredits error:', error);
      throw error;
    }
  }

  /**
   * Assign credits to customer
   */
  static async assignCredits(customerId, amount, description) {
    if (!customerId || !amount || !description) {
      throw new Error('Customer ID, amount, and description are required');
    }

    try {
      const response = await fetch('/api/admin/credits/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: customerId,
          amount: parseFloat(amount),
          description
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to assign credits: HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      // Invalidate customer and credits cache
      await this.invalidateCustomerCache(customerId);
      await CacheService.deleteCache(this.getCacheKey.customerCredits(customerId));
      
      toastService.success(`Credits assigned successfully`);
      return data;
    } catch (error) {
      console.error('CustomerService.assignCredits error:', error);
      toastService.error(error.message || 'Failed to assign credits');
      throw error;
    }
  }

  /**
   * Adjust customer credit balance
   */
  static async adjustCredits(customerId, amount, description, type = 'add') {
    if (!customerId || !amount || !description) {
      throw new Error('Customer ID, amount, and description are required');
    }

    try {
      const response = await fetch('/api/admin/credits/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: customerId,
          amount: type === 'add' ? parseFloat(amount) : -parseFloat(amount),
          description
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to adjust credits: HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      // Invalidate customer and credits cache
      await this.invalidateCustomerCache(customerId);
      await CacheService.deleteCache(this.getCacheKey.customerCredits(customerId));
      
      toastService.success(`Credits ${type === 'add' ? 'added' : 'deducted'} successfully`);
      return data;
    } catch (error) {
      console.error('CustomerService.adjustCredits error:', error);
      toastService.error(error.message || 'Failed to adjust credits');
      throw error;
    }
  }

  /**
   * Search customers
   */
  static async searchCustomers(query, params = {}) {
    return this.getCustomers({ ...params, search: query });
  }

  // === CACHE INVALIDATION METHODS ===

  /**
   * Invalidate all customer-related cache
   */
  static async invalidateCustomerCache(customerId) {
    await Promise.all([
      CacheService.deleteCache(this.getCacheKey.customer(customerId)),
      CacheService.deleteCache(this.getCacheKey.customerOrders(customerId)),
      CacheService.deleteCache(this.getCacheKey.customerWaitlists(customerId)),
      CacheService.deleteCache(this.getCacheKey.customerCart(customerId)),
      CacheService.deleteCache(this.getCacheKey.customerCredits(customerId)),
      CacheService.deleteCache(this.getCacheKey.customerStats(customerId)),
      this.invalidateCustomersListCache()
    ]);
  }

  /**
   * Invalidate customers list cache
   */
  static async invalidateCustomersListCache() {
    // Since we can't invalidate all variations of list cache, we'll clear common ones
    const commonParams = [
      {},
      { page: 1 },
      { page: 1, limit: 25 },
      { page: 1, limit: 50 },
      { role: 'customer' },
      { status: 'active' }
    ];

    await Promise.all(
      commonParams.map(params => 
        CacheService.deleteCache(this.getCacheKey.customersList(params))
      )
    );
  }

  // === UTILITY METHODS ===

  /**
   * Format customer data for display
   */
  static formatCustomerData(customer) {
    if (!customer) return null;

    return {
      ...customer,
      displayName: customer.name || 'Unknown Customer',
      displayEmail: customer.email || '',
      initials: this.getInitials(customer.name || ''),
      formattedCreatedAt: new Date(customer.created_at).toLocaleDateString(),
      formattedUpdatedAt: new Date(customer.updated_at).toLocaleDateString(),
      customerSince: this.getCustomerSince(customer.created_at)
    };
  }

  /**
   * Get customer initials for avatar
   */
  static getInitials(name) {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  /**
   * Calculate customer since duration
   */
  static getCustomerSince(createdAt) {
    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) {
      return `About ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `About ${months} month${months !== 1 ? 's' : ''}`;
    } else {
      const years = Math.floor(diffDays / 365);
      return `About ${years} year${years !== 1 ? 's' : ''}`;
    }
  }

  /**
   * Format currency
   */
  static formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  }
}