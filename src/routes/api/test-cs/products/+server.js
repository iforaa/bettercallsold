import { CommentSoldAPI } from '$lib/commentsold-api.js';
import { jsonResponse, internalServerErrorResponse } from '$lib/response.js';

export async function GET({ url }) {
  try {
    const baseUrl = url.searchParams.get('baseUrl') || 'https://api.commentsold.com/api/2.0/divas';
    const collectionId = url.searchParams.get('collectionId');
    const maxProducts = parseInt(url.searchParams.get('maxProducts')) || 10;
    
    console.log('Testing CommentSold products API with base URL:', baseUrl);
    
    // Initialize CommentSold API client
    const api = new CommentSoldAPI(baseUrl);
    
    let response;
    if (collectionId) {
      console.log(`Fetching products from collection ${collectionId}, max ${maxProducts}`);
      const products = await api.getAllProductsFromCollection(parseInt(collectionId), maxProducts);
      response = {
        products: products,
        total: products.length
      };
    } else {
      console.log('Fetching general products');
      response = await api.getProducts();
    }
    
    console.log(`Successfully fetched ${response.products.length} products`);
    
    return jsonResponse({
      success: true,
      data: response,
      count: response.products.length,
      baseUrl: baseUrl
    });
  } catch (error) {
    console.error('Test products error:', error);
    return internalServerErrorResponse(`Failed to test products: ${error.message}`);
  }
}