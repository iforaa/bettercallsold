export const ssr = false;

export async function load({ params }) {
	return {
		waitlistId: params.id
	};
}