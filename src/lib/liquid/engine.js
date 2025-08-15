import { Liquid } from 'liquidjs';

/**
 * LiquidJS Template Engine for BetterCallSold
 * Handles template compilation and rendering for independent site generation
 */
export class LiquidEngine {
  constructor() {
    this.engine = new Liquid({
      cache: true,
      strictFilters: false,
      strictVariables: false,
      trimTagLeft: true,
      trimTagRight: true,
      trimOutputLeft: true,
      trimOutputRight: true
    });

    this.templateCache = new Map();
    this.registerEcommerceFilters();
    this.registerEcommerceTags();
  }

  /**
   * Parse and cache a liquid template
   */
  async parseTemplate(templateContent, cacheKey = null) {
    if (cacheKey && this.templateCache.has(cacheKey)) {
      return this.templateCache.get(cacheKey);
    }

    try {
      const template = this.engine.parse(templateContent);
      
      if (cacheKey) {
        this.templateCache.set(cacheKey, template);
      }
      
      return template;
    } catch (error) {
      console.error('Template parsing error:', error);
      throw new Error(`Invalid Liquid template: ${error.message}`);
    }
  }

  /**
   * Render a template with context data
   */
  async renderTemplate(templateContent, context, cacheKey = null) {
    const template = await this.parseTemplate(templateContent, cacheKey);
    
    try {
      return await this.engine.render(template, context);
    } catch (error) {
      console.error('Template rendering error:', error);
      throw new Error(`Template rendering failed: ${error.message}`);
    }
  }

  /**
   * Analyze template for variables and dependencies
   */
  analyzeTemplate(templateContent) {
    try {
      const template = this.engine.parse(templateContent);
      
      // Extract variables used in template
      const variables = this.engine.variablesSync(template);
      
      // Extract API endpoints needed (custom analysis)
      const apiEndpoints = this.extractApiEndpoints(templateContent);
      
      return {
        variables,
        apiEndpoints,
        hasProducts: this.hasProductReferences(templateContent),
        hasCollections: this.hasCollectionReferences(templateContent),
        hasCart: this.hasCartReferences(templateContent)
      };
    } catch (error) {
      console.error('Template analysis error:', error);
      return {
        variables: [],
        apiEndpoints: [],
        hasProducts: false,
        hasCollections: false,
        hasCart: false
      };
    }
  }

  /**
   * Extract API endpoints needed by template
   */
  extractApiEndpoints(templateContent) {
    const endpoints = new Set();
    
    // Look for data-api-endpoint attributes
    const apiEndpointMatches = templateContent.match(/data-api-endpoint=["']([^"']+)["']/g);
    if (apiEndpointMatches) {
      apiEndpointMatches.forEach(match => {
        const endpoint = match.match(/data-api-endpoint=["']([^"']+)["']/)[1];
        endpoints.add(endpoint);
      });
    }

    // Look for product references
    if (this.hasProductReferences(templateContent)) {
      endpoints.add('products');
    }

    // Look for collection references
    if (this.hasCollectionReferences(templateContent)) {
      endpoints.add('collections');
    }

    // Look for cart references
    if (this.hasCartReferences(templateContent)) {
      endpoints.add('cart');
    }

    return Array.from(endpoints);
  }

  /**
   * Check if template references products
   */
  hasProductReferences(templateContent) {
    return /\b(products|product)\b/i.test(templateContent) ||
           /data-api-endpoint=["']products?["']/i.test(templateContent);
  }

  /**
   * Check if template references collections
   */
  hasCollectionReferences(templateContent) {
    return /\b(collections|collection)\b/i.test(templateContent) ||
           /data-api-endpoint=["']collections?["']/i.test(templateContent);
  }

  /**
   * Check if template references cart
   */
  hasCartReferences(templateContent) {
    return /\b(cart|add_to_cart)\b/i.test(templateContent) ||
           /data-api-endpoint=["']cart["']/i.test(templateContent);
  }

  /**
   * Register e-commerce specific filters
   */
  registerEcommerceFilters() {
    // Money formatting filter
    this.engine.registerFilter('money', (value) => {
      if (!value || isNaN(value)) return '$0.00';
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(parseFloat(value));
    });

    // Image URL filter
    this.engine.registerFilter('img_url', (url, size = null) => {
      if (!url) return '';
      if (size) {
        // Add size parameter for image transformation
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}size=${size}`;
      }
      return url;
    });

    // Truncate filter
    this.engine.registerFilter('truncate', (str, length = 50, suffix = '...') => {
      if (!str || str.length <= length) return str;
      return str.substring(0, length) + suffix;
    });

    // Capitalize filter
    this.engine.registerFilter('capitalize', (str) => {
      if (!str) return '';
      return str.charAt(0).toUpperCase() + str.slice(1);
    });

    // JSON filter for debugging
    this.engine.registerFilter('json', (obj) => {
      return JSON.stringify(obj, null, 2);
    });

    // Default filter
    this.engine.registerFilter('default', (value, defaultValue) => {
      return value || defaultValue;
    });

    // Array filters
    this.engine.registerFilter('first', (array) => {
      return Array.isArray(array) && array.length > 0 ? array[0] : null;
    });

    this.engine.registerFilter('last', (array) => {
      return Array.isArray(array) && array.length > 0 ? array[array.length - 1] : null;
    });

    this.engine.registerFilter('size', (value) => {
      if (Array.isArray(value)) return value.length;
      if (typeof value === 'string') return value.length;
      if (typeof value === 'object' && value !== null) return Object.keys(value).length;
      return 0;
    });
  }

  /**
   * Register e-commerce specific tags
   */
  registerEcommerceTags() {
    // API endpoint tag for marking elements that need data
    this.engine.registerTag('api_bind', {
      parse: function(tagToken) {
        this.endpoint = tagToken.args;
      },
      render: function(scope, hash) {
        const endpoint = this.endpoint.trim().replace(/['"]/g, '');
        return `data-api-endpoint="${endpoint}"`;
      }
    });
  }

  /**
   * Clear template cache
   */
  clearCache() {
    this.templateCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.templateCache.size,
      keys: Array.from(this.templateCache.keys())
    };
  }
}

// Singleton instance
let engineInstance = null;

export function getLiquidEngine() {
  if (!engineInstance) {
    engineInstance = new LiquidEngine();
  }
  return engineInstance;
}