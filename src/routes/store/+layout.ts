// Store layout server load - completely independent
export async function load() {
	// No server-side dependencies for store routes
	// This prevents any admin/SaaS functionality from loading
	return {
		store_only: true
	};
}