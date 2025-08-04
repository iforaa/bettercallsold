import { jsonResponse, internalServerErrorResponse } from '$lib/response.js';
import { AGORA_APP_ID, AGORA_TOKEN } from '$env/static/private';

// For real Agora API calls, we'd need proper credentials
// Using Agora's REST API: https://docs.agora.io/en/real-time-communication/reference/restful-api

export async function GET({ url }) {
  try {
    const channel = url.searchParams.get('channel') || 'test-channel';
    
    // For now, we'll simulate checking channel status
    // In a real implementation, you would use Agora's RESTful API
    // to check if there are any active users in the channel
    
    // Agora RESTful API endpoint to get channel info
    // https://api.agora.io/dev/v1/channel/user/{appid}/{channelName}
    
    const agoraApiUrl = `https://api.agora.io/dev/v1/channel/user/${AGORA_APP_ID}/${channel}`;
    
    try {
      // Use Agora's REST API to check channel users
      // API endpoint: https://api.agora.io/dev/v1/channel/user/{appid}/{channelName}
      
      // For now, we'll simulate the real behavior by checking if someone is streaming
      // In a real implementation, you'd need:
      // 1. Agora REST API credentials (Customer ID and Customer Secret)
      // 2. Proper authentication headers
      // 3. Call the actual Agora REST API
      
      // Simplified approach: Check if there are active WebRTC connections
      // This would require more complex server-side tracking
      
      // Check if this channel has an active stream that hasn't expired
      const streamData = activeStreams.get(channel);
      const now = Date.now();
      
      let is_active = false;
      let user_count = 0;
      
      if (streamData && streamData.expires_at > now) {
        is_active = true;
        user_count = streamData.user_count;
      } else if (streamData) {
        // Stream has expired, remove it
        activeStreams.delete(channel);
      }
      
      const response = {
        channel: channel,
        is_active: is_active,
        user_count: user_count,
        users: is_active ? ['active_user'] : [],
        last_checked: new Date().toISOString(),
        expires_in: streamData && is_active ? Math.ceil((streamData.expires_at - now) / 1000) + ' seconds' : null,
        note: 'Using time-based expiration - streams auto-expire after 2 minutes'
      };
      
      return jsonResponse(response);
      
    } catch (agoraError) {
      console.warn('Unable to check Agora channel status:', agoraError.message);
      
      // Return fallback response
      return jsonResponse({
        channel: channel,
        is_active: false,
        user_count: 0,
        users: [],
        last_checked: new Date().toISOString(),
        error: 'Unable to verify channel status'
      });
    }
    
  } catch (error) {
    console.error('Channel status API error:', error);
    return internalServerErrorResponse(`Failed to check channel status: ${error.message}`);
  }
}

// Simple in-memory tracking for active streams (with expiration)
const activeStreams = new Map();

// For testing purposes, you can manually set a channel as active
export async function POST({ request, url }) {
  try {
    const channel = url.searchParams.get('channel') || 'test-channel';
    const { is_active, user_count = 1 } = await request.json();
    
    if (is_active) {
      // Set stream as active with expiration (2 minutes from now)
      activeStreams.set(channel, {
        user_count: user_count,
        expires_at: Date.now() + (2 * 60 * 1000), // Expires in 2 minutes
        last_updated: Date.now()
      });
    } else {
      // Remove from active streams
      activeStreams.delete(channel);
    }
    
    return jsonResponse({
      channel: channel,
      is_active: is_active,
      user_count: is_active ? user_count : 0,
      users: is_active ? ['test_user'] : [],
      expires_in: is_active ? '2 minutes' : null,
      message: `Channel ${channel} status updated to ${is_active ? 'active' : 'inactive'}`
    });
    
  } catch (error) {
    console.error('Channel status update error:', error);
    return internalServerErrorResponse(`Failed to update channel status: ${error.message}`);
  }
}