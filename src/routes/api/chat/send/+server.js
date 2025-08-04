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
        const { user, message, timestamp } = await request.json();
        
        // Validate input
        if (!user || !message || !timestamp) {
            return json({ error: 'Missing required fields' }, { status: 400 });
        }
        
        // Trigger the message event on the live-chat channel
        await pusher.trigger('live-chat', 'new-message', {
            user: user.trim(),
            message: message.trim(),
            timestamp: timestamp
        });
        
        return json({ success: true });
    } catch (error) {
        console.error('Chat send error:', error);
        return json({ error: 'Failed to send message' }, { status: 500 });
    }
}