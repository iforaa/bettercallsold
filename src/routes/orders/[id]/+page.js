export const ssr = false;

export async function load({ params, url }) {
	return {
		orderId: params.id,
		from: url.searchParams.get('from'),
		customerId: url.searchParams.get('customerId')
	};
}