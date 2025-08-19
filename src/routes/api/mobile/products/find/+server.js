import { query, getCached, setCache } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse, badRequestResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';

export async function GET({ url }) {
  try {
    // Parse query parameters (similar to CommentSold API)
    const lastPostId = url.searchParams.get('last_post_id');
    const collectionIds = url.searchParams.get('collection_ids');
    const colors = url.searchParams.get('colors');
    const sizes = url.searchParams.get('sizes');
    const limit = parseInt(url.searchParams.get('limit')) || 20;
    const page = parseInt(url.searchParams.get('page')) || 1;
    const search = url.searchParams.get('search');
    const status = url.searchParams.get('status') || 'active';
    const sortBy = url.searchParams.get('sort_by') || 'created_at';
    const sortOrder = url.searchParams.get('sort_order') || 'desc';

    // Create cache key based on query parameters
    const cacheKey = `mobile_products_find_${DEFAULT_TENANT_ID}_${lastPostId || ''}_${collectionIds || ''}_${colors || ''}_${sizes || ''}_${limit}_${page}_${search || ''}_${status}_${sortBy}_${sortOrder}`;
    
    // Try to get from cache first
    const cachedProducts = await getCached(cacheKey);
    if (cachedProducts) {
      console.log(`🚀 Cache hit for mobile products find`);
      return jsonResponse(cachedProducts);
    }
    
    console.log(`🔍 Cache miss for mobile products find, fetching from database`);

    // Build the base query
    let queryText = `
      SELECT 
        p.*,
        COALESCE(json_agg(
          DISTINCT jsonb_build_object(
            'id', c.id,
            'name', c.name
          )
        ) FILTER (WHERE c.id IS NOT NULL), '[]') as collections,
        COALESCE(COUNT(DISTINCT pc.collection_id), 0) as collection_count,
        -- Get variant price information
        MIN(pv.price) as min_price,
        MAX(pv.price) as max_price,
        COUNT(DISTINCT pv.id) as variant_count,
        -- Get variants info for inventory
        COALESCE(json_agg(
          DISTINCT jsonb_build_object(
            'id', pv.id,
            'title', pv.title,
            'price', pv.price,
            'option1', pv.option1,
            'option2', pv.option2,
            'option3', pv.option3,
            'sku', pv.sku,
            'barcode', pv.barcode,
            'position', pv.position
          )
        ) FILTER (WHERE pv.id IS NOT NULL), '[]') as variants
      FROM products_new p
      LEFT JOIN product_collections pc ON p.id = pc.product_id
      LEFT JOIN collections c ON pc.collection_id = c.id AND c.tenant_id = $1
      LEFT JOIN product_variants_new pv ON pv.product_id = p.id
      WHERE p.tenant_id = $1
    `;

    let params = [DEFAULT_TENANT_ID];
    let paramIndex = 2;

    // Add status filter
    if (status && status !== 'all') {
      queryText += ` AND p.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    // Add collection filter (similar to CommentSold collection_ids)
    if (collectionIds) {
      const collectionIdArray = collectionIds.split(',').map(id => id.trim()).filter(id => id.length > 0);
      if (collectionIdArray.length > 0) {
        queryText += ` AND pc.collection_id = ANY($${paramIndex})`;
        params.push(collectionIdArray);
        paramIndex++;
      }
    }

    // Add search filter
    if (search && search.trim()) {
      queryText += ` AND (
        p.title ILIKE $${paramIndex} OR 
        p.description ILIKE $${paramIndex} OR
        EXISTS (
          SELECT 1 FROM unnest(p.tags) tag 
          WHERE tag ILIKE $${paramIndex}
        )
      )`;
      params.push(`%${search.trim()}%`);
      paramIndex++;
    }

    // Add color filter (check inventory table for real color data, case-insensitive)
    if (colors) {
      const colorArray = colors.split(',').map(c => c.trim());
      queryText += ` AND EXISTS (
        SELECT 1 FROM inventory i 
        WHERE i.product_id = p.id 
        AND i.tenant_id = $1 
        AND (LOWER(i.color) = ANY($${paramIndex}) OR LOWER(i.variant_combination->>'color') = ANY($${paramIndex}))
      )`;
      params.push(colorArray.map(c => c.toLowerCase()));
      paramIndex++;
    }

    // Add size filter (check inventory table for real size data, case-insensitive)
    if (sizes) {
      const sizeArray = sizes.split(',').map(s => s.trim());
      queryText += ` AND EXISTS (
        SELECT 1 FROM inventory i 
        WHERE i.product_id = p.id 
        AND i.tenant_id = $1 
        AND (LOWER(i.size) = ANY($${paramIndex}) OR LOWER(i.variant_combination->>'size') = ANY($${paramIndex}))
      )`;
      params.push(sizeArray.map(s => s.toLowerCase()));
      paramIndex++;
    }

    // Add pagination with last_post_id (CommentSold style)
    if (lastPostId) {
      queryText += ` AND p.id < $${paramIndex}`;
      params.push(lastPostId);
      paramIndex++;
    }

    // Group by for aggregation
    queryText += ` GROUP BY p.id`;

    // Add sorting
    const validSortFields = {
      'created_at': 'p.created_at',
      'updated_at': 'p.updated_at',
      'name': 'p.title',
      'price': 'p.price',
      'inventory_count': 'p.inventory_count'
    };

    const sortField = validSortFields[sortBy] || 'p.created_at';
    const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    queryText += ` ORDER BY ${sortField} ${order}`;

    // Add limit
    queryText += ` LIMIT $${paramIndex}`;
    params.push(limit);

    // Execute query
    const result = await query(queryText, params);
    const products = result.rows;

    // Transform products to mobile-friendly format (similar to CommentSold)
    const mobileProducts = products.map(product => transformProductForMobile(product));

    // Get total count for pagination info
    let totalCountQuery = `
      SELECT COUNT(DISTINCT p.id) as total
      FROM products_new p
      LEFT JOIN product_collections pc ON p.id = pc.product_id
      WHERE p.tenant_id = $1
    `;
    let totalParams = [DEFAULT_TENANT_ID];
    let totalParamIndex = 2;

    if (status && status !== 'all') {
      totalCountQuery += ` AND p.status = $${totalParamIndex}`;
      totalParams.push(status);
      totalParamIndex++;
    }

    if (collectionIds) {
      const collectionIdArray = collectionIds.split(',').map(id => id.trim()).filter(id => id.length > 0);
      if (collectionIdArray.length > 0) {
        totalCountQuery += ` AND pc.collection_id = ANY($${totalParamIndex})`;
        totalParams.push(collectionIdArray);
        totalParamIndex++;
      }
    }

    if (search && search.trim()) {
      totalCountQuery += ` AND (
        p.title ILIKE $${totalParamIndex} OR 
        p.description ILIKE $${totalParamIndex} OR
        EXISTS (
          SELECT 1 FROM unnest(p.tags) tag 
          WHERE tag ILIKE $${totalParamIndex}
        )
      )`;
      totalParams.push(`%${search.trim()}%`);
      totalParamIndex++;
    }

    const totalResult = await query(totalCountQuery, totalParams);
    const total = parseInt(totalResult.rows[0]?.total || 0);

    // Return CommentSold-style response
    const response = {
      products: mobileProducts,
      total: total,
      page: page,
      limit: limit,
      has_more: products.length === limit,
      last_post_id: products.length > 0 ? products[products.length - 1].product_id : null,
      filters: {
        collection_ids: collectionIds,
        colors: colors,
        sizes: sizes,
        search: search,
        status: status
      }
    };
    
    // Cache the products for 3 minutes (180 seconds) - shorter TTL for search results
    await setCache(cacheKey, response, 180);

    return jsonResponse(response);

  } catch (error) {
    console.error('Mobile products API error:', error);
    return internalServerErrorResponse(`Failed to fetch products: ${error.message}`);
  }
}

function transformProductForMobile(product) {
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

  // Transform to CommentSold-like format
  return {
    id: product.id, // Our internal database UUID
    external_id: null, // CommentSold product ID (not available yet)
    product_id: product.id, // Use internal ID
    post_id: product.id, // Use internal ID
    created_at: Math.floor(new Date(product.created_at).getTime() / 1000),
    updated_at: Math.floor(new Date(product.updated_at).getTime() / 1000),
    product_name: product.title,
    description: product.description,
    store_description: product.description, // Same as description
    quantity: product.inventory_count || 0,
    price: product.min_price || 0,
    price_label: product.min_price ? (product.min_price === product.max_price ? `$${product.min_price}` : `$${product.min_price} - $${product.max_price}`) : null,
    product_type: product.product_type || 'physical',
    style: product.style || null,
    brand: product.brand || null,
    sku: product.sku || null,
    barcode: product.barcode || null,
    
    // Images
    thumbnail: images.length > 0 ? (typeof images[0] === 'string' ? images[0] : images[0]?.url || images[0]) : null,
    filename: images.length > 0 ? (typeof images[0] === 'string' ? images[0] : images[0]?.url || images[0]) : null,
    extra_media: images.map((img, index) => ({
      media_type: 'static',
      media_url: typeof img === 'string' ? img : (img?.url || img),
      thumbnail_url: typeof img === 'string' ? img : (img?.url || img),
      position: index + 1
    })),
    
    // Inventory and variants - now using the variants from the query
    inventory: variants.map(variant => ({
      size: variant.option2 || variant.size || 'One Size',
      color: variant.option1 || variant.color || 'Default',
      quantity: variant.inventory_count || variant.quantity || 0,
      price: variant.price || 0,
      sku: variant.sku || null,
      barcode: variant.barcode || null
    })),
    
    // Additional mobile-friendly fields
    status: product.status,
    tags: tags,
    collections: collections,
    has_video: false, // Can be enhanced later
    video_url: null,
    is_shop_the_look: false,
    shop_the_look: [],
    badge_label: product.status === 'active' ? null : product.status.toUpperCase(),
    strikethrough_label: null,
    allow_waitlist: product.inventory_count === 0,
    featured_in_live: false,
    
    // Mobile-specific enhancements
    image_urls: images.map(img => typeof img === 'string' ? img : (img?.url || img)),
    primary_image: images.length > 0 ? (typeof images[0] === 'string' ? images[0] : images[0]?.url || images[0]) : null,
    variant_count: variants.length || 1,
    collection_names: collections.map(c => c.name).filter(Boolean),
    collection_ids: collections.map(c => c.id).filter(Boolean),
    
    // Compatibility with existing mobile apps
    is_available: product.status === 'active' && product.inventory_count > 0,
    formatted_price: product.min_price ? (product.min_price === product.max_price ? `$${parseFloat(product.min_price).toFixed(2)}` : `$${parseFloat(product.min_price).toFixed(2)} - $${parseFloat(product.max_price).toFixed(2)}`) : 'Price on request',
    short_description: product.description ? product.description.substring(0, 100) + (product.description.length > 100 ? '...' : '') : null
  };
}