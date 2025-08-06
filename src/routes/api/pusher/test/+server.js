import { json } from '@sveltejs/kit';

// Test endpoint to verify Pusher auth endpoint is reachable
export async function GET({ url }) {
    console.log('=== PUSHER AUTH TEST ENDPOINT ===');
    console.log('Request URL:', url.href);
    
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin',
    };

    return json({
        success: true,
        message: 'Pusher auth endpoint is reachable',
        authEndpoint: '/api/pusher/auth',
        fullAuthUrl: `${url.origin}/api/pusher/auth`,
        timestamp: new Date().toISOString()
    }, { headers });
}

// Test POST endpoint to simulate auth request
export async function POST({ request, url }) {
    console.log('=== PUSHER AUTH TEST POST ===');
    console.log('Request URL:', url.href);
    console.log('Request headers:', Object.fromEntries(request.headers.entries()));
    
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin',
    };

    try {
        const contentType = request.headers.get('content-type');
        let body;
        
        if (contentType && contentType.includes('application/json')) {
            body = await request.json();
        } else {
            const formData = await request.formData();
            body = Object.fromEntries(formData.entries());
        }
        
        console.log('Request body:', body);
        
        return json({
            success: true,
            message: 'Test auth request processed',
            received: body,
            contentType: contentType,
            timestamp: new Date().toISOString()
        }, { headers });
        
    } catch (error) {
        console.error('Test auth error:', error);
        return json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        }, { status: 500, headers });
    }
}

export async function OPTIONS() {
    return new Response(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin',
            'Access-Control-Max-Age': '86400'
        }
    });
}