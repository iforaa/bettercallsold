import Pusher from 'pusher';
import { json, text } from '@sveltejs/kit';
import { PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER } from '$env/static/private';

// Initialize Pusher with server credentials
const pusher = new Pusher({
    appId: PUSHER_APP_ID || "1893828",
    key: PUSHER_KEY || "2df4398e22debaee3ec6", 
    secret: PUSHER_SECRET || "3e52b7aa0043f31f7a97",
    cluster: PUSHER_CLUSTER || "mt1",
    useTLS: true,
    // Enable client events for private channels
    // This allows clients to trigger events directly on private channels
    // without going through the server
    enableClientEvents: true
});

// Handle CORS preflight
export async function OPTIONS({ request }) {
    console.log('=== PUSHER AUTH OPTIONS (PREFLIGHT) ===');
    console.log('Origin:', request.headers.get('origin'));
    console.log('Access-Control-Request-Method:', request.headers.get('access-control-request-method'));
    console.log('Access-Control-Request-Headers:', request.headers.get('access-control-request-headers'));
    
    return new Response(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Socket-ID',
            'Access-Control-Allow-Credentials': 'false', // Changed to false since we're using * origin
            'Access-Control-Max-Age': '86400' // Cache preflight for 24 hours
        }
    });
}

export async function POST({ request, url, isDataRequest = true }) {
    // Override CSRF protection for this endpoint
    isDataRequest = false;
    
    // Allow CORS for Pusher authentication
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Socket-ID',
        'Access-Control-Allow-Credentials': 'false' // Must be false when using * origin
    };
    try {
        console.log('=== PUSHER AUTH REQUEST DEBUG ===');
        console.log('Request URL:', url.href);
        console.log('Request method:', request.method);
        console.log('Request headers:', Object.fromEntries(request.headers.entries()));
        
        let socket_id, channel_name;
        
        // Check content type - Pusher sends form data, not JSON
        const contentType = request.headers.get('content-type');
        console.log('Auth request content-type:', contentType);
        
        if (contentType && contentType.includes('application/json')) {
            // Handle JSON requests (like our cURL test)
            const body = await request.json();
            socket_id = body.socket_id;
            channel_name = body.channel_name;
        } else if (contentType && contentType.includes('application/x-www-form-urlencoded')) {
            // Handle URL-encoded form data (standard Pusher client)
            const formData = await request.formData();
            socket_id = formData.get('socket_id');
            channel_name = formData.get('channel_name');
        } else {
            // Handle text/plain or other content types
            const text = await request.text();
            console.log('Raw request body:', text);
            
            // Try to parse as URL-encoded
            const params = new URLSearchParams(text);
            socket_id = params.get('socket_id');
            channel_name = params.get('channel_name');
            
            if (!socket_id || !channel_name) {
                // Try to parse as JSON string
                try {
                    const parsed = JSON.parse(text);
                    socket_id = parsed.socket_id;
                    channel_name = parsed.channel_name;
                } catch (e) {
                    console.error('Failed to parse request body:', e);
                }
            }
        }
        
        console.log('Pusher auth request:', { socket_id, channel_name });
        console.log('Pusher config:', {
            PUSHER_APP_ID: PUSHER_APP_ID ? 'SET' : 'UNDEFINED',
            PUSHER_KEY: PUSHER_KEY ? 'SET' : 'UNDEFINED',
            PUSHER_SECRET: PUSHER_SECRET ? 'SET' : 'UNDEFINED',
            PUSHER_CLUSTER: PUSHER_CLUSTER ? 'SET' : 'UNDEFINED'
        });
        
        // Validate required parameters
        if (!socket_id || !channel_name) {
            console.error('Missing required parameters:', { socket_id, channel_name });
            return json({ 
                error: 'Missing required parameters', 
                required: ['socket_id', 'channel_name'],
                received: { socket_id: !!socket_id, channel_name: !!channel_name }
            }, { status: 400, headers });
        }
        
        // Validate that this is a live-chat private channel
        if (!channel_name.startsWith('private-live-chat')) {
            console.log('Channel validation failed:', channel_name);
            return json({ error: 'Unauthorized channel', channel: channel_name }, { status: 403, headers });
        }
        
        // Check if pusher is properly initialized
        if (!pusher) {
            console.error('Pusher instance not initialized');
            return json({ error: 'Pusher not configured' }, { status: 500 });
        }
        
        // For now, authorize all requests to live-chat channels
        // In production, you might want to check user permissions here
        console.log('Attempting to authorize channel...');
        
        try {
            const authResponse = pusher.authorizeChannel(socket_id, channel_name);
            console.log('Pusher auth response:', authResponse);
            
            // Ensure we return the auth string in the expected format
            if (authResponse && typeof authResponse === 'object') {
                // For Pusher clients, we need to return just the auth string, not JSON wrapped
                const authString = JSON.stringify(authResponse);
                console.log('Returning auth string:', authString);
                
                // Return as plain text to avoid any JSON parsing issues
                return new Response(authString, {
                    status: 200,
                    headers: {
                        ...headers,
                        'Content-Type': 'application/json'
                    }
                });
            } else {
                console.error('Invalid auth response format:', authResponse);
                return json({ error: 'Invalid auth response' }, { status: 500, headers });
            }
        } catch (authError) {
            console.error('Pusher authorization failed:', authError);
            return json({ 
                error: 'Authorization failed', 
                details: authError.message,
                channel: channel_name,
                socket_id: socket_id
            }, { status: 500, headers });
        }
        
    } catch (error) {
        console.error('Pusher auth error:', error);
        console.error('Error details:', error.message, error.stack);
        return json({ error: 'Authorization failed', details: error.message }, { status: 500, headers });
    }
}