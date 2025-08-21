/**
 * SearchService - Unified global search across all entities
 * Combines search capabilities from ProductService, OrderService, CustomerService
 */

import { ProductService } from './ProductService.js';
import { OrderService } from './OrderService.js';
import { CustomerService } from './CustomerService.js';
import { CacheService } from './CacheService.js';

export class SearchService {
  // Cache TTLs
  static CACHE_TTL = {
    SEARCH_RESULTS: 60, // 1 minute - search results are short-lived
    SUGGESTIONS: 120,   // 2 minutes - search suggestions
  };

  // Search result types
  static RESULT_TYPES = {
    PRODUCT: 'product',
    ORDER: 'order', 
    CUSTOMER: 'customer',
    COLLECTION: 'collection',
    DISCOUNT: 'discount',
    TRANSFER: 'transfer'
  };

  // Cache keys
  static getCacheKey = {
    search: (query, options = {}) => `search:global:${query}:${JSON.stringify(options)}`,
    suggestions: (query) => `search:suggestions:${query}`,
    typeSearch: (type, query, options = {}) => `search:${type}:${query}:${JSON.stringify(options)}`
  };

  /**
   * Global search across all entity types
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @param {Array<string>} options.types - Limit search to specific types
   * @param {number} options.limit - Max results per type (default: 5)
   * @param {boolean} options.detailed - Include detailed results (default: false)
   */
  static async globalSearch(query, options = {}) {
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return this.getEmptySearchResults();
    }

    const normalizedQuery = query.trim().toLowerCase();
    const cacheKey = this.getCacheKey.search(normalizedQuery, options);

    try {
      // Try cache first
      const cached = await CacheService.getCached(cacheKey);
      if (cached) {
        return cached;
      }

      const {
        types = Object.values(this.RESULT_TYPES),
        limit = 5,
        detailed = false
      } = options;

      const searchPromises = [];
      const results = {
        query: normalizedQuery,
        total: 0,
        results: {},
        metadata: {
          searchTime: Date.now(),
          types: types,
          limit: limit
        }
      };

      // Search products
      if (types.includes(this.RESULT_TYPES.PRODUCT)) {
        searchPromises.push(
          this.searchProducts(normalizedQuery, { limit, detailed })
            .then(products => ({ type: this.RESULT_TYPES.PRODUCT, data: products }))
            .catch(error => {
              console.error('Product search failed:', error);
              return { type: this.RESULT_TYPES.PRODUCT, data: [], error: error.message };
            })
        );
      }

      // Search orders
      if (types.includes(this.RESULT_TYPES.ORDER)) {
        searchPromises.push(
          this.searchOrders(normalizedQuery, { limit, detailed })
            .then(orders => ({ type: this.RESULT_TYPES.ORDER, data: orders }))
            .catch(error => {
              console.error('Order search failed:', error);
              return { type: this.RESULT_TYPES.ORDER, data: [], error: error.message };
            })
        );
      }

      // Search customers
      if (types.includes(this.RESULT_TYPES.CUSTOMER)) {
        searchPromises.push(
          this.searchCustomers(normalizedQuery, { limit, detailed })
            .then(customers => ({ type: this.RESULT_TYPES.CUSTOMER, data: customers }))
            .catch(error => {
              console.error('Customer search failed:', error);
              return { type: this.RESULT_TYPES.CUSTOMER, data: [], error: error.message };
            })
        );
      }

      // Wait for all searches to complete
      const searchResults = await Promise.all(searchPromises);

      // Process results
      let totalResults = 0;
      searchResults.forEach(({ type, data, error }) => {
        results.results[type] = {
          items: Array.isArray(data) ? data : [],
          count: Array.isArray(data) ? data.length : 0,
          error: error || null
        };
        totalResults += Array.isArray(data) ? data.length : 0;
      });

      results.total = totalResults;
      results.metadata.searchTime = Date.now() - results.metadata.searchTime;

      // Cache the results
      await CacheService.setCache(cacheKey, results, this.CACHE_TTL.SEARCH_RESULTS);

      return results;
    } catch (error) {
      console.error('SearchService.globalSearch error:', error);
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  /**
   * Search products using ProductService
   */
  static async searchProducts(query, options = {}) {
    const { limit = 5, detailed = false } = options;
    
    try {
      const response = await ProductService.getProducts({
        search: query,
        limit: limit
      });

      // ProductService returns direct array, not wrapped in {products: []}
      const products = Array.isArray(response) ? response : [];
      
      return products.map(product => this.formatProductResult(product, detailed));
    } catch (error) {
      console.error('SearchService.searchProducts error:', error);
      return [];
    }
  }

  /**
   * Search orders using OrderService
   */
  static async searchOrders(query, options = {}) {
    const { limit = 5, detailed = false } = options;
    
    try {
      const response = await OrderService.getOrders({
        search: query,
        limit: limit
      });

      // OrderService returns direct array, not wrapped in {orders: []}
      const orders = Array.isArray(response) ? response : [];
      
      return orders.map(order => this.formatOrderResult(order, detailed));
    } catch (error) {
      console.error('SearchService.searchOrders error:', error);
      return [];
    }
  }

  /**
   * Search customers using CustomerService
   */
  static async searchCustomers(query, options = {}) {
    const { limit = 5, detailed = false } = options;
    
    try {
      const response = await CustomerService.searchCustomers(query, {
        limit: limit
      });

      // CustomerService returns direct array, not wrapped in {customers: []}
      const customers = Array.isArray(response) ? response : [];
      
      return customers.map(customer => this.formatCustomerResult(customer, detailed));
    } catch (error) {
      console.error('SearchService.searchCustomers error:', error);
      return [];
    }
  }

  /**
   * Get search suggestions based on query
   */
  static async getSearchSuggestions(query, limit = 8) {
    if (!query || query.length < 2) {
      return [];
    }

    const normalizedQuery = query.trim().toLowerCase();
    const cacheKey = this.getCacheKey.suggestions(normalizedQuery);

    try {
      // Try cache first
      const cached = await CacheService.getCached(cacheKey);
      if (cached) {
        return cached;
      }

      // Get quick results from each type
      const searchPromises = [
        this.searchProducts(normalizedQuery, { limit: 3, detailed: false }),
        this.searchOrders(normalizedQuery, { limit: 2, detailed: false }),
        this.searchCustomers(normalizedQuery, { limit: 3, detailed: false })
      ];

      const [products, orders, customers] = await Promise.all(searchPromises);

      const suggestions = [
        ...products.map(p => ({ ...p, type: this.RESULT_TYPES.PRODUCT })),
        ...orders.map(o => ({ ...o, type: this.RESULT_TYPES.ORDER })),
        ...customers.map(c => ({ ...c, type: this.RESULT_TYPES.CUSTOMER }))
      ].slice(0, limit);

      // Cache suggestions
      await CacheService.setCache(cacheKey, suggestions, this.CACHE_TTL.SUGGESTIONS);

      return suggestions;
    } catch (error) {
      console.error('SearchService.getSearchSuggestions error:', error);
      return [];
    }
  }

  /**
   * Search within specific entity type
   */
  static async searchByType(type, query, options = {}) {
    const cacheKey = this.getCacheKey.typeSearch(type, query, options);

    try {
      // Try cache first
      const cached = await CacheService.getCached(cacheKey);
      if (cached) {
        return cached;
      }

      let results = [];

      switch (type) {
        case this.RESULT_TYPES.PRODUCT:
          results = await this.searchProducts(query, options);
          break;
        case this.RESULT_TYPES.ORDER:
          results = await this.searchOrders(query, options);
          break;
        case this.RESULT_TYPES.CUSTOMER:
          results = await this.searchCustomers(query, options);
          break;
        default:
          throw new Error(`Unsupported search type: ${type}`);
      }

      // Cache results
      await CacheService.setCache(cacheKey, results, this.CACHE_TTL.SEARCH_RESULTS);

      return results;
    } catch (error) {
      console.error('SearchService.searchByType error:', error);
      throw error;
    }
  }

  // === FORMATTING METHODS ===

  /**
   * Format product for search results
   */
  static formatProductResult(product, detailed = false) {
    const base = {
      id: product.id,
      title: product.title || product.name,
      subtitle: this.formatCurrency(product.price),
      url: `/products/${product.id}`,
      icon: '🏷️',
      status: product.status,
      thumbnail: this.getProductThumbnail(product)
    };

    if (detailed) {
      return {
        ...base,
        description: product.description,
        vendor: product.vendor,
        tags: product.tags,
        created_at: product.created_at,
        updated_at: product.updated_at
      };
    }

    return base;
  }

  /**
   * Format order for search results
   */
  static formatOrderResult(order, detailed = false) {
    const base = {
      id: order.id,
      title: `Order #${this.formatOrderId(order.id)}`,
      subtitle: `${order.customer_name} • ${this.formatCurrency(order.total_amount)}`,
      url: `/orders/${order.id}`,
      icon: '📋',
      status: order.status,
      thumbnail: null
    };

    if (detailed) {
      return {
        ...base,
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        total_amount: order.total_amount,
        payment_method: order.payment_method,
        created_at: order.created_at,
        updated_at: order.updated_at
      };
    }

    return base;
  }

  /**
   * Format customer for search results
   */
  static formatCustomerResult(customer, detailed = false) {
    const base = {
      id: customer.id,
      title: customer.name,
      subtitle: customer.email,
      url: `/customers/${customer.id}`,
      icon: '👤',
      status: customer.status || 'active',
      thumbnail: null
    };

    if (detailed) {
      return {
        ...base,
        phone: customer.phone,
        address: customer.address,
        created_at: customer.created_at,
        updated_at: customer.updated_at
      };
    }

    return base;
  }

  // === UTILITY METHODS ===

  /**
   * Get empty search results structure
   */
  static getEmptySearchResults() {
    return {
      query: '',
      total: 0,
      results: {},
      metadata: {
        searchTime: 0,
        types: [],
        limit: 0
      }
    };
  }

  /**
   * Get product thumbnail
   */
  static getProductThumbnail(product) {
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
      return product.images[0];
    }
    if (product.image) {
      return product.image;
    }
    return null;
  }

  /**
   * Format currency
   */
  static formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(amount || 0);
  }

  /**
   * Format order ID for display
   */
  static formatOrderId(orderId) {
    if (!orderId) return '';
    return orderId.toString().padStart(4, '0');
  }

  /**
   * Clear search cache
   */
  static async clearSearchCache() {
    // Note: This is a simplified cache clearing - in production you might want more sophisticated cache management
    console.log('Clearing search cache...');
  }
}