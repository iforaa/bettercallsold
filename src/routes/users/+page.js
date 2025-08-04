export async function load({ fetch }) {
	try {
		// Use internal SvelteKit API route
		const response = await fetch('/api/users');
		
		if (!response.ok) {
			throw new Error('Failed to fetch users');
		}

		const users = await response.json();

		return {
			users
		};
	} catch (error) {
		return {
			error: 'Failed to load users from backend',
			users: []
		};
	}
}