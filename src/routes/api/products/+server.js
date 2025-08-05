import { query } from '$lib/database.js';
import { getProductsWithInventory } from '$lib/inventory-db.js';
import { jsonResponse, internalServerErrorResponse, badRequestResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID, QUERIES } from '$lib/constants.js';

export async function GET({ url }) {
  try {
    const searchParams = url.searchParams;
    const limit = parseInt(searchParams.get('limit')) || 50;
    const offset = parseInt(searchParams.get('offset')) || 0;
    const status = searchParams.get('status'); // Get status filter
    
    // Use new inventory-aware query with status filtering
    const products = await getProductsWithInventory(DEFAULT_TENANT_ID, limit, offset, status);
    
    return jsonResponse(products);
  } catch (error) {
    console.error('Get products error:', error);
    return internalServerErrorResponse('Failed to fetch products');
  }
}

export async function POST({ request }) {
  try {
    const productData = await request.json();
    
    if (!productData.name || !productData.description || productData.price === undefined) {
      return badRequestResponse('Missing required fields: name, description, price');
    }
    
    // Convert arrays for database storage
    const imagesJson = JSON.stringify(productData.images || []);
    const tagsArray = productData.tags || [];
    
    const result = await query(QUERIES.CREATE_PRODUCT, [
      DEFAULT_TENANT_ID,
      productData.name,
      productData.description,
      productData.price,
      imagesJson,
      tagsArray,
      productData.status || 'active'
    ]);
    
    if (result.rows.length > 0) {
      const newProductId = result.rows[0].id;
      
      // Add product-collection relationships if collections are provided
      if (productData.collections && Array.isArray(productData.collections)) {
        await updateProductCollections(newProductId, productData.collections);
      }
      
      return jsonResponse({
        message: 'Product created successfully',
        data: { id: newProductId }
      });
    } else {
      return internalServerErrorResponse('Failed to create product');
    }
  } catch (error) {
    console.error('Create product error:', error);
    return internalServerErrorResponse('Failed to create product');
  }
}

// Helper function to update product-collection relationships
async function updateProductCollections(productId, collectionIds) {
  try {
    // First, remove all existing relationships for this product
    await query('DELETE FROM product_collections WHERE product_id = $1', [productId]);
    
    // Then, add new relationships
    if (collectionIds.length > 0) {
      const values = collectionIds.map((collectionId, index) => {
        const paramIndex = index * 2 + 1;
        return `($${paramIndex}, $${paramIndex + 1})`;
      }).join(', ');
      
      const params = [];
      collectionIds.forEach(collectionId => {
        params.push(productId, collectionId);
      });
      
      const insertQuery = `INSERT INTO product_collections (product_id, collection_id) VALUES ${values}`;
      await query(insertQuery, params);
    }
  } catch (error) {
    console.error('Error updating product collections:', error);
    throw error;
  }
}