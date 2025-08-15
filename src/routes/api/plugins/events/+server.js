import { PluginService } from '$lib/services/PluginService.js';
import { jsonResponse, internalServerErrorResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';

// GET /api/plugins/events - Get plugin events for monitoring
export async function GET({ url }) {
  try {
    const tenantId = url.searchParams.get('tenant_id') || DEFAULT_TENANT_ID;
    const limit = parseInt(url.searchParams.get('limit')) || 50;
    
    const events = await PluginService.getPluginEvents(tenantId, limit);
    
    return jsonResponse({
      events,
      count: events.length,
      limit
    });
  } catch (error) {
    console.error('Get plugin events error:', error);
    return internalServerErrorResponse('Failed to fetch plugin events');
  }
}

// POST /api/plugins/events - Manually trigger event processing
export async function POST({ url }) {
  try {
    const limit = parseInt(url.searchParams.get('limit')) || 10;
    
    await PluginService.processWebhooks(limit);
    
    return jsonResponse({
      message: `Webhook processing triggered for up to ${limit} events`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Process webhooks error:', error);
    return internalServerErrorResponse('Failed to process webhooks');
  }
}