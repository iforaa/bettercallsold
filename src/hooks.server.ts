import type { Handle } from '@sveltejs/kit';
import { API_BYPASS_KEY } from '$lib/stores/auth.js';

export const handle: Handle = async ({ event, resolve }) => {
	// Allow API routes to bypass authentication completely
	if (event.url.pathname.startsWith('/api/')) {
		return await resolve(event);
	}

	// Check for API bypass key in query params (for curl access)
	const bypassKey = event.url.searchParams.get('auth');
	if (bypassKey === API_BYPASS_KEY) {
		// Set a flag that the client can read to bypass auth wall
		event.cookies.set('auth_bypass', 'true', {
			path: '/',
			maxAge: 60 * 60 * 24, // 24 hours
			sameSite: 'lax'
		});
	}

	// For non-API routes, continue with normal flow (auth handled client-side)
	return await resolve(event);
};