import { CommentSoldAPI } from '$lib/commentsold-api.js';
import { jsonResponse, internalServerErrorResponse } from '$lib/response.js';

export async function GET({ url }) {
  try {
    const baseUrl = url.searchParams.get('baseUrl') || 'https://api.commentsold.com/api/2.0/divas';
    
    console.log('Testing CommentSold collections API with base URL:', baseUrl);
    
    // Initialize CommentSold API client
    const api = new CommentSoldAPI(baseUrl);
    
    // Fetch collections
    const collections = await api.getCollections();
    
    console.log(`Successfully fetched ${collections.length} collections`);
    
    return jsonResponse({
      success: true,
      data: collections,
      count: collections.length,
      baseUrl: baseUrl
    });
  } catch (error) {
    console.error('Test collections error:', error);
    return internalServerErrorResponse(`Failed to test collections: ${error.message}`);
  }
}