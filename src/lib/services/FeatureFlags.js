/**
 * FeatureFlags - Service for managing feature flags and gradual rollouts
 * Enables safe deployment of new features with rollback capabilities
 */

import { query } from '$lib/database.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';

export class FeatureFlags {
  static cache = new Map();
  static cacheExpiry = new Map();
  static CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Check if a feature flag is enabled for a specific tenant
   */
  static async isEnabled(flagKey, tenantId = DEFAULT_TENANT_ID) {
    try {
      const cacheKey = `${tenantId}_${flagKey}`;
      const now = Date.now();
      
      // Check cache first
      if (this.cache.has(cacheKey) && this.cacheExpiry.get(cacheKey) > now) {
        return this.cache.get(cacheKey);
      }

      // Query database
      const result = await query(`
        SELECT enabled, rollout_percentage 
        FROM feature_flags 
        WHERE flag_key = $1 AND (tenant_id = $2 OR tenant_id IS NULL)
        ORDER BY tenant_id NULLS LAST
        LIMIT 1
      `, [flagKey, tenantId]);

      let isEnabled = false;
      
      if (result.rows.length > 0) {
        const { enabled, rollout_percentage } = result.rows[0];
        
        if (enabled) {
          // If rollout percentage is 100, always enable
          if (rollout_percentage >= 100) {
            isEnabled = true;
          } else if (rollout_percentage > 0) {
            // Use tenant ID to determine rollout group (consistent hash)
            const hash = this.hashString(tenantId || 'default');
            isEnabled = (hash % 100) < rollout_percentage;
          }
        }
      }

      // Cache the result
      this.cache.set(cacheKey, isEnabled);
      this.cacheExpiry.set(cacheKey, now + this.CACHE_DURATION);
      
      return isEnabled;
      
    } catch (error) {
      console.error(`Error checking feature flag ${flagKey}:`, error);
      return false; // Fail safe - default to disabled
    }
  }

  /**
   * Enable a feature flag
   */
  static async enable(flagKey, tenantId = null, rolloutPercentage = 100) {
    try {
      await query(`
        INSERT INTO feature_flags (tenant_id, flag_key, enabled, rollout_percentage, updated_at)
        VALUES ($1, $2, true, $3, NOW())
        ON CONFLICT (tenant_id, flag_key) 
        DO UPDATE SET enabled = true, rollout_percentage = $3, updated_at = NOW()
      `, [tenantId, flagKey, rolloutPercentage]);

      // Clear cache for this flag
      this.clearCache(flagKey, tenantId);
      
      return true;
    } catch (error) {
      console.error(`Error enabling feature flag ${flagKey}:`, error);
      throw error;
    }
  }

  /**
   * Disable a feature flag
   */
  static async disable(flagKey, tenantId = null) {
    try {
      await query(`
        UPDATE feature_flags 
        SET enabled = false, updated_at = NOW()
        WHERE flag_key = $1 AND (tenant_id = $2 OR ($2 IS NULL AND tenant_id IS NULL))
      `, [flagKey, tenantId]);

      // Clear cache for this flag
      this.clearCache(flagKey, tenantId);
      
      return true;
    } catch (error) {
      console.error(`Error disabling feature flag ${flagKey}:`, error);
      throw error;
    }
  }

  /**
   * Set rollout percentage for gradual rollout
   */
  static async setRolloutPercentage(flagKey, percentage, tenantId = null) {
    try {
      if (percentage < 0 || percentage > 100) {
        throw new Error('Rollout percentage must be between 0 and 100');
      }

      await query(`
        INSERT INTO feature_flags (tenant_id, flag_key, enabled, rollout_percentage, updated_at)
        VALUES ($1, $2, true, $3, NOW())
        ON CONFLICT (tenant_id, flag_key) 
        DO UPDATE SET rollout_percentage = $3, enabled = true, updated_at = NOW()
      `, [tenantId, flagKey, percentage]);

      // Clear cache for this flag
      this.clearCache(flagKey, tenantId);
      
      return true;
    } catch (error) {
      console.error(`Error setting rollout for feature flag ${flagKey}:`, error);
      throw error;
    }
  }

  /**
   * Get all feature flags for admin interface
   */
  static async getAll(tenantId = null) {
    try {
      const result = await query(`
        SELECT flag_key, enabled, rollout_percentage, description, created_at, updated_at
        FROM feature_flags
        WHERE tenant_id = $1 OR ($1 IS NULL AND tenant_id IS NULL)
        ORDER BY flag_key
      `, [tenantId]);

      return result.rows;
    } catch (error) {
      console.error('Error fetching feature flags:', error);
      return [];
    }
  }

  /**
   * Clear cache for a specific flag
   */
  static clearCache(flagKey, tenantId = null) {
    const cacheKey = `${tenantId || DEFAULT_TENANT_ID}_${flagKey}`;
    this.cache.delete(cacheKey);
    this.cacheExpiry.delete(cacheKey);
  }

  /**
   * Clear all cache
   */
  static clearAllCache() {
    this.cache.clear();
    this.cacheExpiry.clear();
  }

  /**
   * Simple hash function for consistent tenant-based rollouts
   */
  static hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  // Predefined feature flags
  static FLAGS = {
    USE_NEW_PRODUCT_API: 'USE_NEW_PRODUCT_API',
    USE_NEW_INVENTORY_TRACKING: 'USE_NEW_INVENTORY_TRACKING',
    USE_PRODUCT_VARIANTS: 'USE_PRODUCT_VARIANTS'
  };
}