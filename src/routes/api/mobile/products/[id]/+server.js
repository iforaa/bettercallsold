import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse, notFoundResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';

export async function GET({ params }) {
  try {
    const productId = params.id;
    console.log('🔍 BetterCallSold API: Product details requested for ID:', productId, 'Type:', typeof productId);

    // Search by product ID (UUID) and include inventory
    const productQuery = `
      SELECT 
        p.*,
        COALESCE(json_agg(
          DISTINCT jsonb_build_object(
            'id', c.id,
            'name', c.name
          )
        ) FILTER (WHERE c.id IS NOT NULL), '[]') as collections,
        COALESCE(json_agg(
          DISTINCT jsonb_build_object(
            'id', i.id,
            'quantity', i.quantity,
            'variant_combination', i.variant_combination,
            'color', COALESCE(i.variant_combination->>'color', i.color),
            'size', COALESCE(i.variant_combination->>'size', i.size),
            'price', i.price,
            'sku', i.sku,
            'position', i.position
          )
        ) FILTER (WHERE i.id IS NOT NULL), '[]') as inventory_items
      FROM products p
      LEFT JOIN product_collections pc ON p.id = pc.product_id
      LEFT JOIN collections c ON pc.collection_id = c.id AND c.tenant_id = $1
      LEFT JOIN inventory i ON p.id = i.product_id AND i.tenant_id = $1
      WHERE p.tenant_id = $1 AND p.id::text = $2
      GROUP BY p.id
      LIMIT 1
    `;

    console.log('🔍 BetterCallSold API: Executing query with params:', [DEFAULT_TENANT_ID, productId]);
    const result = await query(productQuery, [DEFAULT_TENANT_ID, productId]);

    if (result.rows.length === 0) {
      console.log('❌ BetterCallSold API: Product not found for ID:', productId);
      return notFoundResponse('Product not found');
    }

    const product = result.rows[0];
    console.log('✅ BetterCallSold API: Found product:', product.name, 'ID:', product.id);

    // Transform to mobile format (similar to CommentSold individual product response)
    const mobileProduct = transformProductDetailsForMobile(product);
    console.log('✅ BetterCallSold API: Transformed product for mobile');

    // Return as array (matching CommentSold format)
    return jsonResponse([mobileProduct]);

  } catch (error) {
    console.error('❌ BetterCallSold API: Product details error:', error);
    console.error('❌ BetterCallSold API: Error stack:', error.stack);
    return internalServerErrorResponse(`Failed to fetch product details: ${error.message}`);
  }
}

function transformProductDetailsForMobile(product) {
  // Parse JSON fields safely
  let images = [];
  let tags = [];
  let collections = [];
  let inventoryItems = [];

  try {
    images = product.images ? (typeof product.images === 'string' ? JSON.parse(product.images) : product.images) : [];
  } catch (e) {
    images = [];
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

  try {
    inventoryItems = product.inventory_items ? (typeof product.inventory_items === 'string' ? JSON.parse(product.inventory_items) : product.inventory_items) : [];
  } catch (e) {
    inventoryItems = [];
  }

  // Calculate total inventory from items
  const totalInventory = inventoryItems.reduce((total, item) => total + (item.quantity || 0), 0);

  // Enhanced transform for detailed view
  return {
    id: product.id, // Our internal database UUID
    external_id: null, // CommentSold product ID (not available yet)
    product_id: product.id, // Use internal ID
    post_id: product.id,
    created_at: Math.floor(new Date(product.created_at).getTime() / 1000),
    updated_at: Math.floor(new Date(product.updated_at).getTime() / 1000),
    product_name: product.name,
    description: product.description,
    store_description: product.description,
    quantity: totalInventory,
    price: product.price || 0,
    price_label: product.price ? `$${product.price}` : null,
    product_type: product.product_type || 'physical',
    style: product.style || null,
    brand: product.brand || null,
    sku: product.sku || null,
    barcode: product.barcode || null,
    
    // Enhanced image handling for details
    thumbnail: images.length > 0 ? (typeof images[0] === 'string' ? images[0] : images[0]?.url || images[0]) : null,
    filename: images.length > 0 ? (typeof images[0] === 'string' ? images[0] : images[0]?.url || images[0]) : null,
    
    // Detailed media information
    extra_media: images.map((img, index) => {
      const imageUrl = typeof img === 'string' ? img : (img?.url || img);
      return {
        media_type: 'static',
        media_url: imageUrl,
        thumbnail_url: imageUrl,
        position: index + 1,
        alt_text: product.name,
        width: img?.width || null,
        height: img?.height || null
      };
    }),
    
    // Videos (placeholder for future enhancement)
    videos: [],
    has_video: false,
    video_url: null,
    
    // Inventory from real inventory table
    inventory: inventoryItems.length > 0 ? inventoryItems.map((item, index) => ({
      position: item.position || index + 1,
      price: parseFloat(item.price) || parseFloat(product.price) || 0,
      inventory_id: item.id, // Real inventory UUID
      quantity: item.quantity || 0,
      allow_oversell: false,
      color: item.color || 'Default',
      size: item.size || 'One Size',
      attr1: item.size || 'One Size',
      attr2: item.color || 'Default',
      attr3: '',
      // Additional fields for compatibility
      id: item.id,
      sku: item.sku || `${product.sku || product.id}-${index}`,
      barcode: product.barcode || null,
      weight: null,
      compare_at_price: null,
      option1_name: 'Size',
      option1_value: item.size || 'One Size',
      option2_name: 'Color',
      option2_value: item.color || 'Default',
      option3_name: null,
      option3_value: null,
      image_url: images.length > 0 ? (typeof images[0] === 'string' ? images[0] : images[0]?.url) : null,
      available: (item.quantity || 0) > 0
    })) : [],
    
    // Enhanced mobile fields
    status: product.status,
    tags: tags,
    collections: collections,
    collection_names: collections.map(c => c.name).filter(Boolean),
    collection_ids: collections.map(c => c.id).filter(Boolean),
    
    // Mobile-specific enhancements for detail view
    image_urls: images.map(img => typeof img === 'string' ? img : (img?.url || img)),
    primary_image: images.length > 0 ? (typeof images[0] === 'string' ? images[0] : images[0]?.url || images[0]) : null,
    all_images: images.map((img, index) => ({
      url: typeof img === 'string' ? img : (img?.url || img),
      position: index + 1,
      alt: product.name
    })),
    
    // Product options for mobile UI
    options: extractProductOptions(inventoryItems),
    
    // Availability and pricing
    is_available: product.status === 'active' && totalInventory > 0,
    formatted_price: product.price ? `$${parseFloat(product.price).toFixed(2)}` : 'Price on request',
    compare_at_price: null, // Can be enhanced
    formatted_compare_at_price: null,
    
    // SEO and metadata
    seo_title: product.name,
    seo_description: product.description ? product.description.substring(0, 160) : null,
    handle: product.name ? product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : null,
    
    // Additional CommentSold compatibility
    is_shop_the_look: false,
    shop_the_look: [],
    badge_label: product.status === 'active' ? null : product.status.toUpperCase(),
    strikethrough_label: null,
    allow_waitlist: totalInventory === 0,
    featured_in_live: false,
    
    // Timestamps
    created_date: product.created_at,
    updated_date: product.updated_at,
    
    // Additional product details
    weight: product.weight || null,
    weight_unit: product.weight_unit || 'kg',
    dimensions: {
      length: product.length || null,
      width: product.width || null,
      height: product.height || null
    },
    
    // Mobile app features
    is_favorite: false, // Can be enhanced with user favorites
    rating: 0, // Can be enhanced with reviews
    review_count: 0,
    
    // Stock information
    low_stock_threshold: 10,
    is_low_stock: totalInventory <= 10 && totalInventory > 0,
    is_out_of_stock: totalInventory === 0,
    
    // Related products (placeholder)
    related_products: [],
    
    // Shipping information
    requires_shipping: true,
    is_digital: false,
    
    // Tax information
    is_taxable: true,
    tax_code: product.tax_code || null
  };
}

function extractProductOptions(inventoryItems) {
  if (!inventoryItems || inventoryItems.length === 0) {
    return [];
  }

  const options = [];
  const sizeSet = new Set();
  const colorSet = new Set();

  // Extract unique sizes and colors from inventory
  inventoryItems.forEach(item => {
    if (item.size) {
      sizeSet.add(item.size);
    }
    if (item.color) {
      colorSet.add(item.color);
    }
  });

  // Add size option if there are multiple sizes
  if (sizeSet.size > 1) {
    options.push({
      name: 'Size',
      values: Array.from(sizeSet)
    });
  }

  // Add color option if there are multiple colors
  if (colorSet.size > 1) {
    options.push({
      name: 'Color',
      values: Array.from(colorSet)
    });
  }

  return options;
}