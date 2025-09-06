import { 
  buildCheckoutCompletedPayload,
  buildCheckoutFailedPayload,
  buildCartItemAddedPayload,
  buildWaitlistItemAddedPayload,
  buildProductCreatedPayload,
  buildProductUpdatedPayload,
  buildProductDeletedPayload,
  buildFavoriteAddedPayload,
  buildFavoriteRemovedPayload,
  buildSearchPerformedPayload,
  buildSearchNoResultsPayload
} from '../payloads/index.js';

import { PLUGIN_EVENTS } from '../constants.js';

export class SchemaIntrospector {
  static _schemaCache = null;
  
  /**
   * Get all event schemas (cached)
   */
  static getEventSchemas() {
    if (!this._schemaCache) {
      this._schemaCache = this._buildSchemaCache();
    }
    return this._schemaCache;
  }

  /**
   * Get schema for specific event
   */
  static getEventSchema(eventType) {
    const schemas = this.getEventSchemas();
    return schemas[eventType] || null;
  }

  /**
   * Build complete schema cache by introspecting payload builders
   */
  static _buildSchemaCache() {
    console.log('🔍 Building event schema cache...');
    
    const schemas = {};
    const builderMap = this._getPayloadBuilderMap();
    
    for (const [eventType, builderFn] of Object.entries(builderMap)) {
      try {
        const schema = this._introspectBuilder(eventType, builderFn);
        schemas[eventType] = schema;
        console.log(`✅ Schema extracted for: ${eventType} (${schema.fields.length} fields)`);
      } catch (error) {
        console.error(`❌ Schema extraction failed for ${eventType}:`, error.message);
        schemas[eventType] = { event_type: eventType, fields: [] };
      }
    }
    
    console.log(`🎉 Schema cache built: ${Object.keys(schemas).length} events`);
    return schemas;
  }

  /**
   * Map event types to their payload builder functions
   */
  static _getPayloadBuilderMap() {
    return {
      [PLUGIN_EVENTS.CHECKOUT_COMPLETED]: buildCheckoutCompletedPayload,
      [PLUGIN_EVENTS.CHECKOUT_FAILED]: buildCheckoutFailedPayload,
      [PLUGIN_EVENTS.CART_ITEM_ADDED]: buildCartItemAddedPayload,
      [PLUGIN_EVENTS.WAITLIST_ITEM_ADDED]: buildWaitlistItemAddedPayload,
      [PLUGIN_EVENTS.PRODUCT_CREATED]: buildProductCreatedPayload,
      [PLUGIN_EVENTS.PRODUCT_UPDATED]: buildProductUpdatedPayload,
      [PLUGIN_EVENTS.PRODUCT_DELETED]: buildProductDeletedPayload,
      [PLUGIN_EVENTS.FAVORITE_ADDED]: buildFavoriteAddedPayload,
      [PLUGIN_EVENTS.FAVORITE_REMOVED]: buildFavoriteRemovedPayload,
      [PLUGIN_EVENTS.SEARCH_PERFORMED]: buildSearchPerformedPayload,
      [PLUGIN_EVENTS.SEARCH_NO_RESULTS]: buildSearchNoResultsPayload
    };
  }

  /**
   * Introspect a single payload builder function
   */
  static _introspectBuilder(eventType, builderFn) {
    // Extract parameter names from function signature
    const parameterNames = this._extractParameterNames(builderFn);
    
    // Generate minimal sample data
    const sampleArgs = this._generateSampleArgs(parameterNames);
    
    // Execute builder with sample data
    const samplePayload = builderFn(sampleArgs);
    
    // Analyze output to get field names and types
    const fields = this._analyzePayloadFields(samplePayload);
    
    return {
      event_type: eventType,
      fields: fields
    };
  }

  /**
   * Extract parameter names from function signature
   */
  static _extractParameterNames(builderFn) {
    const fnString = builderFn.toString();
    
    // Match destructured parameters with better regex that handles newlines
    const destructuredMatch = fnString.match(/\(\s*\{\s*([\s\S]*?)\s*\}\s*\)/);
    
    if (destructuredMatch) {
      const paramString = destructuredMatch[1];
      
      return paramString
        .split(',')
        .map(param => param.trim())
        .filter(param => param && param !== '')
        .map(param => {
          // Handle parameters with default values like "previousValues = {}"
          const paramName = param.split('=')[0].trim();
          // Remove any remaining whitespace or newlines
          return paramName.replace(/\s+/g, '');
        })
        .filter(param => param !== '');
    }
    
    return [];
  }

  /**
   * Generate minimal sample data for function parameters
   */
  static _generateSampleArgs(parameterNames) {
    const sampleData = {};
    
    for (const param of parameterNames) {
      sampleData[param] = this._generateSampleValue(param);
    }
    
    return sampleData;
  }

  /**
   * Generate sample value based on parameter name
   */
  static _generateSampleValue(paramName) {
    const sampleMap = {
      // IDs - various naming patterns
      orderId: 'sample_order_123',
      userId: 'sample_user_123', 
      cartId: 'sample_cart_123',
      productId: 'sample_product_123',
      inventoryId: 'sample_inventory_123',
      waitlistId: 'sample_waitlist_123',
      favoriteId: 'sample_favorite_123',
      searchId: 'sample_search_123',
      
      // Product fields
      productName: 'Sample Product',
      name: 'Sample Product Name',
      description: 'Sample product description',
      price: 29.99,
      status: 'active',
      images: ['https://example.com/image1.jpg'],
      tags: ['tag1', 'tag2'],
      collections: ['collection1'],
      previousValues: { name: 'Old Name', price: 19.99 },
      deletionReason: 'user_requested',
      inventoryCount: 100,
      
      // Search fields
      query: 'sample query',
      resultsCount: 5,
      searchTimeMs: 150,
      filtersApplied: { category: 'electronics', price_range: '20-50' },
      suggestions: ['suggestion1', 'suggestion2'],
      
      // User and customer fields  
      userEmail: 'sample@example.com',
      userPhone: '+1234567890',
      notifyWhenAvailable: true,
      
      // Payment and checkout
      payment: { provider: 'sample', payment_id: 'sample_123', method: 'sample' },
      customer: { name: 'Sample Customer', email: 'sample@example.com', phone: '+1234567890' },
      pricing: { total: 100, subtotal: 90, tax: 8, shipping: 2 },
      metrics: { processingTime: 1000 },
      items: [{ id: 'sample_item', name: 'Sample Item', price: 50 }],
      paymentMethod: 'sample_method',
      
      // Cart and inventory
      inventory: { size: 'M', color: 'Blue', price: 50 },
      quantity: 1,
      availableQuantity: 10,
      size: 'M',
      color: 'Blue',
      
      // Error handling
      error: { message: 'Sample error', constructor: { name: 'SampleError' } }
    };

    if (sampleMap[paramName]) return sampleMap[paramName];

    // Pattern matching
    if (paramName.toLowerCase().includes('id')) return 'sample_id_123';
    if (paramName.toLowerCase().includes('name')) return 'Sample Name';
    if (paramName.toLowerCase().includes('email')) return 'sample@example.com';
    if (paramName.toLowerCase().includes('amount')) return 50;
    if (paramName.toLowerCase().includes('price')) return 29.99;
    if (paramName.toLowerCase().includes('quantity')) return 5;
    if (paramName.toLowerCase().includes('count')) return 10;
    if (paramName.toLowerCase().includes('time')) return 1000;
    if (paramName.toLowerCase().includes('query')) return 'sample query';
    
    return 'sample_value';
  }

  /**
   * Analyze payload fields - just name and type
   */
  static _analyzePayloadFields(payload) {
    const fields = [];
    
    for (const [fieldName, fieldValue] of Object.entries(payload)) {
      fields.push({
        name: fieldName,
        type: this._determineFieldType(fieldValue)
      });
    }
    
    return fields.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Determine field type
   */
  static _determineFieldType(value) {
    if (value === null || value === undefined) return 'unknown';
    
    const basicType = typeof value;
    
    if (basicType === 'object') {
      if (Array.isArray(value)) return 'array';
      return 'object';
    }
    
    return basicType; // 'string', 'number', 'boolean'
  }

  /**
   * Clear schema cache (for development)
   */
  static clearCache() {
    this._schemaCache = null;
    console.log('🗑️ Schema cache cleared');
  }
}