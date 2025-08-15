export async function load({ params, fetch }) {
	const { slug } = params;

	try {
		// Fetch plugin information from our API
		const response = await fetch(`/api/plugins/${slug}`);
		
		if (!response.ok) {
			return {
				error: {
					status: response.status,
					message: response.status === 404 
						? `Plugin "${slug}" not found`
						: 'Failed to load plugin'
				}
			};
		}

		const data = await response.json();
		
		return {
			plugin: data.plugin,
			slug
		};
	} catch (error) {
		return {
			error: {
				status: 500,
				message: `Error loading plugin: ${error.message}`
			}
		};
	}
}