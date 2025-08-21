/**
 * Global Search API Endpoint
 * Provides unified search across all entity types using SearchService
 */

import { json } from '@sveltejs/kit';
import { query } from '$lib/database.js';

const TENANT_ID = '11111111-1111-1111-1111-111111111111';

export async function GET({ url, request }) {
  try {
    // Get search parameters
    const query = url.searchParams.get('q')?.trim();
    const types = url.searchParams.get('types')?.split(',').filter(Boolean);
    const limit = parseInt(url.searchParams.get('limit')) || 5;
    const detailed = url.searchParams.get('detailed') === 'true';
    const suggestions = url.searchParams.get('suggestions') === 'true';

    // Validate query parameter
    if (!query) {
      return json({
        success: false,
        error: 'Search query parameter "q" is required'
      }, { status: 400 });
    }

    // Minimum query length check
    if (query.length < 1) {
      return json({
        success: false,
        error: 'Search query must be at least 1 character long'
      }, { status: 400 });
    }

    // Handle suggestions endpoint
    if (suggestions) {
      const suggestionResults = await getSearchSuggestions(query, limit);
      
      return json({
        success: true,
        data: {
          query: query,
          suggestions: suggestionResults,
          total: suggestionResults.length
        }
      });
    }

    // Prepare search options
    const searchOptions = {
      limit: Math.min(limit, 50), // Cap at 50 results per type
      detailed: detailed
    };

    const RESULT_TYPES = {
      PRODUCT: 'product',
      ORDER: 'order', 
      CUSTOMER: 'customer'
    };

    if (types && types.length > 0) {
      // Validate types
      const validTypes = Object.values(RESULT_TYPES);
      const invalidTypes = types.filter(type => !validTypes.includes(type));
      
      if (invalidTypes.length > 0) {
        return json({
          success: false,
          error: `Invalid search types: ${invalidTypes.join(', ')}. Valid types: ${validTypes.join(', ')}`
        }, { status: 400 });
      }
      
      searchOptions.types = types;
    } else {
      searchOptions.types = Object.values(RESULT_TYPES);
    }

    // Perform global search using direct database queries
    const searchResults = await performGlobalSearch(query, searchOptions);

    // Format response
    const response = {
      success: true,
      data: searchResults,
      metadata: {
        tenant_id: TENANT_ID,
        timestamp: new Date().toISOString(),
        search_options: searchOptions
      }
    };

    return json(response);

  } catch (error) {
    console.error('Search API error:', error);
    
    return json({
      success: false,
      error: error.message || 'An error occurred during search',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function POST({ request }) {
  try {
    const body = await request.json();
    
    const { query, types, limit = 5, detailed = false, suggestions = false } = body;

    // Validate required fields
    if (!query || typeof query !== 'string') {
      return json({
        success: false,
        error: 'Query is required and must be a string'
      }, { status: 400 });
    }

    if (query.trim().length < 1) {
      return json({
        success: false,
        error: 'Search query must be at least 1 character long'
      }, { status: 400 });
    }

    const normalizedQuery = query.trim();

    // Handle suggestions
    if (suggestions) {
      const suggestionResults = await getSearchSuggestions(normalizedQuery, limit);
      
      return json({
        success: true,
        data: {
          query: normalizedQuery,
          suggestions: suggestionResults,
          total: suggestionResults.length
        }
      });
    }

    // Prepare search options
    const searchOptions = {
      limit: Math.min(limit || 5, 50),
      detailed: !!detailed
    };

    if (types && Array.isArray(types) && types.length > 0) {
      // Validate types
      const validTypes = Object.values(RESULT_TYPES);
      const invalidTypes = types.filter(type => !validTypes.includes(type));
      
      if (invalidTypes.length > 0) {
        return json({
          success: false,
          error: `Invalid search types: ${invalidTypes.join(', ')}. Valid types: ${validTypes.join(', ')}`
        }, { status: 400 });
      }
      
      searchOptions.types = types;
    } else {
      searchOptions.types = Object.values(RESULT_TYPES);
    }

    // Perform global search using direct database queries
    const searchResults = await performGlobalSearch(normalizedQuery, searchOptions);

    // Format response
    const response = {
      success: true,
      data: searchResults,
      metadata: {
        tenant_id: TENANT_ID,
        timestamp: new Date().toISOString(),
        search_options: searchOptions
      }
    };

    return json(response);

  } catch (error) {
    console.error('Search API POST error:', error);
    
    return json({
      success: false,
      error: error.message || 'An error occurred during search',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

// Handle specific entity type searches
export async function PUT({ request, url }) {
  try {
    const body = await request.json();
    const { type, query, options = {} } = body;

    // Validate required fields
    if (!type || !query) {
      return json({
        success: false,
        error: 'Type and query are required'
      }, { status: 400 });
    }

    // Validate type
    const validTypes = Object.values(RESULT_TYPES);
    if (!validTypes.includes(type)) {
      return json({
        success: false,
        error: `Invalid search type: ${type}. Valid types: ${validTypes.join(', ')}`
      }, { status: 400 });
    }

    if (query.trim().length < 1) {
      return json({
        success: false,
        error: 'Search query must be at least 1 character long'
      }, { status: 400 });
    }

    const normalizedQuery = query.trim();

    // Search by specific type using direct database queries
    const results = await searchByType(type, normalizedQuery, options);

    return json({
      success: true,
      data: {
        query: normalizedQuery,
        type: type,
        results: results,
        total: results.length
      },
      metadata: {
        tenant_id: TENANT_ID,
        timestamp: new Date().toISOString(),
        search_options: options
      }
    });

  } catch (error) {
    console.error('Type-specific search API error:', error);
    
    return json({
      success: false,
      error: error.message || 'An error occurred during search',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

// Helper functions for direct database queries

async function performGlobalSearch(query, options = {}) {
  const { types, limit = 5, detailed = false } = options;
  const startTime = Date.now();
  
  const results = {
    query: query,
    total: 0,
    results: {},
    metadata: {
      searchTime: 0,
      types: types,
      limit: limit
    }
  };

  const searchPromises = [];

  // Search each type if included
  if (types.includes('product')) {
    searchPromises.push(
      searchProducts(query, { limit, detailed })
        .then(products => ({ type: 'product', data: products }))
        .catch(error => {
          console.error('Product search failed:', error);
          return { type: 'product', data: [], error: error.message };
        })
    );
  }

  if (types.includes('order')) {
    searchPromises.push(
      searchOrders(query, { limit, detailed })
        .then(orders => ({ type: 'order', data: orders }))
        .catch(error => {
          console.error('Order search failed:', error);
          return { type: 'order', data: [], error: error.message };
        })
    );
  }

  if (types.includes('customer')) {
    searchPromises.push(
      searchCustomers(query, { limit, detailed })
        .then(customers => ({ type: 'customer', data: customers }))
        .catch(error => {
          console.error('Customer search failed:', error);
          return { type: 'customer', data: [], error: error.message };
        })
    );
  }

  // Wait for all searches
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
  results.metadata.searchTime = Date.now() - startTime;

  return results;
}

async function searchByType(type, query, options = {}) {
  switch (type) {
    case 'product':
      return await searchProducts(query, options);
    case 'order':
      return await searchOrders(query, options);
    case 'customer':
      return await searchCustomers(query, options);
    default:
      throw new Error(`Unsupported search type: ${type}`);
  }
}

async function searchProducts(searchQuery, options = {}) {
  const { limit = 5, detailed = false } = options;
  
  try {
    const searchPattern = `%${searchQuery.trim()}%`;
    const queryText = `
      SELECT p.*,
             COALESCE(SUM(il.available), 0) as total_inventory,
             COUNT(DISTINCT pv.id) as variant_count,
             COUNT(DISTINCT il.location_id) as location_count
      FROM products_new p
      LEFT JOIN product_variants_new pv ON pv.product_id = p.id
      LEFT JOIN inventory_levels_new il ON il.variant_id = pv.id
      WHERE p.tenant_id = $1 AND (
        LOWER(p.title) LIKE LOWER($2) OR 
        LOWER(p.description) LIKE LOWER($3) OR 
        LOWER(p.handle) LIKE LOWER($4)
      )
      GROUP BY p.id
      ORDER BY p.created_at DESC
      LIMIT $5
    `;

    const result = await query(queryText, [
      TENANT_ID,
      searchPattern,
      searchPattern, 
      searchPattern,
      limit
    ]);

    return result.rows.map(product => formatProductResult(product, detailed));
  } catch (error) {
    console.error('searchProducts error:', error);
    return [];
  }
}

async function searchOrders(searchQuery, options = {}) {
  const { limit = 5, detailed = false } = options;
  
  try {
    const searchPattern = `%${searchQuery.trim()}%`;
    const queryText = `
      SELECT
        o.id, o.tenant_id, o.user_id, o.status, o.total_amount,
        o.shipping_address, o.payment_method, o.payment_id,
        o.created_at, o.updated_at,
        u.name as customer_name, u.email as customer_email
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.tenant_id = $1 AND (
        LOWER(u.name) LIKE LOWER($2) OR
        LOWER(u.email) LIKE LOWER($3) OR
        CAST(o.id AS TEXT) LIKE $4
      )
      ORDER BY o.created_at DESC
      LIMIT $5
    `;

    const result = await query(queryText, [
      TENANT_ID,
      searchPattern,
      searchPattern,
      searchPattern,
      limit
    ]);

    return result.rows.map(order => formatOrderResult(order, detailed));
  } catch (error) {
    console.error('searchOrders error:', error);
    return [];
  }
}

async function searchCustomers(searchQuery, options = {}) {
  const { limit = 5, detailed = false } = options;
  
  try {
    const searchPattern = `%${searchQuery.trim()}%`;
    const queryText = `
      SELECT u.id, u.name, u.email, u.phone, u.created_at, u.updated_at,
             COUNT(o.id) as order_count,
             COALESCE(SUM(CAST(o.total_amount AS DECIMAL(10,2))), 0) as total_spent
      FROM users u
      LEFT JOIN orders o ON u.id = o.user_id AND o.tenant_id = $1
      WHERE u.tenant_id = $1 AND u.role = 'customer' AND (
        LOWER(u.name) LIKE LOWER($2) OR
        LOWER(u.email) LIKE LOWER($3) OR
        LOWER(u.phone) LIKE LOWER($4)
      )
      GROUP BY u.id, u.name, u.email, u.phone, u.created_at, u.updated_at
      ORDER BY u.created_at DESC
      LIMIT $5
    `;

    const result = await query(queryText, [
      TENANT_ID,
      searchPattern,
      searchPattern,
      searchPattern,
      limit
    ]);

    return result.rows.map(customer => formatCustomerResult(customer, detailed));
  } catch (error) {
    console.error('searchCustomers error:', error);
    return [];
  }
}

// Formatting functions

function formatProductResult(product, detailed = false) {
  const base = {
    id: product.id,
    title: product.title || product.name,
    subtitle: formatCurrency(product.price),
    url: `/products/${product.id}`,
    icon: '🏷️',
    status: product.status,
    thumbnail: getProductThumbnail(product),
    total_inventory: product.total_inventory || 0,
    variant_count: product.variant_count || 0
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

function formatOrderResult(order, detailed = false) {
  const base = {
    id: order.id,
    title: `Order #${formatOrderId(order.id)}`,
    subtitle: `${order.customer_name} • ${formatCurrency(order.total_amount)}`,
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

function formatCustomerResult(customer, detailed = false) {
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

// Utility functions

function getProductThumbnail(product) {
  if (product.images && Array.isArray(product.images) && product.images.length > 0) {
    const firstImage = product.images[0];
    // Handle both string URLs and image objects
    if (typeof firstImage === 'string') {
      return firstImage;
    } else if (firstImage && firstImage.url) {
      return firstImage.url;
    }
  }
  if (product.image) {
    // Handle both string URLs and image objects
    if (typeof product.image === 'string') {
      return product.image;
    } else if (product.image.url) {
      return product.image.url;
    }
  }
  return null;
}

function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount || 0);
}

function formatOrderId(orderId) {
  if (!orderId) return '';
  return orderId.toString().padStart(4, '0');
}

async function getSearchSuggestions(query, limit = 8) {
  if (!query || query.length < 2) {
    return [];
  }

  try {
    // Get quick results from each type
    const searchPromises = [
      searchProducts(query, { limit: 3, detailed: false }),
      searchOrders(query, { limit: 2, detailed: false }),
      searchCustomers(query, { limit: 3, detailed: false })
    ];

    const [products, orders, customers] = await Promise.all(searchPromises);

    const suggestions = [
      ...products.map(p => ({ ...p, type: 'product' })),
      ...orders.map(o => ({ ...o, type: 'order' })),
      ...customers.map(c => ({ ...c, type: 'customer' }))
    ].slice(0, limit);

    return suggestions;
  } catch (error) {
    console.error('getSearchSuggestions error:', error);
    return [];
  }
}