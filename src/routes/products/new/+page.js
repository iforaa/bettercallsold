export async function load({ fetch }) {
	try {
		// Use internal SvelteKit API route
		const response = await fetch('/api/collections');
		
		if (!response.ok) {
			throw new Error('Failed to fetch collections');
		}

		const collections = await response.json();

		return {
			collections
		};
	} catch (err) {
		return {
			collections: [],
			error: 'Failed to load collections'
		};
	}
}