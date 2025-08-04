export const ssr = false;

export async function load({ params }) {
	return {
		orderId: params.id
	};
}