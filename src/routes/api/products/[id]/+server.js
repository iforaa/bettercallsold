import { query, getCached, setCache, deleteCache } from "$lib/database.js";
import {
  jsonResponse,
  internalServerErrorResponse,
  notFoundResponse,
  badRequestResponse,
  successResponse,
} from "$lib/response.js";
import { DEFAULT_TENANT_ID, QUERIES, PLUGIN_EVENTS } from "$lib/constants.js";
import { PluginService } from "$lib/services/PluginService.js";

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

    // Get product with inventory
    const productResult = await query(
      `
      SELECT p.*,
             COALESCE(SUM(i.quantity), 0) as total_inventory,
             COUNT(i.id) as variant_count,
             COALESCE(ARRAY_AGG(
               json_build_object(
                 'id', i.id,
                 'quantity', i.quantity,
                 'variant_combination', i.variant_combination,
                 'price', i.price,
                 'sku', i.sku,
                 'cost', i.cost,
                 'location', i.location,
                 'position', i.position
               ) ORDER BY i.position
             ) FILTER (WHERE i.id IS NOT NULL), ARRAY[]::json[]) as inventory_items
      FROM products p
      LEFT JOIN inventory i ON i.product_id = p.id AND i.tenant_id = p.tenant_id
      WHERE p.id = $1 AND p.tenant_id = $2
      GROUP BY p.id
    `,
      [productId, DEFAULT_TENANT_ID],
    );

    const product = productResult.rows[0];

    if (!product) {
      return notFoundResponse("Product not found");
    }

    // Get associated collections
    const collectionsResult = await query(
      `
      SELECT c.id, c.name, c.description
      FROM collections c
      JOIN product_collections pc ON c.id = pc.collection_id
      WHERE pc.product_id = $1
    `,
      [productId],
    );

    product.product_collections = collectionsResult.rows;

    // Cache the result for 5 minutes (300 seconds)
    await setCache(cacheKey, product, 300);

    return jsonResponse(product);
  } catch (error) {
    console.error("Get product error:", error);
    return internalServerErrorResponse("Failed to fetch product");
  }
}

export async function PUT({ params, request }) {
  return handleProductUpdate({ params, request });
}

export async function PATCH({ params, request }) {
  return handleProductUpdate({ params, request });
}

async function handleProductUpdate({ params, request }) {
  try {
    const productId = params.id;
    const productData = await request.json();

    if (
      !productData.name ||
      !productData.description ||
      productData.price === undefined
    ) {
      return badRequestResponse(
        "Missing required fields: name, description, price",
      );
    }

    // Convert arrays for database storage
    const imagesJson = JSON.stringify(productData.images || []);
    const tagsArray = productData.tags || [];

    console.log(
      `Updating product ${productId} with images:`,
      productData.images,
    );

    // Update product details
    const result = await query(QUERIES.UPDATE_PRODUCT, [
      productId,
      DEFAULT_TENANT_ID,
      productData.name,
      productData.description,
      productData.price,
      imagesJson,
      tagsArray,
      productData.status || "active",
    ]);

    if (result.rowCount === 0) {
      return notFoundResponse("Product not found");
    }

    // Update product-collection relationships if collections are provided
    if (productData.collections && Array.isArray(productData.collections)) {
      await updateProductCollections(productId, productData.collections);
    }

    // Clear cache for this product
    const productCacheKey = `product_${productId}_${DEFAULT_TENANT_ID}`;
    try {
      const cacheDeleted = await deleteCache(productCacheKey);
      console.log(
        `Cache ${cacheDeleted ? "cleared" : "not found"} for ${productCacheKey}`,
      );
    } catch (error) {
      console.error("Failed to clear cache:", error);
    }

    // Trigger plugin event for product update
    try {
      const eventPayload = {
        product_id: productId,
        name: productData.name,
        description: productData.description,
        price: productData.price,
        status: productData.status || "active",
        images: productData.images || [],
        tags: productData.tags || [],
        collections: productData.collections || [],
        updated_at: new Date().toISOString(),
      };

      await PluginService.triggerEvent(
        DEFAULT_TENANT_ID,
        PLUGIN_EVENTS.PRODUCT_UPDATED,
        eventPayload,
      );
      console.log(
        `📤 Product updated event triggered for product: ${productId}`,
      );
    } catch (pluginError) {
      console.error("Error triggering plugin event:", pluginError);
      // Don't fail the product update if plugin event fails
    }

    return successResponse("Product updated successfully");
  } catch (error) {
    console.error("Update product error:", error);
    return internalServerErrorResponse(
      `Failed to update product: ${error.message}`,
    );
  }
}

export async function DELETE({ params }) {
  try {
    const productId = params.id;

    // Get product data before deletion for plugin event
    const productResult = await query(QUERIES.GET_PRODUCT_BY_ID, [
      productId,
      DEFAULT_TENANT_ID,
    ]);
    let productData = null;

    if (productResult.rows.length > 0) {
      productData = productResult.rows[0];
    }

    const result = await query(QUERIES.DELETE_PRODUCT, [
      productId,
      DEFAULT_TENANT_ID,
    ]);

    if (result.rowCount === 0) {
      return notFoundResponse("Product not found");
    }

    // Trigger plugin event for product deletion
    if (productData) {
      try {
        const eventPayload = {
          product_id: productId,
          name: productData.name,
          description: productData.description,
          price: productData.price,
          status: productData.status,
          images: productData.images || [],
          tags: productData.tags || [],
          deleted_at: new Date().toISOString(),
        };

        await PluginService.triggerEvent(
          DEFAULT_TENANT_ID,
          PLUGIN_EVENTS.PRODUCT_DELETED,
          eventPayload,
        );
        console.log(
          `📤 Product deleted event triggered for product: ${productId}`,
        );
      } catch (pluginError) {
        console.error("Error triggering plugin event:", pluginError);
        // Don't fail the product deletion if plugin event fails
      }
    }

    return successResponse("Product deleted successfully");
  } catch (error) {
    console.error("Delete product error:", error);
    return internalServerErrorResponse("Failed to delete product");
  }
}

// Helper function to update product-collection relationships
async function updateProductCollections(productId, collectionIds) {
  try {
    // First, remove all existing relationships for this product
    await query("DELETE FROM product_collections WHERE product_id = $1", [
      productId,
    ]);

    // Then, add new relationships
    if (collectionIds.length > 0) {
      const values = collectionIds
        .map((collectionId, index) => {
          const paramIndex = index * 2 + 1;
          return `($${paramIndex}, $${paramIndex + 1})`;
        })
        .join(", ");

      const params = [];
      collectionIds.forEach((collectionId) => {
        params.push(productId, collectionId);
      });

      const insertQuery = `INSERT INTO product_collections (product_id, collection_id) VALUES ${values}`;
      await query(insertQuery, params);
    }
  } catch (error) {
    console.error("Error updating product collections:", error);
    throw error;
  }
}
