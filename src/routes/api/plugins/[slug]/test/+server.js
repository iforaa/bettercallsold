import { PluginService } from '$lib/services/PluginService.js';
import { jsonResponse, internalServerErrorResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';

// POST /api/plugins/{slug}/test - Test plugin connectivity
export async function POST({ params, url }) {
  try {
    const { slug } = params;
    const tenantId = url.searchParams.get('tenant_id') || DEFAULT_TENANT_ID;
    
    const testResult = await PluginService.testPlugin(tenantId, slug);
    
    return jsonResponse({
      plugin_slug: slug,
      test_result: testResult,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Test plugin error:', error);
    return internalServerErrorResponse('Failed to test plugin');
  }
}