export async function load({ params, url }) {
	// Return IDs and URL params immediately for fast page load - no server-side data fetching
	const fromInventory = url.searchParams.get('fromInventory') === 'true';
	
	return {
		productId: params.id,
		variantId: params.variantId,
		fromInventory
	};
}