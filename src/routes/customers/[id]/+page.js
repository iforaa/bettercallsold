export const ssr = false;

export async function load({ params }) {
	return {
		customerId: params.id
	};
}