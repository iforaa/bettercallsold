// Load transfer details page data
export async function load({ params, fetch }) {
  return {
    transferId: params.id
  };
}