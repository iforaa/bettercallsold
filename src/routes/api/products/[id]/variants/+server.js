import { query } from '$lib/database.js';
import { getProductWithInventory } from '$lib/inventory-db.js';
import { jsonResponse, internalServerErrorResponse, notFoundResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';

export async function GET({ params }) {
  try {
    const productId = params.id;
    
    // Get product with inventory records (single source of truth)
    const inventoryResult = await query(`
      SELECT 
        inv.id,
        inv.product_id,
        inv.quantity,
        inv.variant_combination,
        inv.sku,
        inv.shopify_barcode as barcode,
        inv.location,
        inv.price as variant_price,
        inv.cost,
        inv.position,
        inv.weight,
        inv.created_at,
        inv.updated_at,
        p.name as product_name,
        p.description,
        p.price as base_price,
        p.images,
        p.status
      FROM inventory inv
      INNER JOIN products p ON inv.product_id = p.id
      WHERE inv.product_id = $1 AND inv.tenant_id = $2
      ORDER BY inv.position, inv.created_at
    `, [productId, DEFAULT_TENANT_ID]);
    
    if (inventoryResult.rows.length === 0) {
      // Check if product exists but has no inventory
      const productResult = await query(`
        SELECT id, name, description, price, images, status, created_at, updated_at
        FROM products 
        WHERE id = $1 AND tenant_id = $2
      `, [productId, DEFAULT_TENANT_ID]);
      
      if (productResult.rows.length === 0) {
        return notFoundResponse('Product not found');
      }
      
      const product = productResult.rows[0];
      return jsonResponse({
        product: {
          id: product.id,
          name: product.name,
          description: product.description,
          images: product.images,
          status: product.status
        },
        variants: []
      });
    }
    
    const firstRecord = inventoryResult.rows[0];
    const product = {
      id: firstRecord.product_id,
      name: firstRecord.product_name,
      description: firstRecord.description,
      images: firstRecord.images,
      status: firstRecord.status
    };
    
    // Transform inventory records to variant format
    const variants = inventoryResult.rows.map(record => {
      let variantTitle = 'Default Title';
      let color = '';
      let size = '';
      
      // Parse variant combination
      if (record.variant_combination) {
        try {
          const combo = typeof record.variant_combination === 'string' 
            ? JSON.parse(record.variant_combination) 
            : record.variant_combination;
          
          color = combo.color || '';
          size = combo.size || '';
          
          if (color || size) {
            const parts = [];
            if (color) parts.push(color);
            if (size) parts.push(size);
            variantTitle = parts.join(' / ');
          }
        } catch (error) {
          console.error('Error parsing variant_combination:', error);
        }
      }
      
      return {
        id: record.id, // Use real inventory record ID
        product_id: record.product_id,
        color,
        size,
        title: variantTitle,
        price: record.variant_price || firstRecord.base_price,
        compare_at_price: null,
        sku: record.sku || '',
        barcode: record.barcode || '',
        inventory_quantity: record.quantity || 0,
        available: record.quantity || 0,
        on_hand: record.quantity || 0,
        committed: 0,
        unavailable: 0,
        track_quantity: true,
        continue_selling_when_out_of_stock: false,
        requires_shipping: true,
        weight: record.weight || 0,
        weight_unit: 'lb',
        location: record.location || '',
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