export async function load({ params }) {
	// Return product ID immediately for fast page load - no server-side data fetching
	return {
		productId: params.id
	};
}