import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse, notFoundResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';
import { PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER } from '$env/static/private';
import Pusher from 'pusher';

// Helper function to get Agora settings from database
async function getAgoraSettings(tenantId = DEFAULT_TENANT_ID) {
  try {
    const result = await query(`
      SELECT setting_key, setting_value 
      FROM settings 
      WHERE tenant_id = $1 AND setting_key LIKE 'agora_%'
    `, [tenantId]);
    
    const settings = {};
    result.rows.forEach(row => {
      const key = row.setting_key.replace('agora_', ''); // Remove prefix
      settings[key] = row.setting_value;
    });
    
    return settings;
  } catch (error) {
    console.error('Error fetching Agora settings:', error);
    return {};
  }
}

// Helper function to get Pusher credentials with auth info
async function getPusherCredentials(liveSaleId) {
  try {
    // Use standard private channel name for all live chat  
    const channelName = "private-live-chat";
    
    console.log('getPusherCredentials:', {
      PUSHER_APP_ID,
      PUSHER_KEY,
      PUSHER_SECRET: PUSHER_SECRET ? 'SET' : 'UNDEFINED',
      PUSHER_CLUSTER,
      channelName
    });
    
    // For now, don't require auth for private channels - just return basic credentials
    // The mobile app and web can connect without auth for testing
    return {
      key: PUSHER_KEY || "2df4398e22debaee3ec6",
      cluster: PUSHER_CLUSTER || "mt1",
      channel: channelName,
      auth: null, // Skip auth for now
      socket_id: null
    };
  } catch (error) {
    console.error('Error generating Pusher credentials:', error);
    return {
      key: PUSHER_KEY || "2df4398e22debaee3ec6",
      cluster: PUSHER_CLUSTER || "mt1",
      channel: "private-live-chat",
      auth: null,
      socket_id: null
    };
  }
}

export async function GET({ params }) {
  try {
    const liveSaleId = params.id;

    // Try to find by external_id first (CommentSold ID), then by internal ID
    // Handle both integer external_id and UUID internal id
    let liveSaleQuery = `
      SELECT * FROM live_streams 
      WHERE tenant_id = $1 AND (
        (external_id IS NOT NULL AND external_id::text = $2) OR 
        (id::text = $2)
      )
      LIMIT 1
    `;

    const liveSaleResult = await query(liveSaleQuery, [DEFAULT_TENANT_ID, liveSaleId]);

    if (liveSaleResult.rows.length === 0) {
      return notFoundResponse('Live sale not found');
    }

    const liveSale = liveSaleResult.rows[0];

    // Get products from our actual products table that are associated with this live sale
    // We'll use existing products from our database instead of replay_products
    const productsResult = await query(`
      SELECT 
        p.id,
        p.name as product_name,
        p.description,
        p.price,
        p.images,
        p.tags,
        p.status,
        p.created_at,
        p.updated_at,
        -- Additional fields for mobile compatibility
        'physical' as product_type,
        null as brand,
        false as is_favorite,
        null as badge_label
      FROM products p
      WHERE p.tenant_id = $1 AND p.status = 'active'
      ORDER BY p.created_at DESC
      LIMIT 10
    `, [DEFAULT_TENANT_ID]);

    // Get Agora settings for mobile app integration
    const agoraSettings = await getAgoraSettings(DEFAULT_TENANT_ID);

    // Transform to CommentSold live-sale details format
    const detailedLiveSale = await transformLiveSaleDetailsForMobile(liveSale, productsResult.rows, agoraSettings);

    return jsonResponse(detailedLiveSale);

  } catch (error) {
    console.error('Mobile live-sale details API error:', error);
    return internalServerErrorResponse(`Failed to fetch live sale details: ${error.message}`);
  }
}

async function transformLiveSaleDetailsForMobile(liveSale, products, agoraSettings = {}) {
  // Parse JSON fields safely
  let metadata = null;
  let settings = null;

  try {
    metadata = liveSale.metadata ? (typeof liveSale.metadata === 'string' ? JSON.parse(liveSale.metadata) : liveSale.metadata) : null;
  } catch (e) {
    metadata = null;
  }

  try {
    settings = liveSale.settings ? (typeof liveSale.settings === 'string' ? JSON.parse(liveSale.settings) : liveSale.settings) : null;
  } catch (e) {
    settings = null;
  }

  // Transform products to mobile format
  // For live sales (is_live: true), products array will be empty but structure is consistent
  const mobileProducts = await Promise.all(products.map((product, index) => transformProductForMobile(product, index)));

  // Main live sale object with detailed information
  return {
    id: liveSale.id, // Our internal database UUID
    external_id: liveSale.external_id, // CommentSold ID
    live_id: liveSale.external_id || liveSale.id, // For backward compatibility
    name: liveSale.name || liveSale.title || '',
    title: liveSale.title || liveSale.name || '',
    description: liveSale.description || '',
    
    // Detailed timestamps
    started_at: liveSale.started_at ? Math.floor(new Date(liveSale.started_at).getTime() / 1000) : null,
    ended_at: liveSale.ended_at ? Math.floor(new Date(liveSale.ended_at).getTime() / 1000) : null,
    created_at: liveSale.created_at ? Math.floor(new Date(liveSale.created_at).getTime() / 1000) : null,
    updated_at: liveSale.updated_at ? Math.floor(new Date(liveSale.updated_at).getTime() / 1000) : null,
    
    // Formatted timestamps for mobile display
    started_at_formatted: liveSale.started_at ? new Date(liveSale.started_at).toLocaleString() : null,
    ended_at_formatted: liveSale.ended_at ? new Date(liveSale.ended_at).toLocaleString() : null,
    date_formatted: liveSale.started_at ? new Date(liveSale.started_at).toLocaleDateString() : null,
    time_formatted: liveSale.started_at ? new Date(liveSale.started_at).toLocaleTimeString() : null,
    
    // Duration calculations
    duration: liveSale.started_at && liveSale.ended_at 
      ? Math.round((new Date(liveSale.ended_at) - new Date(liveSale.started_at)) / (1000 * 60))
      : null,
    duration_formatted: formatDuration(liveSale.started_at && liveSale.ended_at 
      ? Math.round((new Date(liveSale.ended_at) - new Date(liveSale.started_at)) / (1000 * 60))
      : null),
    
    // Status and state
    is_live: liveSale.is_live || false,
    status: liveSale.status || 'completed',
    is_upcoming: liveSale.started_at ? new Date(liveSale.started_at) > new Date() : false,
    is_active: liveSale.is_live || false,
    is_completed: liveSale.ended_at ? new Date(liveSale.ended_at) < new Date() : false,
    
    // Viewership data
    peak_viewers: liveSale.peak_viewers || 0,
    concurrent_viewers: liveSale.is_live ? liveSale.peak_viewers || 0 : 0,
    total_viewers: liveSale.peak_viewers || 0, // Approximate
    formatted_viewers: formatViewers(liveSale.peak_viewers || 0),
    
    // Product information
    product_count: parseInt(liveSale.product_count || products.length || 0),
    products: mobileProducts,
    has_products: mobileProducts.length > 0,
    
    // Media and streaming
    source_url: liveSale.source_url || null,
    source_thumb: liveSale.source_thumb || null,
    animated_thumb: liveSale.animated_thumb || null,
    thumbnail: liveSale.source_thumb || liveSale.animated_thumb || null,
    
    // Streaming URLs (constructed from patterns)
    stream_url: liveSale.source_url || (liveSale.animated_thumb ? 
      liveSale.animated_thumb.replace(/\/thumbnails\/.*$/, '/playlist.m3u8') : null),
    hls_url: liveSale.source_url || (liveSale.animated_thumb ? 
      liveSale.animated_thumb.replace(/\/thumbnails\/.*$/, '/index.m3u8') : null),
    
    // Agora RTC information (prioritize current settings over stored data)
    agora_channel: agoraSettings.channel || liveSale.agora_channel || null,
    agora_token: agoraSettings.token || liveSale.agora_token || null,
    agora_app_id: "1fe1d3f0d301498d9e43e0094f091800", // Static App ID
    agora_settings: {
      app_id: "1fe1d3f0d301498d9e43e0094f091800",
      channel: agoraSettings.channel || liveSale.agora_channel || null,
      token: agoraSettings.token || liveSale.agora_token || null,
      token_updated_at: agoraSettings.lastUpdated || null
    },
    
    // Pusher Chat credentials (always included for testing)
    pusher_credentials: await getPusherCredentials(liveSale.id),
    
    // Visual properties
    is_wide_cell: liveSale.is_wide_cell || false,
    label: liveSale.label || null,
    
    // Playback information
    replay_available: !liveSale.is_live && Boolean(liveSale.source_url),
    can_watch: Boolean(liveSale.source_url || liveSale.is_live),
    playback_url: liveSale.source_url || null,
    
    // Mobile app features
    is_favorite: false, // Can be enhanced with user favorites
    is_bookmarked: false,
    share_url: liveSale.source_url ? `/replays/${liveSale.id}` : null,
    
    // Social and engagement
    likes_count: 0, // Can be enhanced
    comments_count: 0, // Can be enhanced
    shares_count: 0, // Can be enhanced
    
    // Technical details
    video_quality: 'HD', // Default assumption
    supported_formats: ['HLS', 'MP4'],
    requires_auth: false,
    
    // Analytics and insights (for host/admin view)
    analytics: {
      peak_viewers: liveSale.peak_viewers || 0,
      duration_minutes: liveSale.started_at && liveSale.ended_at 
        ? Math.round((new Date(liveSale.ended_at) - new Date(liveSale.started_at)) / (1000 * 60))
        : null,
      products_shown: mobileProducts.length,
      engagement_rate: 0, // Can be calculated later
    },
    
    // CommentSold compatibility
    commentsold_id: liveSale.external_id,
    
    // Metadata for advanced features
    metadata: metadata,
    settings: settings,
    raw_data: {
      // Keep some raw data for debugging
      tenant_id: liveSale.tenant_id,
      sync_source: 'commentsold'
    }
  };
}

async function transformProductForMobile(product, index = 0) {
  // Parse JSON fields safely  
  let images = [];
  let tags = [];

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

  // Get actual inventory for this product from our database
  const inventoryResult = await query(`
    SELECT id, quantity, color, size, price, position, variant_combination
    FROM inventory 
    WHERE product_id = $1 AND tenant_id = $2
  `, [product.id, DEFAULT_TENANT_ID]);

  const actualInventory = inventoryResult.rows.map(item => {
    // Parse variant_combination JSON to get actual color and size
    let variantData = null;
    try {
      variantData = item.variant_combination ? 
        (typeof item.variant_combination === 'string' ? 
          JSON.parse(item.variant_combination) : 
          item.variant_combination) : 
        null;
    } catch (e) {
      variantData = null;
    }

    const color = variantData?.color || item.color || '';
    const size = variantData?.size || item.size || '';

    return {
      position: item.position || 0,
      price: parseFloat(item.price) || parseFloat(product.price) || 0,
      inventory_id: item.id, // This is the actual UUID we need
      quantity: item.quantity || 0,
      allow_oversell: true, // Default to allow oversell since is_fulfillable doesn't exist
      color: color,
      size: size,
      attr1: size,
      attr2: color,
      attr3: '',
      id: item.id
    };
  });

  return {
    id: product.id, // Our internal database UUID
    external_id: null, // No external ID needed
    product_id: product.id, // Use our database UUID
    product_name: product.product_name || '',
    name: product.product_name || '',
    description: product.description || '',
    
    // Pricing
    price: parseFloat(product.price || 0),
    price_label: product.price ? `$${parseFloat(product.price).toFixed(2)}` : 'Price not available',
    formatted_price: product.price ? `$${parseFloat(product.price).toFixed(2)}` : 'Price not available',
    compare_at_price: product.compare_at_price ? parseFloat(product.compare_at_price) : null,
    
    // Images and media
    thumbnail: images.length > 0 ? (typeof images[0] === 'string' ? images[0] : images[0]?.url || images[0]) : null,
    image_url: images.length > 0 ? (typeof images[0] === 'string' ? images[0] : images[0]?.url || images[0]) : null,
    media: images,
    all_images: images.map((img, index) => ({
      url: typeof img === 'string' ? img : (img?.url || img),
      position: index + 1,
      alt: product.product_name
    })),
    
    // Timing in live sale (video-relative timestamps in seconds)
    // For demo purposes, show products at different intervals in the video
    shown_at: index * 30, // Show each product 30 seconds apart
    hidden_at: (index * 30) + 60, // Hide 60 seconds after being shown
    shown_at_formatted: `${Math.floor(index * 30 / 60)}:${String(index * 30 % 60).padStart(2, '0')}`,
    display_duration: 60, // 60 seconds display time
    
    // Inventory and availability
    inventory: actualInventory,
    quantity: actualInventory.reduce((total, item) => total + (item.quantity || 0), 0),
    is_available: actualInventory.some(item => (item.quantity || 0) > 0),
    has_variants: actualInventory.length > 1,
    
    // Product categorization
    brand: product.brand || null,
    sku: product.sku || null,
    barcode: product.barcode || null,
    product_type: product.product_type || 'physical',
    tags: product.tags || [],
    
    // Live sale specific
    badge_label: product.badge_label || null,
    strikethrough_label: null,
    overlay_texts: product.overlay_texts || [],
    overlay_text: product.overlay_text || [],
    featured_in_live: true,
    
    // Mobile enhancements
    short_description: product.description ? 
      product.description.substring(0, 100) + (product.description.length > 100 ? '...' : '') : 
      null,
    
    // Actions
    can_purchase: actualInventory.some(item => (item.quantity || 0) > 0),
    purchase_url: null, // Can be enhanced
    add_to_cart_url: null, // Can be enhanced
    
    // Analytics for this product in the live sale
    views_in_live: 0, // Can be enhanced
    clicks_in_live: 0, // Can be enhanced
    conversions_in_live: 0, // Can be enhanced
    
    // Metadata
    metadata: null,
    sync_data: {
      sync_source: 'database',
      is_pusher_memory: false
    }
  };
}

function formatDuration(minutes) {
  if (!minutes || minutes <= 0) return 'Unknown';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

function formatViewers(viewers) {
  if (!viewers || viewers <= 0) return '0';
  if (viewers >= 1000) {
    return `${(viewers / 1000).toFixed(1)}k`;
  }
  return viewers.toString();
}