import { getCached, setCache, deleteCache } from '$lib/database.js';

/**
 * Enhanced caching service with strategic cache invalidation
 * Optimized for inventory and product data patterns
 */
export class CacheService {
  // Cache key patterns
  static KEYS = {
    PRODUCTS: (tenantId, filters = '') => `products:${tenantId}:${filters}`,
    PRODUCT: (productId) => `product:${productId}`,
    VARIANTS: (productId) => `variants:${productId}`,
    VARIANT: (variantId) => `variant:${variantId}`,
    INVENTORY: (tenantId, filters = '') => `inventory:${tenantId}:${filters}`,
    INVENTORY_LEVELS: (variantId) => `inventory_levels:${variantId}`,
    LOCATIONS: (tenantId) => `locations:${tenantId}`,
    TRANSFERS: (tenantId, filters = '') => `transfers:${tenantId}:${filters}`,
    TRANSFER: (transferId) => `transfer:${transferId}`
  };

  // Cache TTLs (in seconds)
  static TTL = {
    PRODUCTS: 600,      // 10 minutes - products change less frequently
    VARIANTS: 600,      // 10 minutes - variants change less frequently
    INVENTORY: 300,     // 5 minutes - inventory changes more frequently
    LOCATIONS: 1800,    // 30 minutes - locations change rarely
    TRANSFERS: 300,     // 5 minutes - transfers can change status frequently
    SHORT: 120,         // 2 minutes - for highly dynamic data
    LONG: 3600         // 1 hour - for very stable data
  };

  // Product and variant caching
  static async getProduct(productId) {
    return await getCached(this.KEYS.PRODUCT(productId));
  }

  static async setProduct(productId, data, ttl = this.TTL.PRODUCTS) {
    return await setCache(this.KEYS.PRODUCT(productId), data, ttl);
  }

  static async getVariant(variantId) {
    return await getCached(this.KEYS.VARIANT(variantId));
  }

  static async setVariant(variantId, data, ttl = this.TTL.VARIANTS) {
    return await setCache(this.KEYS.VARIANT(variantId), data, ttl);
  }

  // Inventory caching with location awareness
  static async getInventory(tenantId, filters = '') {
    const key = this.KEYS.INVENTORY(tenantId, this.normalizeFilters(filters));
    return await getCached(key);
  }

  static async setInventory(tenantId, filters = '', data, ttl = this.TTL.INVENTORY) {
    const key = this.KEYS.INVENTORY(tenantId, this.normalizeFilters(filters));
    return await setCache(key, data, ttl);
  }

  static async getInventoryLevels(variantId) {
    return await getCached(this.KEYS.INVENTORY_LEVELS(variantId));
  }

  static async setInventoryLevels(variantId, data, ttl = this.TTL.INVENTORY) {
    return await setCache(this.KEYS.INVENTORY_LEVELS(variantId), data, ttl);
  }

  // Location caching
  static async getLocations(tenantId) {
    return await getCached(this.KEYS.LOCATIONS(tenantId));
  }

  static async setLocations(tenantId, data, ttl = this.TTL.LOCATIONS) {
    return await setCache(this.KEYS.LOCATIONS(tenantId), data, ttl);
  }

  // Transfer caching
  static async getTransfers(tenantId, filters = '') {
    const key = this.KEYS.TRANSFERS(tenantId, this.normalizeFilters(filters));
    return await getCached(key);
  }

  static async setTransfers(tenantId, filters = '', data, ttl = this.TTL.TRANSFERS) {
    const key = this.KEYS.TRANSFERS(tenantId, this.normalizeFilters(filters));
    return await setCache(key, data, ttl);
  }

  static async getTransfer(transferId) {
    return await getCached(this.KEYS.TRANSFER(transferId));
  }

  static async setTransfer(transferId, data, ttl = this.TTL.TRANSFERS) {
    return await setCache(this.KEYS.TRANSFER(transferId), data, ttl);
  }

  // Cache invalidation patterns
  static async invalidateProduct(productId) {
    // Invalidate product and its variants
    await deleteCache(this.KEYS.PRODUCT(productId));
    await deleteCache(this.KEYS.VARIANTS(productId));
    
    // Invalidate product lists (we can't target specific filters, so we invalidate common ones)
    const commonFilters = ['', 'status=active', 'status=draft'];
    for (const filter of commonFilters) {
      await deleteCache(this.KEYS.PRODUCTS('*', filter)); // Use pattern if supported
    }
  }

  static async invalidateVariant(variantId) {
    await deleteCache(this.KEYS.VARIANT(variantId));
    await deleteCache(this.KEYS.INVENTORY_LEVELS(variantId));
  }

  static async invalidateInventory(tenantId, variantId = null) {
    if (variantId) {
      await deleteCache(this.KEYS.INVENTORY_LEVELS(variantId));
    }
    
    // Invalidate inventory lists
    const commonFilters = ['', 'location=all', 'status=all'];
    for (const filter of commonFilters) {
      await deleteCache(this.KEYS.INVENTORY(tenantId, filter));
    }
  }

  static async invalidateLocations(tenantId) {
    await deleteCache(this.KEYS.LOCATIONS(tenantId));
    // Also invalidate inventory since location changes affect inventory queries
    await this.invalidateInventory(tenantId);
  }

  static async invalidateTransfer(transferId, tenantId) {
    await deleteCache(this.KEYS.TRANSFER(transferId));
    
    // Invalidate transfer lists
    const commonFilters = ['', 'status=all', 'status=pending', 'status=in_transit', 'status=completed'];
    for (const filter of commonFilters) {
      await deleteCache(this.KEYS.TRANSFERS(tenantId, filter));
    }
  }

  // Utility methods
  static normalizeFilters(filters) {
    if (typeof filters === 'object') {
      // Convert object to sorted string for consistent cache keys
      const sorted = Object.keys(filters).sort().reduce((obj, key) => {
        obj[key] = filters[key];
        return obj;
      }, {});
      return JSON.stringify(sorted);
    }
    return filters.toString();
  }

  static createCacheKey(...parts) {
    return parts.filter(Boolean).join(':');
  }

  // Batch operations for better performance
  static async warmupCache(tenantId) {
    try {
      // Pre-load frequently accessed data
      console.log(`Warming up cache for tenant: ${tenantId}`);
      
      // Load locations first as they're used in many other queries
      // We can implement this when we add cache warming endpoints
      
      return true;
    } catch (error) {
      console.error('Cache warmup failed:', error);
      return false;
    }
  }

  // Cache statistics and monitoring
  static async getCacheStats() {
    // This would require additional Redis commands
    // For now, return basic info
    return {
      enabled: process.env.CACHE_ENABLED === 'true',
      redis_url: process.env.REDIS_URL ? 'configured' : 'not configured'
    };
  }
}

// Export for backward compatibility
export const cacheService = CacheService;