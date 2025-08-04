export async function load({ fetch }) {
	try {
		// Use internal SvelteKit API route
		const response = await fetch('/api/live-streams');
		
		if (!response.ok) {
			throw new Error('Failed to fetch live streams');
		}

		const liveStreams = await response.json();

		return {
			liveStreams
		};
	} catch (error) {
		return {
			error: 'Failed to load live streams from backend',
			liveStreams: []
		};
	}
}