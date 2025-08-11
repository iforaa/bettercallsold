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

    // Get products associated with this live sale
    // This includes both static replay products AND memorized pusher products
    const productsResult = await query(`
      SELECT 
        rp.id,
        rp.replay_id,
        rp.external_id as external_product_id,
        rp.product_name,
        rp.brand,
        rp.identifier,
        rp.thumbnail,
        rp.price,
        rp.price_label,
        rp.quantity,
        rp.badge_label,
        rp.shown_at,
        rp.hidden_at,
        rp.is_favorite,
        rp.description,
        rp.store_description,
        rp.product_path,
        rp.product_type,
        rp.shopify_product_id,
        rp.media,
        rp.overlay_texts,
        rp.inventory,
        rp.metadata,
        rp.created_at,
        rp.updated_at,
        -- Add source type indicator based on metadata
        CASE 
          WHEN rp.metadata::text LIKE '%pusher_featured%' THEN 'pusher_memory'
          ELSE 'commentsold'
        END as source_type
      FROM replay_products rp
      WHERE rp.replay_id = $1
      ORDER BY rp.shown_at ASC
    `, [liveSale.id]); // Use internal ID for products query

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
  const mobileProducts = products.map(product => transformProductForMobile(product));

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

function transformProductForMobile(product) {
  // Parse JSON fields safely
  let media = [];
  let overlayTexts = [];
  let inventory = [];
  let metadata = null;

  // Handle images field (from replay_products table)
  try {
    if (product.media) {
      media = typeof product.media === 'string' ? JSON.parse(product.media) : product.media;
    } else if (product.images) {
      media = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
    }
    // If no media array, create one from thumbnail
    if (media.length === 0 && product.thumbnail) {
      media = [{ url: product.thumbnail, alt: product.product_name }];
    }
  } catch (e) {
    media = product.thumbnail ? [{ url: product.thumbnail, alt: product.product_name }] : [];
  }

  try {
    overlayTexts = product.overlay_texts ? (typeof product.overlay_texts === 'string' ? JSON.parse(product.overlay_texts) : product.overlay_texts) : [];
  } catch (e) {
    overlayTexts = [];
  }

  try {
    inventory = product.inventory ? (typeof product.inventory === 'string' ? JSON.parse(product.inventory) : product.inventory) : [];
  } catch (e) {
    inventory = [];
  }

  try {
    metadata = product.metadata ? (typeof product.metadata === 'string' ? JSON.parse(product.metadata) : product.metadata) : null;
  } catch (e) {
    metadata = null;
  }

  return {
    id: product.id, // Our internal database ID
    external_id: product.external_product_id, // CommentSold product ID
    product_id: product.external_product_id || product.product_id || product.id, // For backward compatibility
    product_name: product.product_name || '',
    name: product.product_name || '',
    description: product.description || '',
    
    // Pricing
    price: parseFloat(product.price || 0),
    price_label: product.price ? `$${parseFloat(product.price).toFixed(2)}` : 'Price not available',
    formatted_price: product.price ? `$${parseFloat(product.price).toFixed(2)}` : 'Price not available',
    compare_at_price: product.compare_at_price ? parseFloat(product.compare_at_price) : null,
    
    // Images and media
    thumbnail: product.thumbnail || (media.length > 0 ? media[0].url || media[0] : null),
    image_url: product.thumbnail || (media.length > 0 ? media[0].url || media[0] : null),
    media: media,
    all_images: media.map((m, index) => ({
      url: m.url || m,
      position: index + 1,
      alt: product.product_name
    })),
    
    // Timing in live sale
    shown_at: product.shown_at ? Math.floor(new Date(product.shown_at).getTime() / 1000) : 0,
    hidden_at: product.hidden_at ? Math.floor(new Date(product.hidden_at).getTime() / 1000) : 0,
    shown_at_formatted: product.shown_at ? new Date(product.shown_at).toLocaleTimeString() : null,
    display_duration: product.shown_at && product.hidden_at 
      ? Math.round((new Date(product.hidden_at) - new Date(product.shown_at)) / 1000) // seconds
      : null,
    
    // Inventory and availability
    inventory: inventory,
    quantity: product.quantity || 0,
    is_available: (product.quantity || 0) > 0,
    has_variants: inventory.length > 1,
    
    // Product categorization
    brand: product.brand || null,
    sku: product.sku || null,
    barcode: product.barcode || null,
    product_type: product.product_type || 'physical',
    tags: product.tags || [],
    
    // Live sale specific
    badge_label: product.source_type === 'pusher_memory' ? 'LIVE FEATURED' : (product.badge_label || null),
    strikethrough_label: product.strikethrough_label || null,
    overlay_texts: overlayTexts,
    featured_in_live: true,
    
    // Mobile enhancements
    short_description: product.description ? 
      product.description.substring(0, 100) + (product.description.length > 100 ? '...' : '') : 
      null,
    
    // Actions
    can_purchase: (product.quantity || 0) > 0,
    purchase_url: null, // Can be enhanced
    add_to_cart_url: null, // Can be enhanced
    
    // Analytics for this product in the live sale
    views_in_live: 0, // Can be enhanced
    clicks_in_live: 0, // Can be enhanced
    conversions_in_live: 0, // Can be enhanced
    
    // Metadata
    metadata: metadata,
    sync_data: {
      replay_id: product.replay_id,
      sync_source: product.source_type || 'commentsold',
      featured_at: product.featured_at,
      is_pusher_memory: product.source_type === 'pusher_memory'
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