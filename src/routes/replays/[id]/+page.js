export async function load({ params }) {
	// Return replay ID immediately for fast page load - no server-side data fetching
	return {
		replayId: params.id
	};
}