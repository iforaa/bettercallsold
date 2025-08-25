import { NotificationService } from '$lib/services/NotificationService.js';
import { jsonResponse, errorResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';

// POST /api/notifications/providers/test - Test provider configuration
export async function POST({ request }) {
  try {
    const data = await request.json();
    const { tenant_id = DEFAULT_TENANT_ID, type, provider } = data;
    
    // Validate required fields
    if (!type || !provider) {
      return errorResponse('type and provider are required', 400);
    }
    
    console.log(`Testing ${type} provider ${provider} for tenant ${tenant_id}`);
    
    const testResult = await NotificationService.testProvider(tenant_id, type, provider);
    
    if (testResult.success) {
      console.log(`Provider test successful: ${testResult.message}`);
      return jsonResponse({
        success: true,
        type,
        provider,
        message: testResult.message,
        tested_at: new Date().toISOString()
      });
    } else {
      console.log(`Provider test failed: ${testResult.error}`);
      return jsonResponse({
        success: false,
        type,
        provider,
        error: testResult.error,
        tested_at: new Date().toISOString()
      }, 200); // Return 200 but with success: false
    }
    
  } catch (error) {
    console.error('Test provider error:', error);
    return errorResponse(`Failed to test provider: ${error.message}`, 500);
  }
}