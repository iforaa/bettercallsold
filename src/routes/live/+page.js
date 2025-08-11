export async function load({ fetch }) {
	try {
		// Use unified live-selling API route
		const response = await fetch('/api/live-selling');
		
		if (!response.ok) {
			throw new Error('Failed to fetch live selling sessions');
		}

		const liveStreams = await response.json();

		return {
			liveStreams
		};
	} catch (error) {
		return {
			error: 'Failed to load live selling sessions from backend',
			liveStreams: []
		};
	}
}