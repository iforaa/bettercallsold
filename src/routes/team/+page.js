export async function load({ fetch }) {
	try {
		// Use internal SvelteKit API route
		const response = await fetch('/api/team');
		
		if (!response.ok) {
			throw new Error('Failed to fetch team members');
		}

		const team = await response.json();

		return {
			team
		};
	} catch (error) {
		return {
			error: 'Failed to load team members from backend',
			team: []
		};
	}
}