export async function load({ url }) {
	// Only return URL params for immediate page load, no server-side data fetching
	const page = url.searchParams.get('page') || '1';
	const limit = url.searchParams.get('limit') || '20';
	const status = url.searchParams.get('status') || 'active';
	
	return {
		urlParams: { page, limit, status }
	};
}