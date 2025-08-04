import { CommentSoldAPI } from '$lib/commentsold-api.js';
import { jsonResponse, internalServerErrorResponse } from '$lib/response.js';

export async function GET() {
  try {
    // Initialize CommentSold API client
    const api = new CommentSoldAPI();
    
    // Fetch collections from CommentSold
    const collections = await api.getCollections();
    
    // Transform collections for frontend consumption
    const formattedCollections = collections.map(collection => ({
      id: collection.id,
      title: collection.title,
      position: collection.position,
      collectionSlug: collection.collectionSlug,
      image: collection.image
    }));
    
    return jsonResponse(formattedCollections);
  } catch (error) {
    console.error('Get CommentSold collections error:', error);
    return internalServerErrorResponse('Failed to fetch collections from CommentSold');
  }
}