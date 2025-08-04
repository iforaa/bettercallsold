import { checkDatabaseHealth } from '$lib/database.js';
import { successResponse, errorResponse } from '$lib/response.js';

export async function GET() {
  try {
    const dbHealthy = await checkDatabaseHealth();
    
    if (dbHealthy) {
      return successResponse('Server is healthy', {
        db_status: 'connected',
        redis_status: 'disabled'
      });
    } else {
      return successResponse('Server partially healthy', {
        db_status: 'disconnected',
        redis_status: 'disabled'
      });
    }
  } catch (error) {
    console.error('Health check error:', error);
    return errorResponse('Health check failed', 503);
  }
}