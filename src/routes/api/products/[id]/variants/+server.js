import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse, notFoundResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';

export async function GET({ params }) {
  try {
    const productId = params.id;
    console.log('DEBUG: Getting variants for product:', productId);
    
    // Get product with variants using new Shopify-style database structure
    // First try a simple query to debug
    const variantsResult = await query(`
      SELECT 
        pv.id,
        pv.product_id,
        pv.title,
        pv.option1,
        pv.option2,
        pv.option3,
        pv.sku,
        pv.barcode,
        pv.price as variant_price,
        pv.cost,
        pv.position,
        pv.weight,
        pv.weight_unit,
        pv.created_at,
        pv.updated_at
      FROM product_variants_new pv
      WHERE pv.product_id = $1
      ORDER BY pv.position, pv.created_at
    `, [productId]);
    
    if (variantsResult.rows.length === 0) {
      // Check if product exists but has no variants
      const productResult = await query(`
        SELECT id, title, description, price, images, status, created_at, updated_at
        FROM products_new 
        WHERE id = $1 AND tenant_id = $2
      `, [productId, DEFAULT_TENANT_ID]);
      
      if (productResult.rows.length === 0) {
        return notFoundResponse('Product not found');
      }
      
      const product = productResult.rows[0];
      return jsonResponse({
        product: {
          id: product.id,
          name: product.title,
          description: product.description,
          images: product.images,
          status: product.status
        },
        variants: []
      });
    }
    
    // Get product info separately since we simplified the variants query
    const productResult = await query(`
      SELECT id, title, description, images, status
      FROM products_new 
      WHERE id = $1 AND tenant_id = $2
    `, [productId, DEFAULT_TENANT_ID]);

    const product = {
      id: productResult.rows[0].id,
      name: productResult.rows[0].title,
      description: productResult.rows[0].description,
      images: productResult.rows[0].images,
      status: productResult.rows[0].status
    };
    
    // Transform variant records to variant format
    const variants = variantsResult.rows.map(record => {
      // Use the existing title if it's not empty or default, otherwise build from options
      let variantTitle = record.title;
      if (!variantTitle || variantTitle === 'Default Title') {
        const parts = [];
        if (record.option1) parts.push(record.option1);
        if (record.option2) parts.push(record.option2);
        if (record.option3) parts.push(record.option3);
        variantTitle = parts.length > 0 ? parts.join(' / ') : 'Default Title';
      }
      
      return {
        id: record.id, // Use real variant ID
        product_id: record.product_id,
        color: record.option1 || '', // Map option1 to color for backward compatibility
        size: record.option2 || '',  // Map option2 to size for backward compatibility
        option1: record.option1,
        option2: record.option2,
        option3: record.option3,
        title: variantTitle,
        price: record.variant_price || 0,
        compare_at_price: null,
        sku: record.sku || '',
        barcode: record.barcode || '',
        inventory_quantity: 0, // Will be calculated separately
        available: 0,
        on_hand: 0,
        committed: 0,
        unavailable: 0,
        track_quantity: true,
        continue_selling_when_out_of_stock: false,
        requires_shipping: true,
        weight: record.weight || 0,
        weight_unit: record.weight_unit || 'lb',
        location: '', // Location is now handled via inventory_levels
        created_at: record.created_at,
        updated_at: record.updated_at
      };
    });
    
    return jsonResponse({
      product,
      variants
    });
  } catch (error) {
    console.error('Get product variants error:', error);
    return internalServerErrorResponse('Failed to fetch product variants');
  }
}