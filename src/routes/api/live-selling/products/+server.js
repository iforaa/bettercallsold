import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse, notFoundResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';
import Pusher from 'pusher';
import { PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER } from '$env/static/private';

// Initialize Pusher
const pusher = new Pusher({
    appId: PUSHER_APP_ID || "1893828",
    key: PUSHER_KEY || "2df4398e22debaee3ec6", 
    secret: PUSHER_SECRET || "3e52b7aa0043f31f7a97",
    cluster: PUSHER_CLUSTER || "mt1",
    useTLS: true
});

export async function POST({ request }) {
  try {
    const { product_id, external_product_id } = await request.json();

    // Validate input
    if (!product_id && !external_product_id) {
      return jsonResponse({ error: 'Product ID is required' }, 400);
    }

    // Find the current active live stream
    const activeLiveStreamResult = await query(`
      SELECT id FROM live_streams 
      WHERE tenant_id = $1 AND is_live = true 
      ORDER BY started_at DESC 
      LIMIT 1
    `, [DEFAULT_TENANT_ID]);

    if (activeLiveStreamResult.rows.length === 0) {
      return notFoundResponse('No active live stream found');
    }

    const liveStream = activeLiveStreamResult.rows[0];

    // Find the product data from our products table
    const productResult = await query(`
      SELECT * FROM products 
      WHERE tenant_id = $1 AND id::text = $2
      LIMIT 1
    `, [DEFAULT_TENANT_ID, external_product_id || product_id]);
    
    if (productResult.rows.length === 0) {
      return notFoundResponse('Product not found');
    }

    const product = productResult.rows[0];

    // Create a simple hash from UUID for external_id (to satisfy unique constraint)
    const productHash = product.id.split('-')[0]; // Use first part of UUID
    const externalId = parseInt(productHash, 16) % 2147483647; // Convert hex to int, keep within int range

    // Check if this product is already featured in this live stream
    const existingResult = await query(`
      SELECT id FROM replay_products 
      WHERE replay_id = $1 AND external_id = $2
    `, [liveStream.id, externalId]);

    if (existingResult.rows.length > 0) {
      // Product already exists, update the shown_at timestamp to mark as recently featured
      await query(`
        UPDATE replay_products 
        SET shown_at = NOW(), updated_at = NOW()
        WHERE replay_id = $1 AND external_id = $2
      `, [liveStream.id, externalId]);
    } else {
      // Insert new product record with full product data
      await query(`
        INSERT INTO replay_products (
          replay_id, 
          external_id, 
          product_name, 
          brand, 
          identifier, 
          thumbnail, 
          price, 
          price_label, 
          quantity, 
          badge_label, 
          shown_at, 
          hidden_at,
          is_favorite, 
          description, 
          store_description, 
          product_path, 
          external_product_id,
          product_type, 
          shopify_product_id, 
          media, 
          overlay_texts, 
          inventory, 
          metadata
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 
          NOW(), NULL, $11, $12, $13, $14, $15, $16, 
          $17, $18, $19, $20, $21
        )
      `, [
        liveStream.id,
        externalId, // external_id - unique hash from UUID
        product.name || 'Unknown Product', // product_name
        product.brand || null, // brand
        product.id, // identifier - use UUID as string identifier
        product.images && product.images.length > 0 ? 
          (typeof product.images === 'string' ? JSON.parse(product.images)[0]?.url : product.images[0]?.url) : null, // thumbnail
        product.price || 0, // price
        product.price ? `$${parseFloat(product.price).toFixed(2)}` : 'Price not available', // price_label
        0, // quantity (not available from pusher)
        'LIVE FEATURED', // badge_label
        product.is_favorite || false, // is_favorite
        product.description || '', // description
        product.description || '', // store_description
        null, // product_path
        product.id, // external_product_id - use UUID as string
        'physical', // product_type
        product.shopify_product_id || null, // shopify_product_id
        typeof product.images === 'string' ? product.images : JSON.stringify(product.images || []), // media (JSONB)
        JSON.stringify([]), // overlay_texts (JSONB)  
        JSON.stringify([]), // inventory (JSONB)
        JSON.stringify({ pusher_featured: true, featured_at: new Date().toISOString() }) // metadata (JSONB)
      ]);
    }

    // Now send the Pusher message
    const productMessage = {
      type: 'product-highlight',
      product: {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.images && product.images.length > 0 ? 
          (typeof product.images === 'string' ? JSON.parse(product.images)[0]?.url : product.images[0]?.url) : null,
        description: product.description
      },
      message: `🛍️ Now featuring: ${product.name} - $${product.price}`,
      timestamp: new Date().toISOString(),
      id: Date.now().toString(),
      user: 'Live Stream'
    };

    // Send to the private live chat channel
    await pusher.trigger('private-live-chat', 'client-product-message', productMessage);

    return jsonResponse({ 
      success: true, 
      message: 'Product featured and message sent successfully',
      product: productMessage.product
    });

  } catch (error) {
    console.error('Error featuring product:', error);
    return internalServerErrorResponse(`Failed to feature product: ${error.message}`);
  }
}

export async function GET() {
  try {
    // Get the current active live stream
    const activeLiveStreamResult = await query(`
      SELECT id FROM live_streams 
      WHERE tenant_id = $1 AND is_live = true 
      ORDER BY started_at DESC 
      LIMIT 1
    `, [DEFAULT_TENANT_ID]);

    if (activeLiveStreamResult.rows.length === 0) {
      return jsonResponse({ products: [] });
    }

    const liveStream = activeLiveStreamResult.rows[0];

    // Get all products featured in the current live stream
    const productsResult = await query(`
      SELECT 
        rp.id,
        rp.external_id,
        rp.product_name,
        rp.price,
        rp.price_label,
        rp.thumbnail,
        rp.description,
        rp.badge_label,
        rp.shown_at,
        rp.created_at,
        rp.metadata,
        rp.media,
        CASE 
          WHEN rp.metadata::text LIKE '%pusher_featured%' THEN 'pusher_memory'
          ELSE 'commentsold'
        END as source_type
      FROM replay_products rp
      WHERE rp.replay_id = $1
      ORDER BY rp.shown_at DESC
    `, [liveStream.id]);

    return jsonResponse({
      live_stream_id: liveStream.id,
      products: productsResult.rows
    });

  } catch (error) {
    console.error('Error fetching featured products:', error);
    return internalServerErrorResponse(`Failed to fetch products: ${error.message}`);
  }
}