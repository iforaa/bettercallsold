import { CommentSoldAPI } from '$lib/commentsold-api.js';
import { jsonResponse, internalServerErrorResponse, notFoundResponse } from '$lib/response.js';

export async function GET({ params, url }) {
  try {
    const productId = parseInt(params.id);
    const baseUrl = url.searchParams.get('baseUrl') || 'https://api.commentsold.com/api/2.0/divas';
    
    console.log(`Testing CommentSold product details API for product ${productId} with base URL:`, baseUrl);
    
    // Initialize CommentSold API client
    const api = new CommentSoldAPI(baseUrl);
    
    // Fetch product details
    const product = await api.getProductDetails(productId);
    
    if (!product) {
      return notFoundResponse(`Product ${productId} not found`);
    }
    
    console.log(`Successfully fetched product details for: ${product.productName}`);
    
    return jsonResponse({
      success: true,
      data: product,
      baseUrl: baseUrl
    });
  } catch (error) {
    console.error('Test product details error:', error);
    return internalServerErrorResponse(`Failed to test product details: ${error.message}`);
  }
}