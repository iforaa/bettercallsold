import { PluginService } from '$lib/services/PluginService.js';
import { jsonResponse, internalServerErrorResponse, badRequestResponse, notFoundResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';

/**
 * POST /api/plugins/{slug}/register-actions
 * Register actions that a plugin can process
 */
export async function POST({ params, request, url }) {
  try {
    const { slug } = params;
    const data = await request.json();
    const tenantId = url.searchParams.get('tenant_id') || data.tenant_id || DEFAULT_TENANT_ID;
    
    console.log(`🔧 Registering actions for plugin: ${slug}`);
    
    // Validate request data
    if (!data.actions || !Array.isArray(data.actions)) {
      return badRequestResponse('Missing or invalid actions array');
    }
    
    if (data.actions.length === 0) {
      return badRequestResponse('Actions array cannot be empty');
    }
    
    // Validate each action structure before processing
    for (let i = 0; i < data.actions.length; i++) {
      try {
        PluginService.validateAction(data.actions[i]);
      } catch (validationError) {
        return badRequestResponse(`Action ${i}: ${validationError.message}`);
      }
    }
    
    // Check if plugin exists
    const plugin = await PluginService.getPluginBySlug(tenantId, slug);
    if (!plugin) {
      return notFoundResponse(`Plugin '${slug}' not found`);
    }
    
    // Register the actions
    const result = await PluginService.registerActions(tenantId, slug, data.actions);
    
    console.log(`✅ Successfully registered ${data.actions.length} actions for plugin: ${slug}`);
    
    return jsonResponse({
      success: true,
      message: `Successfully registered ${data.actions.length} actions for plugin '${slug}'`,
      plugin_slug: slug,
      actions_registered: data.actions.length,
      updated_at: result.updated_at
    });
    
  } catch (error) {
    console.error('Register actions error:', error);
    
    if (error.message.includes('not found')) {
      return notFoundResponse(error.message);
    }
    
    return internalServerErrorResponse('Failed to register actions');
  }
}

/**
 * GET /api/plugins/{slug}/register-actions  
 * Get currently registered actions for a specific plugin
 */
export async function GET({ params, url }) {
  try {
    const { slug } = params;
    const tenantId = url.searchParams.get('tenant_id') || DEFAULT_TENANT_ID;
    
    const plugin = await PluginService.getPluginBySlug(tenantId, slug);
    
    if (!plugin) {
      return notFoundResponse(`Plugin '${slug}' not found`);
    }
    
    const actions = plugin.registered_actions?.actions || [];
    
    return jsonResponse({
      plugin_slug: slug,
      plugin_name: plugin.name,
      actions,
      actions_count: actions.length
    });
    
  } catch (error) {
    console.error('Get plugin actions error:', error);
    return internalServerErrorResponse('Failed to fetch plugin actions');
  }
}

/**
 * DELETE /api/plugins/{slug}/register-actions
 * Clear all registered actions for a plugin
 */
export async function DELETE({ params, url }) {
  try {
    const { slug } = params;
    const tenantId = url.searchParams.get('tenant_id') || DEFAULT_TENANT_ID;
    
    console.log(`🗑️ Clearing actions for plugin: ${slug}`);
    
    // Register empty actions array (effectively clearing them)
    await PluginService.registerActions(tenantId, slug, []);
    
    console.log(`✅ Cleared all actions for plugin: ${slug}`);
    
    return jsonResponse({
      success: true,
      message: `All actions cleared for plugin '${slug}'`,
      plugin_slug: slug
    });
    
  } catch (error) {
    console.error('Clear actions error:', error);
    
    if (error.message.includes('not found')) {
      return notFoundResponse(error.message);
    }
    
    return internalServerErrorResponse('Failed to clear actions');
  }
}