import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';
import { AGORA_APP_ID } from '$env/static/private';

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

export async function GET({ url }) {
  try {
    // Parse query parameters (similar to CommentSold API)
    const page = parseInt(url.searchParams.get('page')) || 1;
    const limit = parseInt(url.searchParams.get('limit')) || 20;
    const sortBy = url.searchParams.get('sort_by') || 'started_at';
    const sortOrder = url.searchParams.get('sort_order') || 'desc';
    const isLive = url.searchParams.get('is_live');
    const hasProducts = url.searchParams.get('has_products');
    const minViewers = parseInt(url.searchParams.get('min_viewers')) || null;
    const search = url.searchParams.get('search');
    const offset = (page - 1) * limit;

    // Build the query
    let queryText = `
      SELECT 
        ls.*,
        COALESCE(COUNT(rp.id), 0) as products_count
      FROM live_streams ls
      LEFT JOIN replay_products rp ON ls.id = rp.replay_id
      WHERE ls.tenant_id = $1
    `;

    let params = [DEFAULT_TENANT_ID];
    let paramIndex = 2;

    // Add filters
    if (isLive !== null && isLive !== undefined) {
      queryText += ` AND ls.is_live = $${paramIndex}`;
      params.push(isLive === 'true');
      paramIndex++;
    }

    if (hasProducts === 'true') {
      queryText += ` AND ls.product_count > 0`;
    } else if (hasProducts === 'false') {
      queryText += ` AND (ls.product_count = 0 OR ls.product_count IS NULL)`;
    }

    if (minViewers !== null) {
      queryText += ` AND ls.peak_viewers >= $${paramIndex}`;
      params.push(minViewers);
      paramIndex++;
    }

    if (search && search.trim()) {
      queryText += ` AND (
        ls.name ILIKE $${paramIndex} OR 
        ls.title ILIKE $${paramIndex} OR
        ls.description ILIKE $${paramIndex}
      )`;
      params.push(`%${search.trim()}%`);
      paramIndex++;
    }

    // Group by for aggregation
    queryText += ` GROUP BY ls.id`;

    // Add sorting
    const validSortFields = {
      'started_at': 'ls.started_at',
      'ended_at': 'ls.ended_at',
      'created_at': 'ls.created_at',
      'name': 'ls.name',
      'peak_viewers': 'ls.peak_viewers',
      'product_count': 'ls.product_count'
    };

    const sortField = validSortFields[sortBy] || 'ls.started_at';
    const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    
    // Add sorting to prioritize live streams first, then by requested sort
    queryText += ` ORDER BY ls.is_live DESC, ${sortField} ${order}`;

    // Add pagination
    queryText += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    // Execute query
    const result = await query(queryText, params);
    const liveSales = result.rows;

    // Get Agora settings for mobile app integration
    const agoraSettings = await getAgoraSettings(DEFAULT_TENANT_ID);

    // Transform live sales to mobile format
    const mobileLiveSales = liveSales.map(liveSale => transformLiveSaleForMobile(liveSale, agoraSettings));

    // Get total count for pagination
    let totalCountQuery = `
      SELECT COUNT(DISTINCT ls.id) as total
      FROM live_streams ls
      WHERE ls.tenant_id = $1
    `;
    let totalParams = [DEFAULT_TENANT_ID];
    let totalParamIndex = 2;

    // Apply same filters for count
    if (isLive !== null && isLive !== undefined) {
      totalCountQuery += ` AND ls.is_live = $${totalParamIndex}`;
      totalParams.push(isLive === 'true');
      totalParamIndex++;
    }

    if (hasProducts === 'true') {
      totalCountQuery += ` AND ls.product_count > 0`;
    } else if (hasProducts === 'false') {
      totalCountQuery += ` AND (ls.product_count = 0 OR ls.product_count IS NULL)`;
    }

    if (minViewers !== null) {
      totalCountQuery += ` AND ls.peak_viewers >= $${totalParamIndex}`;
      totalParams.push(minViewers);
      totalParamIndex++;
    }

    if (search && search.trim()) {
      totalCountQuery += ` AND (
        ls.name ILIKE $${totalParamIndex} OR 
        ls.title ILIKE $${totalParamIndex} OR
        ls.description ILIKE $${totalParamIndex}
      )`;
      totalParams.push(`%${search.trim()}%`);
      totalParamIndex++;
    }

    const totalResult = await query(totalCountQuery, totalParams);
    const total = parseInt(totalResult.rows[0]?.total || 0);

    // Return CommentSold-style response
    const response = {
      live_sales: mobileLiveSales,
      total: total,
      page: page,
      limit: limit,
      total_pages: Math.ceil(total / limit),
      has_more: (page * limit) < total,
      filters: {
        is_live: isLive,
        has_products: hasProducts,
        min_viewers: minViewers,
        search: search,
        sort_by: sortBy,
        sort_order: sortOrder
      }
    };

    return jsonResponse(response);

  } catch (error) {
    console.error('Mobile live-sales API error:', error);
    return internalServerErrorResponse(`Failed to fetch live sales: ${error.message}`);
  }
}

function transformLiveSaleForMobile(liveSale, agoraSettings = {}) {
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

  // Transform to CommentSold live-sales format
  return {
    id: liveSale.id, // Our internal database UUID
    external_id: liveSale.external_id, // CommentSold ID
    live_id: liveSale.external_id || liveSale.id, // For backward compatibility
    name: liveSale.name || liveSale.title || '',
    title: liveSale.title || liveSale.name || '',
    description: liveSale.description || '',
    
    // Timestamps (convert to Unix timestamp)
    started_at: liveSale.started_at ? Math.floor(new Date(liveSale.started_at).getTime() / 1000) : null,
    ended_at: liveSale.ended_at ? Math.floor(new Date(liveSale.ended_at).getTime() / 1000) : null,
    created_at: liveSale.created_at ? Math.floor(new Date(liveSale.created_at).getTime() / 1000) : null,
    updated_at: liveSale.updated_at ? Math.floor(new Date(liveSale.updated_at).getTime() / 1000) : null,
    
    // Duration in minutes
    duration: liveSale.started_at && liveSale.ended_at 
      ? Math.round((new Date(liveSale.ended_at) - new Date(liveSale.started_at)) / (1000 * 60))
      : null,
    
    // Status and availability
    is_live: liveSale.is_live || false,
    status: liveSale.status || 'completed',
    
    // Viewership metrics
    peak_viewers: liveSale.peak_viewers || 0,
    concurrent_viewers: liveSale.is_live ? liveSale.peak_viewers || 0 : 0,
    
    // Agora information (prioritize current settings over stored data)
    agora_channel: agoraSettings.channel || liveSale.agora_channel || null,
    agora_token: agoraSettings.token || liveSale.agora_token || null,
    agora_app_id: AGORA_APP_ID, // From environment variable
    
    // Product information
    product_count: parseInt(liveSale.product_count || liveSale.products_count || 0),
    has_products: (parseInt(liveSale.product_count || liveSale.products_count || 0)) > 0,
    
    // Media URLs
    source_url: liveSale.source_url || null,
    source_thumb: liveSale.source_thumb || null,
    animated_thumb: liveSale.animated_thumb || null,
    thumbnail: liveSale.source_thumb || liveSale.animated_thumb || null,
    
    // Visual properties
    is_wide_cell: liveSale.is_wide_cell || false,
    label: liveSale.label || null,
    
    // Mobile-specific enhancements
    formatted_duration: formatDuration(liveSale.started_at && liveSale.ended_at 
      ? Math.round((new Date(liveSale.ended_at) - new Date(liveSale.started_at)) / (1000 * 60))
      : null),
    formatted_viewers: formatViewers(liveSale.peak_viewers || 0),
    formatted_started_at: liveSale.started_at ? new Date(liveSale.started_at).toLocaleDateString() : null,
    formatted_ended_at: liveSale.ended_at ? new Date(liveSale.ended_at).toLocaleDateString() : null,
    
    // Status indicators
    is_upcoming: liveSale.started_at ? new Date(liveSale.started_at) > new Date() : false,
    is_completed: liveSale.ended_at ? new Date(liveSale.ended_at) < new Date() : false,
    is_active: liveSale.is_live || false,
    
    // Additional CommentSold compatibility fields
    replay_available: !liveSale.is_live && liveSale.source_url,
    can_watch: Boolean(liveSale.source_url || liveSale.is_live),
    
    // Metadata (for debugging and advanced features)
    metadata: metadata,
    settings: settings,
    
    // System references
    tenant_id: liveSale.tenant_id
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