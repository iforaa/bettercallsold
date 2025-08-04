import { checkDatabaseHealth, checkRedisHealth } from '$lib/database.js';
import { successResponse, errorResponse } from '$lib/response.js';

export async function GET() {
  try {
    const dbHealthy = await checkDatabaseHealth();
    const redisHealthy = await checkRedisHealth();
    
    if (dbHealthy && redisHealthy) {
      return successResponse('Server is healthy', {
        db_status: 'connected',
        redis_status: 'connected'
      });
    } else {
      return errorResponse('Server is unhealthy', 503);
    }
  } catch (error) {
    console.error('Health check error:', error);
    return errorResponse('Health check failed', 503);
  }
}