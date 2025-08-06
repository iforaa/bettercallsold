import type { Handle, RequestEvent } from '@sveltejs/kit';
import { API_BYPASS_KEY } from '$lib/stores/auth.js';

export const handle: Handle = async ({ event, resolve }) => {
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

	// Disable CSRF protection for Pusher auth endpoint
	if (event.url.pathname === '/api/pusher/auth') {
		console.log('🔓 Bypassing CSRF protection for Pusher auth endpoint');
		// Set the isDataRequest flag to false to bypass CSRF checks
		// This tells SvelteKit this isn't a form submission that needs CSRF protection
		event.isDataRequest = false;
	}

	// Allow all requests to proceed normally
	return await resolve(event);
};