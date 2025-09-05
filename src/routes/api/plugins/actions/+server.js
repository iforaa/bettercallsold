import { PluginService } from '$lib/services/PluginService.js';
import { jsonResponse, internalServerErrorResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';

/**
 * GET /api/plugins/actions
 * Discover all registered actions across all plugins
 */
export async function GET({ url }) {
  try {
    const tenantId = url.searchParams.get('tenant_id') || DEFAULT_TENANT_ID;
    
    // Extract filter parameters
    const filters = {
      category: url.searchParams.get('category'),
      plugin: url.searchParams.get('plugin')
    };
    
    // Remove null/undefined filters
    Object.keys(filters).forEach(key => {
      if (!filters[key]) delete filters[key];
    });
    
    console.log('🔍 Discovering registered actions with filters:', filters);
    
    // Get all registered actions
    const actions = await PluginService.getRegisteredActions(tenantId, filters);
    
    // Group by plugin for statistics
    const pluginStats = {};
    const categoryStats = {};
    
    actions.forEach(action => {
      // Plugin statistics
      if (!pluginStats[action.plugin_slug]) {
        pluginStats[action.plugin_slug] = {
          plugin_name: action.plugin_name,
          plugin_id: action.plugin_id,
          action_count: 0
        };
      }
      pluginStats[action.plugin_slug].action_count++;
      
      // Category statistics
      if (action.category) {
        categoryStats[action.category] = (categoryStats[action.category] || 0) + 1;
      }
    });
    
    console.log(`✅ Found ${actions.length} registered actions across ${Object.keys(pluginStats).length} plugins`);
    
    return jsonResponse({
      actions,
      total_count: actions.length,
      plugin_count: Object.keys(pluginStats).length,
      plugins: pluginStats,
      categories: categoryStats,
      filters_applied: filters
    });
    
  } catch (error) {
    console.error('Get registered actions error:', error);
    return internalServerErrorResponse('Failed to fetch registered actions');
  }
}

/**
 * Health check endpoint for actions discovery
 */
export async function HEAD({ url }) {
  try {
    const tenantId = url.searchParams.get('tenant_id') || DEFAULT_TENANT_ID;
    const actions = await PluginService.getRegisteredActions(tenantId);
    
    return new Response(null, { 
      status: 200,
      headers: {
        'X-Actions-Count': actions.length.toString(),
        'X-Service-Status': 'healthy'
      }
    });
  } catch (error) {
    return new Response(null, { 
      status: 500,
      headers: {
        'X-Service-Status': 'error'
      }
    });
  }
}