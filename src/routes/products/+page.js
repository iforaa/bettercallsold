export async function load({ url }) {
	// Only return URL params for immediate page load, no server-side data fetching
	const status = url.searchParams.get('status') || 'all';
	const page = parseInt(url.searchParams.get('page')) || 1;
	const limit = parseInt(url.searchParams.get('limit')) || 50;
	
	return {
		currentStatus: status,
		currentPage: page,
		currentLimit: limit
	};
}