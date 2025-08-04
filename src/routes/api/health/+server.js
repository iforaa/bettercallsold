import { successResponse } from '$lib/response.js';

export async function GET() {
  try {
    // Simple health check without database connection
    const hasDbUrl = !!process.env.DATABASE_URL;
    
    return successResponse('Server is running', {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      db_configured: hasDbUrl,
      redis_status: 'disabled'
    });
  } catch (error) {
    console.error('Health check error:', error);
    return successResponse('Server error', {
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
}