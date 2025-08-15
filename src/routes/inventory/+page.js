export async function load({ url }) {
	// Only return URL params for immediate page load, no server-side data fetching
	const page = parseInt(url.searchParams.get('page')) || 1;
	const limit = parseInt(url.searchParams.get('limit')) || 50;
	const search = url.searchParams.get('search') || '';
	const location = url.searchParams.get('location') || 'all';
	const stockStatus = url.searchParams.get('stockStatus') || 'all';
	
	return {
		currentPage: page,
		currentLimit: limit,
		currentSearch: search,
		currentLocation: location,
		currentStockStatus: stockStatus
	};
}