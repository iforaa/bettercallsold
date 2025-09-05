import { json } from '@sveltejs/kit';
import { AGORA_APP_ID } from '$env/static/private';

/**
 * GET /api/agora/config - Get Agora configuration for client-side usage
 * This endpoint provides only the App ID which is safe to expose to clients
 */
export async function GET() {
  try {
    // Only return the App ID - never expose the certificate to the client
    return json({
      success: true,
      app_id: AGORA_APP_ID
    });
  } catch (error) {
    console.error('Agora config API error:', error);
    return json(
      {
        success: false,
        error: 'Failed to get Agora configuration'
      },
      { status: 500 }
    );
  }
}