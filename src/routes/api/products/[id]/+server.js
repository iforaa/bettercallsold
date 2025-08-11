import { query, getCached, setCache } from '$lib/database.js';
import { getProductWithInventory } from '$lib/inventory-db.js';
import { jsonResponse, internalServerErrorResponse, notFoundResponse, badRequestResponse, successResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID, QUERIES } from '$lib/constants.js';

export async function GET({ params }) {
  try {
    const productId = params.id;
    
    // Create cache key for individual product
    const cacheKey = `product_${productId}_${DEFAULT_TENANT_ID}`;
    
    // Try to get from cache first
    const cachedProduct = await getCached(cacheKey);
    if (cachedProduct) {
      console.log(`🚀 Cache hit for ${cacheKey}`);
      return jsonResponse(cachedProduct);
    }
    
    console.log(`🔍 Cache miss for ${cacheKey}, fetching from database`);
    
    // Use new inventory-aware query
    const product = await getProductWithInventory(productId, DEFAULT_TENANT_ID);
    
    if (!product) {
      return notFoundResponse('Product not found');
    }
    
    // Get associated collections
    const collectionsResult = await query(`
      SELECT c.id, c.name, c.description 
      FROM collections c
      JOIN product_collections pc ON c.id = pc.collection_id
      WHERE pc.product_id = $1
    `, [productId]);
    
    product.product_collections = collectionsResult.rows;
    
    // Cache the result for 5 minutes (300 seconds)
    await setCache(cacheKey, product, 300);
    
    return jsonResponse(product);
  } catch (error) {
    console.error('Get product error:', error);
    return internalServerErrorResponse('Failed to fetch product');
  }
}

export async function PUT({ params, request }) {
  try {
    const productId = params.id;
    const productData = await request.json();
    
    if (!productData.name || !productData.description || productData.price === undefined) {
      return badRequestResponse('Missing required fields: name, description, price');
    }
    
    // Convert arrays for database storage
    const imagesJson = JSON.stringify(productData.images || []);
    const tagsArray = productData.tags || [];
    
    // Update product details
    const result = await query(QUERIES.UPDATE_PRODUCT, [
      productId,
      DEFAULT_TENANT_ID,
      productData.name,
      productData.description,
      productData.price,
      imagesJson,
      tagsArray,
      productData.status || 'active'
    ]);
    
    if (result.rowCount === 0) {
      return notFoundResponse('Product not found');
    }
    
    // Update product-collection relationships if collections are provided
    if (productData.collections && Array.isArray(productData.collections)) {
      await updateProductCollections(productId, productData.collections);
    }
    
    return successResponse('Product updated successfully');
  } catch (error) {
    console.error('Update product error:', error);
    return internalServerErrorResponse(`Failed to update product: ${error.message}`);
  }
}

export async function DELETE({ params }) {
  try {
    const productId = params.id;
    const result = await query(QUERIES.DELETE_PRODUCT, [productId, DEFAULT_TENANT_ID]);
    
    if (result.rowCount === 0) {
      return notFoundResponse('Product not found');
    }
    
    return successResponse('Product deleted successfully');
  } catch (error) {
    console.error('Delete product error:', error);
    return internalServerErrorResponse('Failed to delete product');
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