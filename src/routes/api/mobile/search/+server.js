import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse, badRequestResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID, DEFAULT_MOBILE_USER_ID, PLUGIN_EVENTS } from '$lib/constants.js';
import { PluginService } from '$lib/services/PluginService.js';
import { buildSearchPerformedPayload, buildSearchNoResultsPayload } from '$lib/payloads/index.js';

export async function GET({ url }) {
  const startTime = Date.now();
  try {
    const searchQuery = url.searchParams.get('q') || url.searchParams.get('query');
    const limit = parseInt(url.searchParams.get('limit')) || 20;
    const page = parseInt(url.searchParams.get('page')) || 1;
    const offset = (page - 1) * limit;
    const collectionId = url.searchParams.get('collection_id');
    const sortBy = url.searchParams.get('sort_by') || 'relevance';
    const minPrice = parseFloat(url.searchParams.get('min_price')) || null;
    const maxPrice = parseFloat(url.searchParams.get('max_price')) || null;

    if (!searchQuery || searchQuery.trim().length === 0) {
      return badRequestResponse('Search query is required');
    }

    const searchTerm = searchQuery.trim();

    // Build search query with relevance scoring
    let queryText = `
      SELECT 
        p.*,
        COALESCE(json_agg(
          DISTINCT jsonb_build_object(
            'id', c.id,
            'name', c.name
          )
        ) FILTER (WHERE c.id IS NOT NULL), '[]') as collections,
        -- Relevance scoring
        (
          CASE 
            WHEN LOWER(p.title) = LOWER($2) THEN 100
            WHEN LOWER(p.title) LIKE LOWER($2 || '%') THEN 90
            WHEN LOWER(p.title) LIKE LOWER('%' || $2 || '%') THEN 80
            ELSE 0
          END +
          CASE 
            WHEN LOWER(p.description) LIKE LOWER('%' || $2 || '%') THEN 40
            ELSE 0
          END +
          CASE 
            WHEN EXISTS (
              SELECT 1 FROM unnest(p.tags) tag 
              WHERE LOWER(tag) = LOWER($2)
            ) THEN 50
            WHEN EXISTS (
              SELECT 1 FROM unnest(p.tags) tag 
              WHERE LOWER(tag) LIKE LOWER('%' || $2 || '%')
            ) THEN 30
            ELSE 0
          END
        ) as relevance_score
      FROM products_new p
      LEFT JOIN product_collections pc ON p.id = pc.product_id
      LEFT JOIN collections c ON pc.collection_id = c.id AND c.tenant_id = $1
      WHERE p.tenant_id = $1 
        AND p.status = 'active'
        AND (
          p.title ILIKE $3 OR 
          p.description ILIKE $3 OR
          EXISTS (
            SELECT 1 FROM unnest(p.tags) tag 
            WHERE tag ILIKE $3
          )
        )
    `;

    let params = [DEFAULT_TENANT_ID, searchTerm, `%${searchTerm}%`];
    let paramIndex = 4;

    // Add collection filter
    if (collectionId) {
      queryText += ` AND pc.collection_id = $${paramIndex}`;
      params.push(collectionId);
      paramIndex++;
    }

    // Add price filters - TODO: Implement with product variants
    // Price filtering disabled for new product structure compatibility
    // if (minPrice !== null) {
    //   queryText += ` AND p.price >= $${paramIndex}`;
    //   params.push(minPrice);
    //   paramIndex++;
    // }

    // if (maxPrice !== null) {
    //   queryText += ` AND p.price <= $${paramIndex}`;
    //   params.push(maxPrice);
    //   paramIndex++;
    // }

    // Group by for aggregation
    queryText += ` GROUP BY p.id`;

    // Add sorting
    switch (sortBy) {
      case 'relevance':
        queryText += ` ORDER BY relevance_score DESC, p.created_at DESC`;
        break;
      case 'price_asc':
        queryText += ` ORDER BY p.price ASC`;
        break;
      case 'price_desc':
        queryText += ` ORDER BY p.price DESC`;
        break;
      case 'name_asc':
        queryText += ` ORDER BY p.name ASC`;
        break;
      case 'name_desc':
        queryText += ` ORDER BY p.name DESC`;
        break;
      case 'newest':
        queryText += ` ORDER BY p.created_at DESC`;
        break;
      case 'oldest':
        queryText += ` ORDER BY p.created_at ASC`;
        break;
      default:
        queryText += ` ORDER BY relevance_score DESC, p.created_at DESC`;
    }

    // Add pagination
    queryText += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    // Execute search query
    const result = await query(queryText, params);
    const products = result.rows;

    // Transform products for mobile
    const mobileProducts = products.map(product => transformProductForMobile(product, searchTerm));

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(DISTINCT p.id) as total
      FROM products_new p
      LEFT JOIN product_collections pc ON p.id = pc.product_id
      WHERE p.tenant_id = $1 
        AND p.status = 'active'
        AND (
          p.title ILIKE $2 OR 
          p.description ILIKE $2 OR
          EXISTS (
            SELECT 1 FROM unnest(p.tags) tag 
            WHERE tag ILIKE $2
          )
        )
    `;

    let countParams = [DEFAULT_TENANT_ID, `%${searchTerm}%`];
    let countParamIndex = 3;

    if (collectionId) {
      countQuery += ` AND pc.collection_id = $${countParamIndex}`;
      countParams.push(collectionId);
      countParamIndex++;
    }

    // Price filtering disabled for new product structure compatibility  
    // if (minPrice !== null) {
    //   countQuery += ` AND p.price >= $${countParamIndex}`;
    //   countParams.push(minPrice);
    //   countParamIndex++;
    // }

    // if (maxPrice !== null) {
    //   countQuery += ` AND p.price <= $${countParamIndex}`;
    //   countParams.push(maxPrice);
    //   countParamIndex++;
    // }

    const countResult = await query(countQuery, countParams);
    const total = parseInt(countResult.rows[0]?.total || 0);

    // Generate search suggestions for empty results
    const suggestions = total === 0 ? await generateSearchSuggestions(searchTerm) : [];

    // Trigger search events
    try {
      const searchTimeMs = Date.now() - startTime;
      const searchId = `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const filtersApplied = {
        collection_id: collectionId,
        min_price: minPrice,
        max_price: maxPrice,
        sort_by: sortBy
      };
      
      if (total === 0) {
        const eventPayload = buildSearchNoResultsPayload({
          searchId,
          query: searchTerm,
          userId: DEFAULT_MOBILE_USER_ID,
          searchTimeMs,
          suggestions,
          filtersApplied
        });
        
        await PluginService.triggerEvent(DEFAULT_TENANT_ID, PLUGIN_EVENTS.SEARCH_NO_RESULTS, eventPayload);
        console.log('📤 Search no results event triggered for query:', searchTerm);
      } else {
        const eventPayload = buildSearchPerformedPayload({
          searchId,
          query: searchTerm,
          userId: DEFAULT_MOBILE_USER_ID,
          resultsCount: total,
          searchTimeMs,
          filtersApplied
        });
        
        await PluginService.triggerEvent(DEFAULT_TENANT_ID, PLUGIN_EVENTS.SEARCH_PERFORMED, eventPayload);
        console.log('📤 Search performed event triggered for query:', searchTerm, 'Results:', total);
      }
    } catch (pluginError) {
      console.error('Error triggering search plugin event:', pluginError);
    }

    // Return search results
    const response = {
      query: searchTerm,
      products: mobileProducts,
      total: total,
      page: page,
      limit: limit,
      total_pages: Math.ceil(total / limit),
      has_more: (page * limit) < total,
      search_time: new Date().toISOString(),
      suggestions: suggestions,
      filters: {
        collection_id: collectionId,
        min_price: minPrice,
        max_price: maxPrice,
        sort_by: sortBy
      }
    };

    return jsonResponse(response);

  } catch (error) {
    console.error('Mobile search API error:', error);
    return internalServerErrorResponse(`Search failed: ${error.message}`);
  }
}

function transformProductForMobile(product, searchTerm) {
  // Parse JSON fields safely
  let images = [];
  let variants = [];
  let tags = [];
  let collections = [];

  try {
    images = product.images ? (typeof product.images === 'string' ? JSON.parse(product.images) : product.images) : [];
  } catch (e) {
    images = [];
  }

  try {
    variants = product.variants ? (typeof product.variants === 'string' ? JSON.parse(product.variants) : product.variants) : [];
  } catch (e) {
    variants = [];
  }

  try {
    tags = product.tags ? (Array.isArray(product.tags) ? product.tags : JSON.parse(product.tags)) : [];
  } catch (e) {
    tags = [];
  }

  try {
    collections = product.collections ? (typeof product.collections === 'string' ? JSON.parse(product.collections) : product.collections) : [];
  } catch (e) {
    collections = [];
  }

  // Highlight search matches
  const highlightText = (text, term) => {
    if (!text || !term) return text;
    const regex = new RegExp(`(${term})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  };

  return {
    id: product.id, // Our internal database UUID
    external_id: product.external_id, // CommentSold product ID
    product_id: product.external_id || product.id, // For backward compatibility
    post_id: product.external_id || product.id, // Use external_id if available
    created_at: Math.floor(new Date(product.created_at).getTime() / 1000),
    product_name: product.name,
    highlighted_name: highlightText(product.name, searchTerm),
    description: product.description,
    highlighted_description: highlightText(product.description?.substring(0, 200), searchTerm),
    quantity: product.inventory_count || 0,
    price: product.price || 0,
    price_label: product.price ? `$${product.price}` : null,
    formatted_price: product.price ? `$${parseFloat(product.price).toFixed(2)}` : 'Price on request',
    brand: null, // Not available in current schema
    highlighted_brand: null,
    sku: null, // Not available in current schema
    
    // Images
    thumbnail: images.length > 0 ? (typeof images[0] === 'string' ? images[0] : images[0]?.url || images[0]) : null,
    filename: images.length > 0 ? (typeof images[0] === 'string' ? images[0] : images[0]?.url || images[0]) : null,
    image_urls: images.map(img => typeof img === 'string' ? img : (img?.url || img)),
    primary_image: images.length > 0 ? (typeof images[0] === 'string' ? images[0] : images[0]?.url || images[0]) : null,
    
    // Status and availability
    status: product.status,
    is_available: product.status === 'active' && product.inventory_count > 0,
    is_out_of_stock: (product.inventory_count || 0) === 0,
    
    // Categories and tags
    tags: tags,
    highlighted_tags: tags.map(tag => highlightText(tag, searchTerm)),
    collections: collections,
    collection_names: collections.map(c => c.name).filter(Boolean),
    
    // Search-specific fields
    relevance_score: product.relevance_score || 0,
    match_type: getMatchType(product, searchTerm),
    
    // Inventory info
    inventory: variants.length > 0 ? variants.map(variant => ({
      size: variant.size || variant.option1_value || 'One Size',
      color: variant.color || variant.option2_value || 'Default',
      quantity: variant.inventory_count || variant.quantity || 0,
      price: variant.price || product.price || 0
    })) : [{
      size: 'One Size',
      color: 'Default',
      quantity: product.inventory_count || 0,
      price: product.price || 0
    }],
    
    // Additional mobile fields
    short_description: product.description ? product.description.substring(0, 100) + (product.description.length > 100 ? '...' : '') : null,
    variant_count: variants.length || 1,
    
    // SEO
    handle: product.name ? product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : null
  };
}

function getMatchType(product, searchTerm) {
  const term = searchTerm.toLowerCase();
  const name = (product.name || '').toLowerCase();

  if (name === term) return 'exact_title';
  if (name.startsWith(term)) return 'title_start';
  if (name.includes(term)) return 'title_contains';
  
  // Check tags
  try {
    const tags = product.tags ? (Array.isArray(product.tags) ? product.tags : JSON.parse(product.tags)) : [];
    if (tags.some(tag => tag.toLowerCase() === term)) return 'exact_tag';
    if (tags.some(tag => tag.toLowerCase().includes(term))) return 'tag_contains';
  } catch (e) {
    // Skip tag checking
  }

  if ((product.description || '').toLowerCase().includes(term)) return 'description_contains';
  
  return 'other';
}

async function generateSearchSuggestions(searchTerm) {
  try {
    // Get popular products and tags for suggestions
    const suggestionsQuery = `
      SELECT DISTINCT 
        p.title as name,
        unnest(p.tags) as tag,
        p.vendor as brand
      FROM products_new p
      WHERE p.tenant_id = $1 
        AND p.status = 'active'
        AND (
          p.title ILIKE $2 OR
          p.vendor ILIKE $2 OR
          EXISTS (
            SELECT 1 FROM unnest(p.tags) tag 
            WHERE tag ILIKE $2
          )
        )
      LIMIT 5
    `;

    const result = await query(suggestionsQuery, [DEFAULT_TENANT_ID, `%${searchTerm.substring(0, searchTerm.length - 1)}%`]);
    
    const suggestions = [];
    const seen = new Set();

    result.rows.forEach(row => {
      if (row.name && !seen.has(row.name.toLowerCase())) {
        suggestions.push(row.name);
        seen.add(row.name.toLowerCase());
      }
      if (row.brand && !seen.has(row.brand.toLowerCase())) {
        suggestions.push(row.brand);
        seen.add(row.brand.toLowerCase());
      }
      if (row.tag && !seen.has(row.tag.toLowerCase())) {
        suggestions.push(row.tag);
        seen.add(row.tag.toLowerCase());
      }
    });

    return suggestions.slice(0, 5);
  } catch (error) {
    console.error('Error generating suggestions:', error);
    return [];
  }
}