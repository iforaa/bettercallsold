import { PluginService } from '$lib/services/PluginService.js';
import { jsonResponse, internalServerErrorResponse, badRequestResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';

// GET /api/plugins - Get all registered plugins
export async function GET({ url }) {
  try {
    const tenantId = url.searchParams.get('tenant_id') || DEFAULT_TENANT_ID;
    const plugins = await PluginService.getPlugins(tenantId);
    
    return jsonResponse({
      plugins,
      count: plugins.length
    });
  } catch (error) {
    console.error('Get plugins error:', error);
    return internalServerErrorResponse('Failed to fetch plugins');
  }
}

// POST /api/plugins - Register a new plugin
export async function POST({ request }) {
  try {
    const data = await request.json();
    const tenantId = data.tenant_id || DEFAULT_TENANT_ID;
    
    // Validate required fields
    if (!data.name || !data.slug) {
      return badRequestResponse('Plugin name and slug are required');
    }

    // Validate webhook_url if provided
    if (data.webhook_url) {
      try {
        new URL(data.webhook_url);
      } catch (error) {
        return badRequestResponse('Invalid webhook URL format');
      }
    }

    // Register the plugin
    const result = await PluginService.registerPlugin(tenantId, data);
    
    return jsonResponse({
      message: 'Plugin registered successfully',
      plugin: result
    });
    
  } catch (error) {
    console.error('Register plugin error:', error);
    
    if (error.message.includes('already exists')) {
      return badRequestResponse(error.message);
    }
    
    return internalServerErrorResponse('Failed to register plugin');
  }
}

// PUT /api/plugins - Update an existing plugin
export async function PUT({ request }) {
  try {
    const data = await request.json();
    const tenantId = data.tenant_id || DEFAULT_TENANT_ID;
    
    // Validate required fields
    if (!data.slug) {
      return badRequestResponse('Plugin slug is required');
    }

    // Update the plugin
    const result = await PluginService.updatePlugin(tenantId, data.slug, data);
    
    return jsonResponse({
      message: 'Plugin updated successfully',
      plugin: result
    });
    
  } catch (error) {
    console.error('Update plugin error:', error);
    
    if (error.message.includes('not found')) {
      return badRequestResponse(error.message);
    }
    
    return internalServerErrorResponse('Failed to update plugin');
  }
}

// PATCH /api/plugins - Update plugin status
export async function PATCH({ request }) {
  try {
    const data = await request.json();
    const tenantId = data.tenant_id || DEFAULT_TENANT_ID;
    
    // Validate required fields
    if (!data.slug || !data.status) {
      return badRequestResponse('Plugin slug and status are required');
    }

    // Update the plugin status
    await PluginService.updatePluginStatus(tenantId, data.slug, data.status);
    
    return jsonResponse({
      message: 'Plugin status updated successfully'
    });
    
  } catch (error) {
    console.error('Update plugin status error:', error);
    
    if (error.message.includes('not found')) {
      return badRequestResponse(error.message);
    }
    
    return internalServerErrorResponse('Failed to update plugin status');
  }
}