import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse, notFoundResponse, badRequestResponse, successResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';

export async function GET({ params }) {
  try {
    const collectionId = params.id;
    
    // Get collection details
    const collectionResult = await query(`
      SELECT * FROM collections 
      WHERE id = $1 AND tenant_id = $2
    `, [collectionId, DEFAULT_TENANT_ID]);
    
    if (collectionResult.rows.length === 0) {
      return notFoundResponse('Collection not found');
    }
    
    const collection = collectionResult.rows[0];
    
    // Get products in this collection - handle both old and new product structures
    try {
      const productsResult = await query(`
        SELECT 
          COALESCE(p_new.id, p_old.id) as id,
          COALESCE(p_new.title, p_old.name) as name,
          COALESCE(p_new.title, p_old.name) as title,
          COALESCE(p_new.description, p_old.description) as description,
          COALESCE(p_new.images, p_old.images) as images,
          COALESCE(p_new.status, p_old.status) as status,
          COALESCE(p_new.created_at, p_old.created_at) as created_at,
          COALESCE(p_new.updated_at, p_old.updated_at) as updated_at,
          COALESCE(p_old.price, first_variant.price, 0) as price,
          pc.created_at as added_to_collection_at,
          CASE 
            WHEN p_new.id IS NOT NULL THEN 
              COALESCE(ARRAY_AGG(
                json_build_object(
                  'id', pv.id,
                  'title', pv.title,
                  'sku', pv.sku,
                  'price', pv.price,
                  'option1', pv.option1,
                  'option2', pv.option2
                ) ORDER BY pv.position
              ) FILTER (WHERE pv.id IS NOT NULL), ARRAY[]::json[])
            ELSE NULL
          END as variants
        FROM product_collections pc
        LEFT JOIN products_new p_new ON pc.product_id = p_new.id
        LEFT JOIN products_old p_old ON pc.product_id = p_old.id
        LEFT JOIN product_variants_new pv ON pv.product_id = p_new.id
        LEFT JOIN (
          SELECT product_id, price
          FROM product_variants_new
          WHERE position = 1 OR id IN (
            SELECT id FROM product_variants_new pv2 
            WHERE pv2.product_id = product_variants_new.product_id 
            ORDER BY position LIMIT 1
          )
        ) first_variant ON first_variant.product_id = p_new.id
        WHERE pc.collection_id = $1 
        AND (p_new.tenant_id = $2 OR p_old.tenant_id = $2)
        GROUP BY p_new.id, p_old.id, p_new.title, p_old.name, p_new.description, p_old.description, 
                 p_new.images, p_old.images, p_new.status, p_old.status, p_new.created_at, p_old.created_at,
                 p_new.updated_at, p_old.updated_at, p_old.price, first_variant.price, pc.created_at
        ORDER BY pc.created_at ASC
      `, [collectionId, DEFAULT_TENANT_ID]);
      
      collection.products = productsResult.rows;
    } catch (productsError) {
      console.error('Error fetching collection products:', productsError);
      // If product_collections table doesn't exist or there's an error, just return empty products array
      collection.products = [];
    }
    
    return jsonResponse(collection);
  } catch (error) {
    console.error('Get collection error:', error);
    return internalServerErrorResponse('Failed to fetch collection');
  }
}

export async function PUT({ params, request }) {
  try {
    const collectionId = params.id;
    const collectionData = await request.json();
    
    if (!collectionData.name) {
      return badRequestResponse('Missing required field: name');
    }
    
    // Update collection
    const result = await query(`
      UPDATE collections 
      SET name = $3, description = $4, image_url = $5, sort_order = $6, updated_at = NOW()
      WHERE id = $1 AND tenant_id = $2
      RETURNING *
    `, [
      collectionId,
      DEFAULT_TENANT_ID,
      collectionData.name,
      collectionData.description || '',
      collectionData.image_url || null,
      collectionData.sort_order || 0
    ]);
    
    if (result.rowCount === 0) {
      return notFoundResponse('Collection not found');
    }
    
    // Update product associations if provided
    if (collectionData.product_ids && Array.isArray(collectionData.product_ids)) {
      await updateCollectionProducts(collectionId, collectionData.product_ids);
    }
    
    return successResponse('Collection updated successfully');
  } catch (error) {
    console.error('Update collection error:', error);
    return internalServerErrorResponse(`Failed to update collection: ${error.message}`);
  }
}

export async function DELETE({ params }) {
  try {
    const collectionId = params.id;
    
    // First remove all product associations
    await query('DELETE FROM product_collections WHERE collection_id = $1', [collectionId]);
    
    // Then delete the collection
    const result = await query(`
      DELETE FROM collections 
      WHERE id = $1 AND tenant_id = $2
    `, [collectionId, DEFAULT_TENANT_ID]);
    
    if (result.rowCount === 0) {
      return notFoundResponse('Collection not found');
    }
    
    return successResponse('Collection deleted successfully');
  } catch (error) {
    console.error('Delete collection error:', error);
    return internalServerErrorResponse('Failed to delete collection');
  }
}

// Helper function to update collection-product relationships
async function updateCollectionProducts(collectionId, productIds) {
  try {
    // First, remove all existing relationships for this collection
    await query('DELETE FROM product_collections WHERE collection_id = $1', [collectionId]);
    
    // Then, add new relationships
    if (productIds.length > 0) {
      const values = productIds.map((productId, index) => {
        const paramIndex = index * 2 + 1;
        return `($${paramIndex}, $${paramIndex + 1})`;
      }).join(', ');
      
      const params = [];
      productIds.forEach(productId => {
        params.push(collectionId, productId);
      });
      
      const insertQuery = `INSERT INTO product_collections (collection_id, product_id) VALUES ${values}`;
      await query(insertQuery, params);
    }
  } catch (error) {
    console.error('Error updating collection products:', error);
    throw error;
  }
}