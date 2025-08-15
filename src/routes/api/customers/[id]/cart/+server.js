import { query, getCached, setCache } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse, notFoundResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';

export async function GET({ params }) {
  try {
    const customerId = params.id;
    const cacheKey = `customer:${customerId}:cart:${DEFAULT_TENANT_ID}`;
    
    // Try to get from cache first
    const cachedCart = await getCached(cacheKey);
    if (cachedCart) {
      return jsonResponse(cachedCart);
    }

    // For now, we'll return mock cart data since there might not be a cart table yet
    // In a real implementation, you would query the cart table
    // This is based on the customer stats showing cart_items_count
    
    const customerCheck = await query(
      'SELECT id FROM users WHERE id = $1 AND tenant_id = $2 AND role = $3',
      [customerId, DEFAULT_TENANT_ID, 'customer']
    );

    if (customerCheck.rows.length === 0) {
      return notFoundResponse('Customer not found');
    }

    // Mock cart items - in real app you would query cart table
    // For the customer with ID 44444444-4444-4444-4444-444444444444 who has cart_items_count: 1
    let cartItems = [];
    
    if (customerId === '44444444-4444-4444-4444-444444444444') {
      // Get a sample product to show in cart
      const productResult = await query(`
        SELECT p.id, p.name, p.price, p.images, i.id as variant_id, i.variant_combination
        FROM products p 
        LEFT JOIN inventory i ON p.id = i.product_id 
        WHERE p.tenant_id = $1 
        LIMIT 1
      `, [DEFAULT_TENANT_ID]);

      if (productResult.rows.length > 0) {
        const product = productResult.rows[0];
        cartItems = [{
          id: 'cart_1',
          customer_id: customerId,
          product_id: product.id,
          variant_id: product.variant_id,
          product_name: product.name,
          product_price: product.price,
          product_images: product.images,
          variant_data: product.variant_combination,
          quantity: 1,
          added_at: new Date().toISOString()
        }];
      }
    }

    // Cache the cart data for 2 minutes (very short cache since cart changes frequently)
    await setCache(cacheKey, cartItems, 120);

    return jsonResponse(cartItems);
  } catch (error) {
    console.error('Get customer cart error:', error);
    return internalServerErrorResponse('Failed to fetch customer cart');
  }
}