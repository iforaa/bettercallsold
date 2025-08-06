import Pusher from 'pusher';
import { json } from '@sveltejs/kit';
import { PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER } from '$env/static/private';

// Initialize Pusher with server credentials
const pusher = new Pusher({
    appId: PUSHER_APP_ID || "1893828",
    key: PUSHER_KEY || "2df4398e22debaee3ec6", 
    secret: PUSHER_SECRET || "3e52b7aa0043f31f7a97",
    cluster: PUSHER_CLUSTER || "mt1",
    useTLS: true
});

// Handle CORS preflight
export async function OPTIONS() {
    return new Response(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin',
            'Access-Control-Max-Age': '86400'
        }
    });
}

export async function POST({ request, url }) {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin',
    };

    try {
        console.log('=== PUSHER SEND MESSAGE REQUEST ===');
        console.log('Request URL:', url.href);
        
        let messageData;
        const contentType = request.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
            messageData = await request.json();
        } else {
            const formData = await request.formData();
            messageData = Object.fromEntries(formData.entries());
        }
        
        console.log('Message data:', messageData);
        
        const { channel_name, user, message, id, timestamp } = messageData;
        
        // Validate required fields
        if (!channel_name || !user || !message) {
            return json({
                error: 'Missing required fields',
                required: ['channel_name', 'user', 'message'],
                received: { channel_name: !!channel_name, user: !!user, message: !!message }
            }, { status: 400, headers });
        }
        
        // Validate channel name (must be a live-chat channel)
        if (!channel_name.startsWith('private-live-chat')) {
            return json({
                error: 'Invalid channel name',
                message: 'Channel must start with private-live-chat'
            }, { status: 400, headers });
        }
        
        // Prepare message payload
        const messagePayload = {
            id: id || Date.now().toString(),
            user: user.trim(),
            message: message.trim(),
            timestamp: timestamp || new Date().toISOString()
        };
        
        console.log('Sending message to channel:', channel_name);
        console.log('Message payload:', messagePayload);
        
        // Trigger message on the channel from server-side
        // This avoids client event restrictions
        await pusher.trigger(channel_name, 'new-message', messagePayload);
        
        console.log('✅ Message sent successfully');
        
        return json({
            success: true,
            message: 'Message sent successfully',
            data: messagePayload
        }, { headers });
        
    } catch (error) {
        console.error('Pusher send message error:', error);
        return json({
            error: 'Failed to send message',
            details: error.message
        }, { status: 500, headers });
    }
}