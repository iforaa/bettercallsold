export async function load({ params }) {
	// Return collection ID immediately for fast page load - no server-side data fetching
	return {
		collectionId: params.id
	};
}