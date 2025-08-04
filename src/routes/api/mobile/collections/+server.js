import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';

export async function GET({ url }) {
  try {
    // Parse query parameters
    const includeProductCount = url.searchParams.get('include_product_count') === 'true';
    const status = url.searchParams.get('status') || 'active';
    const limit = parseInt(url.searchParams.get('limit')) || 50;
    const search = url.searchParams.get('search');

    // Build the query
    let queryText = `
      SELECT 
        c.*,
        ${includeProductCount ? `
        COALESCE(COUNT(DISTINCT CASE WHEN p.status = 'active' THEN p.id END), 0) as product_count,
        COALESCE(json_agg(
          DISTINCT jsonb_build_object(
            'id', p.id,
            'name', p.name,
            'thumbnail', CASE 
              WHEN p.images IS NOT NULL AND p.images != '[]' 
              THEN (p.images::jsonb->0->>'url')
              ELSE null 
            END
          )
        ) FILTER (WHERE p.id IS NOT NULL AND p.status = 'active'), '[]') as sample_products
        ` : '0 as product_count, \'[]\' as sample_products'}
      FROM collections c
      ${includeProductCount ? `
      LEFT JOIN product_collections pc ON c.id = pc.collection_id
      LEFT JOIN products p ON pc.product_id = p.id AND p.tenant_id = $1
      ` : ''}
      WHERE c.tenant_id = $1
    `;

    let params = [DEFAULT_TENANT_ID];
    let paramIndex = 2;

    // Collections don't have status in this schema
    // Skip status filter for now

    // Add search filter
    if (search && search.trim()) {
      queryText += ` AND (
        c.name ILIKE $${paramIndex} OR 
        c.description ILIKE $${paramIndex}
      )`;
      params.push(`%${search.trim()}%`);
      paramIndex++;
    }

    // Group by for aggregation
    queryText += ` GROUP BY c.id, c.name, c.description, c.created_at, c.updated_at, c.tenant_id, c.image_url, c.sort_order`;

    // Add sorting
    queryText += ` ORDER BY c.created_at DESC`;

    // Add limit
    queryText += ` LIMIT $${paramIndex}`;
    params.push(limit);

    // Execute query
    const result = await query(queryText, params);
    const collections = result.rows;

    // Transform collections to mobile-friendly format
    const mobileCollections = collections.map(collection => transformCollectionForMobile(collection));

    // Return CommentSold-style response
    const response = {
      collections: mobileCollections,
      total: collections.length,
      has_more: collections.length === limit
    };

    return jsonResponse(response);

  } catch (error) {
    console.error('Mobile collections API error:', error);
    return internalServerErrorResponse(`Failed to fetch collections: ${error.message}`);
  }
}

function transformCollectionForMobile(collection) {
  // Parse JSON fields safely
  let sampleProducts = [];

  try {
    sampleProducts = collection.sample_products ? 
      (typeof collection.sample_products === 'string' ? 
        JSON.parse(collection.sample_products) : 
        collection.sample_products
      ) : [];
  } catch (e) {
    sampleProducts = [];
  }

  // Get first product thumbnail as collection image
  const collectionImage = sampleProducts.length > 0 && sampleProducts[0].thumbnail ? 
    sampleProducts[0].thumbnail : null;

  return {
    id: collection.id,
    name: collection.name,
    title: collection.name, // Alias for compatibility
    description: collection.description,
    slug: collection.name ? collection.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : null,
    handle: collection.name ? collection.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : null, // Shopify compatibility
    
    // Timestamps
    created_at: Math.floor(new Date(collection.created_at).getTime() / 1000),
    updated_at: Math.floor(new Date(collection.updated_at).getTime() / 1000),
    
    // Status and availability (default active since no status column)
    status: 'active',
    is_active: true,
    
    // Product information
    product_count: parseInt(collection.product_count || 0),
    products_count: parseInt(collection.product_count || 0), // Alternative naming
    
    // Images
    image: collectionImage,
    featured_image: collectionImage,
    thumbnail: collectionImage,
    
    // Sample products for preview
    sample_products: sampleProducts.slice(0, 4).map(product => ({
      id: product.id,
      product_id: product.id,
      name: product.name,
      product_name: product.name,
      thumbnail: product.thumbnail,
      image_url: product.thumbnail
    })),
    
    // Mobile-specific enhancements
    display_name: collection.name,
    short_description: collection.description ? 
      collection.description.substring(0, 100) + (collection.description.length > 100 ? '...' : '') : 
      null,
    
    // SEO and metadata
    seo_title: collection.name,
    seo_description: collection.description ? collection.description.substring(0, 160) : null,
    
    // Collection categorization
    collection_type: 'custom', // Can be enhanced
    is_featured: false, // Can be enhanced
    sort_order: 0, // Can be enhanced
    
    // Additional mobile fields
    color_theme: null, // Can be enhanced
    banner_image: null, // Can be enhanced
    icon: null, // Can be enhanced
    
    // CommentSold compatibility
    collection_id: collection.id,
    collection_name: collection.name
  };
}