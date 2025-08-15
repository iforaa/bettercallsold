import { PluginService } from '$lib/services/PluginService.js';
import { jsonResponse, internalServerErrorResponse, badRequestResponse, notFoundResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';

// GET /api/plugins/{slug} - Get specific plugin
export async function GET({ params, url }) {
  try {
    const { slug } = params;
    const tenantId = url.searchParams.get('tenant_id') || DEFAULT_TENANT_ID;
    
    const plugin = await PluginService.getPluginBySlug(tenantId, slug);
    
    if (!plugin) {
      return notFoundResponse(`Plugin '${slug}' not found`);
    }
    
    return jsonResponse({ plugin });
  } catch (error) {
    console.error('Get plugin error:', error);
    return internalServerErrorResponse('Failed to fetch plugin');
  }
}

// PUT /api/plugins/{slug} - Update plugin
export async function PUT({ params, request }) {
  try {
    const { slug } = params;
    const data = await request.json();
    const tenantId = data.tenant_id || DEFAULT_TENANT_ID;
    
    // Validate webhook_url if provided
    if (data.webhook_url) {
      try {
        new URL(data.webhook_url);
      } catch (error) {
        return badRequestResponse('Invalid webhook URL format');
      }
    }

    const result = await PluginService.updatePlugin(tenantId, slug, data);
    
    return jsonResponse({
      message: 'Plugin updated successfully',
      plugin: result
    });
    
  } catch (error) {
    console.error('Update plugin error:', error);
    
    if (error.message.includes('not found')) {
      return notFoundResponse(error.message);
    }
    
    return internalServerErrorResponse('Failed to update plugin');
  }
}

// DELETE /api/plugins/{slug} - Delete plugin
export async function DELETE({ params, url }) {
  try {
    const { slug } = params;
    const tenantId = url.searchParams.get('tenant_id') || DEFAULT_TENANT_ID;
    
    await PluginService.deletePlugin(tenantId, slug);
    
    return jsonResponse({
      message: `Plugin '${slug}' deleted successfully`
    });
    
  } catch (error) {
    console.error('Delete plugin error:', error);
    
    if (error.message.includes('not found')) {
      return notFoundResponse(error.message);
    }
    
    return internalServerErrorResponse('Failed to delete plugin');
  }
}