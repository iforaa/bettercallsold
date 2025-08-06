import Pusher from 'pusher';
import { json } from '@sveltejs/kit';
import { PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER } from '$env/static/private';

// Initialize Pusher with server credentials from environment
const pusher = new Pusher({
    appId: PUSHER_APP_ID,
    key: PUSHER_KEY,
    secret: PUSHER_SECRET,
    cluster: PUSHER_CLUSTER,
    useTLS: true
});

export async function POST({ request }) {
    try {
        const { user, message, timestamp, channel } = await request.json();
        
        // Validate input
        if (!user || !message) {
            return json({ error: 'Missing required fields' }, { status: 400 });
        }
        
        // Use provided channel or default to standard public channel
        const targetChannel = channel || 'live-chat';
        
        // Trigger the message event on the specified channel
        await pusher.trigger(targetChannel, 'new-message', {
            id: Date.now().toString(),
            user: user.trim(),
            message: message.trim(),
            timestamp: timestamp || new Date().toISOString()
        });
        
        return json({ success: true });
    } catch (error) {
        console.error('Chat send error:', error);
        return json({ error: 'Failed to send message' }, { status: 500 });
    }
}