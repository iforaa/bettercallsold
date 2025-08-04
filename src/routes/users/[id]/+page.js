import { error } from '@sveltejs/kit';

export async function load({ fetch, params }) {
	try {
		// Use internal SvelteKit API route
		const response = await fetch('/api/users');
		
		if (!response.ok) {
			throw error(500, 'Failed to fetch users');
		}

		const users = await response.json();
		const user = users.find(u => u.id.toString() === params.id);
		
		if (!user) {
			throw error(404, 'User not found');
		}

		return {
			user
		};
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) throw err;
		throw error(500, 'Failed to load user data');
	}
}