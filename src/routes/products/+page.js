export async function load({ url }) {
	// Only return URL params for immediate page load, no server-side data fetching
	const status = url.searchParams.get('status') || 'all';
	
	return {
		currentStatus: status
	};
}