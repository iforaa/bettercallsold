// Load transfers page data
export async function load({ url, fetch }) {
  const searchParams = url.searchParams;
  
  return {
    currentPage: parseInt(searchParams.get('page')) || 1,
    currentLimit: parseInt(searchParams.get('limit')) || 50,
    currentStatus: searchParams.get('status') || 'all',
    currentFromLocation: searchParams.get('from_location') || 'all',
    currentToLocation: searchParams.get('to_location') || 'all'
  };
}