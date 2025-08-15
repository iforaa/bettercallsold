/**
 * Test endpoint for MediaService functionality
 */

import { jsonResponse, internalServerErrorResponse } from '$lib/response.js';
import { testMediaService } from '$lib/test/mediaService.test.js';

export async function GET() {
  try {
    console.log('🧪 Running MediaService tests...');
    
    const testResult = await testMediaService();
    
    return jsonResponse({
      success: testResult,
      message: testResult ? 'All MediaService tests passed!' : 'Some MediaService tests failed',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Test endpoint error:', error);
    return internalServerErrorResponse(`Test failed: ${error.message}`);
  }
}