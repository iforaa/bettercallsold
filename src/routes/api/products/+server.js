import { query, getCached, setCache } from "$lib/database.js";
import {
  jsonResponse,
  internalServerErrorResponse,
  badRequestResponse,
} from "$lib/response.js";
import { DEFAULT_TENANT_ID, QUERIES, PLUGIN_EVENTS } from "$lib/constants.js";
import { PluginService } from "$lib/services/PluginService.js";
import { MediaService } from "$lib/services/MediaService.js";

export async function GET({ url }) {
  try {
    const searchParams = url.searchParams;
    const limit = parseInt(searchParams.get("limit")) || 50;
    const offset = parseInt(searchParams.get("offset")) || 0;
    const status = searchParams.get("status"); // Get status filter

    // Create cache key based on query parameters
    const cacheKey = `products_${DEFAULT_TENANT_ID}_${limit}_${offset}_${status || "all"}`;

    // Try to get from cache first
    const cachedProducts = await getCached(cacheKey);
    if (cachedProducts) {
      console.log(`🚀 Cache hit for ${cacheKey}`);
      return jsonResponse(cachedProducts);
    }

    console.log(`🔍 Cache miss for ${cacheKey}, fetching from database`);

    // Build query with status filtering
    let whereClause = "WHERE p.tenant_id = $1";
    const params = [DEFAULT_TENANT_ID];
    let paramIndex = 2;

    if (status) {
      whereClause += ` AND p.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    const products = await query(
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
      ${whereClause}
      GROUP BY p.id
      ORDER BY p.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `,
      [...params, limit, offset],
    );

    const productsData = products.rows;

    // Cache the results for 5 minutes (300 seconds)
    await setCache(cacheKey, productsData, 300);

    return jsonResponse(productsData);
  } catch (error) {
    console.error("Get products error:", error);
    return internalServerErrorResponse("Failed to fetch products");
  }
}

export async function POST({ request }) {
  try {
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

    // Handle image processing - download external URLs if provided
    let finalImages = productData.images || [];

    if (
      productData.image_urls &&
      Array.isArray(productData.image_urls) &&
      productData.image_urls.length > 0
    ) {
      console.log(
        `📸 Processing ${productData.image_urls.length} external image URLs for product: ${productData.name}`,
      );

      try {
        // Download and upload external images using MediaService
        const { results, errors } = await MediaService.downloadAndUpload(
          productData.image_urls,
          {
            provider: "cloudflare",
            productName: productData.name,
            stopOnError: false,
            cache: false, // Don't cache external downloads
          },
        );

        // Combine existing images with newly uploaded ones
        finalImages = [...finalImages, ...results];
        console.log(
          `✅ Successfully processed ${results.length} images for product: ${productData.name}${errors.length > 0 ? ` (${errors.length} failed)` : ""}`,
        );
      } catch (imageError) {
        console.error(
          `⚠️ Error processing images for product ${productData.name}:`,
          imageError,
        );
        // Continue with product creation even if images fail
      }
    }

    // Convert arrays for database storage
    const imagesJson = JSON.stringify(finalImages);
    const tagsArray = productData.tags || [];

    const result = await query(QUERIES.CREATE_PRODUCT, [
      DEFAULT_TENANT_ID,
      productData.name,
      productData.description,
      productData.price,
      imagesJson,
      tagsArray,
      productData.status || "active",
    ]);

    if (result.rows.length > 0) {
      const newProductId = result.rows[0].id;

      // Add product-collection relationships if collections are provided
      if (productData.collections && Array.isArray(productData.collections)) {
        await updateProductCollections(newProductId, productData.collections);
      }

      // Trigger plugin event for product creation
      try {
        const eventPayload = {
          product_id: newProductId,
          name: productData.name,
          description: productData.description,
          price: productData.price,
          status: productData.status || "active",
          images: productData.images || [],
          tags: productData.tags || [],
          collections: productData.collections || [],
          created_at: new Date().toISOString(),
        };

        await PluginService.triggerEvent(
          DEFAULT_TENANT_ID,
          PLUGIN_EVENTS.PRODUCT_CREATED,
          eventPayload,
        );
        console.log(
          `📤 Product created event triggered for product: ${newProductId}`,
        );
      } catch (pluginError) {
        console.error("Error triggering plugin event:", pluginError);
        // Don't fail the product creation if plugin event fails
      }

      return jsonResponse({
        message: "Product created successfully",
        created: true,
        data: { id: newProductId },
      });
    } else {
      return internalServerErrorResponse("Failed to create product");
    }
  } catch (error) {
    console.error("Create product error:", error);
    return internalServerErrorResponse("Failed to create product");
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
