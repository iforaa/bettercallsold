import { jsonResponse } from '$lib/response.js';

export async function GET() {
  try {
    // Return environment debug info (safely)
    const envInfo = {
      NODE_ENV: process.env.NODE_ENV,
      has_DATABASE_URL: !!process.env.DATABASE_URL,
      has_DB_HOST: !!process.env.DB_HOST,
      has_DB_USER: !!process.env.DB_USER,
      has_DB_NAME: !!process.env.DB_NAME,
      has_DB_PASSWORD: !!process.env.DB_PASSWORD,
      timestamp: new Date().toISOString(),
      platform: process.platform,
      node_version: process.version
    };
    
    return jsonResponse(envInfo);
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return jsonResponse({ error: 'Debug failed', message: error.message }, 500);
  }
}