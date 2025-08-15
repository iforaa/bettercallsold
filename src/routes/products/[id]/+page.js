export async function load({ params, url }) {
	// Return product ID and navigation context for fast page load - no server-side data fetching
	return {
		productId: params.id,
		from: url.searchParams.get('from'),
		customerId: url.searchParams.get('customerId'),
		orderId: url.searchParams.get('orderId'),
		fromCollection: url.searchParams.get('fromCollection'),
		fromInventory: url.searchParams.get('fromInventory'),
		replayId: url.searchParams.get('replayId')
	};
}