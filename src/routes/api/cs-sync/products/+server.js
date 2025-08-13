import { CommentSoldAPI } from '$lib/commentsold-api.js';
import { query } from '$lib/database.js';
import { createInventoryRecord } from '$lib/inventory-db.js';
import { jsonResponse, internalServerErrorResponse, badRequestResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';
import { ProductService } from '$lib/services/ProductService.js';

export async function POST({ request }) {
  try {
    const syncSettings = await request.json();
    
    // Validate sync settings
    if (!syncSettings.selectedCollections || syncSettings.selectedCollections.length === 0) {
      return badRequestResponse('At least one collection must be selected');
    }
    
    const {
      maxProducts = 50,
      includeImages = true,
      includeInventory = true,
      selectedCollections = [],
      syncMode = 'update'
    } = syncSettings;

    console.log('Starting CommentSold sync with settings:', syncSettings);

    // Initialize CommentSold API client
    const api = new CommentSoldAPI();
    
    // Stats tracking
    let imported = 0;
    let updated = 0;
    let errors = 0;
    const errorMessages = [];
    const logs = [];
    const createdCollections = new Map(); // Track created collections to avoid duplicates

    // Helper function to add logs
    function addLog(message, type = 'info') {
      const logEntry = {
        timestamp: new Date().toISOString(),
        message,
        type
      };
      logs.push(logEntry);
      console.log(`[${type.toUpperCase()}] ${message}`);
    }

    // Helper function to create or get collection
    async function createOrGetCollection(collectionId) {
      // Check if we already created this collection in this sync
      if (createdCollections.has(collectionId)) {
        return createdCollections.get(collectionId);
      }

      try {
        // First get collection details from CommentSold API
        const collections = await api.getCollections();
        const csCollection = collections.find(c => c.id === collectionId);
        
        if (!csCollection) {
          addLog(`⚠️ Collection ${collectionId} not found in CommentSold API`, 'warning');
          return null;
        }

        // Check if collection already exists in our database
        const existingCollection = await query(
          'SELECT id FROM collections WHERE name = $1 AND tenant_id = $2',
          [csCollection.title, DEFAULT_TENANT_ID]
        );

        let dbCollectionId;
        if (existingCollection.rows.length > 0) {
          dbCollectionId = existingCollection.rows[0].id;
          addLog(`📂 Found existing collection: ${csCollection.title}`, 'info');
        } else {
          // Create new collection
          const now = new Date().toISOString();
          const result = await query(`
            INSERT INTO collections (
              id, tenant_id, name, description, image_url, sort_order, created_at, updated_at
            ) VALUES (
              uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7
            ) RETURNING id
          `, [
            DEFAULT_TENANT_ID,
            csCollection.title,
            `Imported from CommentSold (ID: ${csCollection.id})`,
            csCollection.image || null,
            csCollection.position || 0,
            now,
            now
          ]);
          
          dbCollectionId = result.rows[0].id;
          addLog(`✅ Created new collection: ${csCollection.title}`, 'success');
        }

        // Cache the collection ID
        createdCollections.set(collectionId, dbCollectionId);
        return dbCollectionId;
      } catch (error) {
        addLog(`❌ Error creating collection ${collectionId}: ${error.message}`, 'error');
        return null;
      }
    }

    // Helper function to associate product with collection
    async function associateProductWithCollection(productId, collectionId) {
      try {
        // Check if association already exists
        const existingAssociation = await query(
          'SELECT 1 FROM product_collections WHERE product_id = $1 AND collection_id = $2',
          [productId, collectionId]
        );

        if (existingAssociation.rows.length === 0) {
          await query(
            'INSERT INTO product_collections (product_id, collection_id) VALUES ($1, $2)',
            [productId, collectionId]
          );
          return true;
        }
        return false; // Already existed
      } catch (error) {
        addLog(`❌ Error associating product with collection: ${error.message}`, 'error');
        return false;
      }
    }

    addLog('🚀 Starting CommentSold product sync', 'info');
    addLog(`📋 Configuration: ${maxProducts} max products, ${selectedCollections.length} collections`, 'info');

    // Clear existing products if replace mode
    if (syncMode === 'replace') {
      addLog('🗑️ Replace mode: Clearing existing products...', 'warning');
      await query(
        'DELETE FROM products WHERE tenant_id = $1',
        [DEFAULT_TENANT_ID]
      );
      addLog('✅ Existing products cleared', 'success');
    }

    // Process each selected collection
    for (const collectionId of selectedCollections) {
      try {
        addLog(`📂 Processing collection ${collectionId}...`, 'info');
        
        // Create or get the collection first
        const dbCollectionId = await createOrGetCollection(collectionId);
        if (!dbCollectionId) {
          addLog(`⚠️ Skipping collection ${collectionId} - could not create/find`, 'warning');
          continue;
        }
        
        // Get products from this collection
        const products = await api.getAllProductsFromCollection(
          collectionId, 
          Math.floor(maxProducts / selectedCollections.length)
        );

        addLog(`📦 Found ${products.length} products in collection ${collectionId}`, 'success');

        // Process each product
        for (const product of products) {
          try {
            addLog(`🔍 Fetching details for product: ${product.productName} (ID: ${product.productId})`, 'info');
            
            // Get detailed product information
            const detailedProduct = await api.getProductDetails(product.productId);
            if (!detailedProduct) {
              addLog(`⚠️ Could not fetch details for product ${product.productId}`, 'warning');
              errors++;
              continue;
            }

            // Check if product exists by name (since we don't have external_id)
            const existingProduct = await query(
              'SELECT id FROM products WHERE name = $1 AND tenant_id = $2',
              [detailedProduct.productName, DEFAULT_TENANT_ID]
            );

            const now = new Date().toISOString();
            const productData = {
              name: detailedProduct.productName,
              description: detailedProduct.description || detailedProduct.storeDescription || '',
              price: detailedProduct.price || 0,
              status: detailedProduct.isInStock ? 'active' : 'draft',
              tags: '{}', // Use empty PostgreSQL array syntax
              tenant_id: DEFAULT_TENANT_ID,
              created_at: now,
              updated_at: now
            };

            // Process and upload images to Cloudflare if requested
            let images = [];
            if (includeImages && detailedProduct.allImageUrls && detailedProduct.allImageUrls.length > 0) {
              addLog(`📸 Processing ${detailedProduct.allImageUrls.length} media files for ${detailedProduct.productName}`, 'info');
              
              try {
                // Download and upload media to Cloudflare
                const cloudflareUrls = await ProductService.downloadAndUploadMedia(
                  detailedProduct.allImageUrls, 
                  detailedProduct.productName
                );
                
                if (cloudflareUrls.length > 0) {
                  images = cloudflareUrls.map((url, index) => ({
                    url: url,
                    alt: detailedProduct.productName,
                    position: index + 1,
                    source: 'cloudflare'
                  }));
                  addLog(`✅ Uploaded ${cloudflareUrls.length} media files to Cloudflare for ${detailedProduct.productName}`, 'success');
                } else {
                  addLog(`⚠️ No media files were successfully uploaded for ${detailedProduct.productName}`, 'warning');
                }
              } catch (mediaError) {
                addLog(`❌ Failed to upload media for ${detailedProduct.productName}: ${mediaError.message}`, 'error');
                // Fallback to original URLs if Cloudflare upload fails
                images = detailedProduct.allImageUrls.map((url, index) => ({
                  url: url,
                  alt: detailedProduct.productName,
                  position: index + 1,
                  source: 'commentsold'
                }));
                addLog(`📎 Using original CommentSold URLs as fallback for ${detailedProduct.productName}`, 'info');
              }
            }
            productData.images = images.length > 0 ? JSON.stringify(images) : null;

            // Extract inventory data for later processing
            let inventoryItems = [];
            if (includeInventory && detailedProduct.inventory && detailedProduct.inventory.length > 0) {
              inventoryItems = detailedProduct.inventory.map((item, index) => ({
                quantity: item.quantity || 0,
                variant_combination: {
                  ...(item.color && item.color !== '' ? { color: item.color } : {}),
                  ...(item.size && item.size !== '' ? { size: item.size } : {})
                },
                price: item.price || detailedProduct.price || 0,
                sku: item.sku || '',
                position: item.position || index + 1
              }));
            } else if (includeInventory && detailedProduct.quantity > 0) {
              // Simple product with just total quantity
              inventoryItems = [{
                quantity: detailedProduct.quantity,
                variant_combination: {},
                price: detailedProduct.price || 0,
                sku: '',
                position: 1
              }];
            }

            let productId;
            if (existingProduct.rows.length > 0) {
              // Update existing product
              await query(`
                UPDATE products SET 
                  description = $1, price = $2, images = $3, status = $4, updated_at = $5
                WHERE name = $6 AND tenant_id = $7
              `, [
                productData.description,
                productData.price,
                productData.images,
                productData.status,
                productData.updated_at,
                productData.name,
                productData.tenant_id
              ]);
              productId = existingProduct.rows[0].id;
              
              // Clear existing inventory for this product
              if (includeInventory) {
                await query('DELETE FROM inventory WHERE product_id = $1 AND tenant_id = $2', [productId, DEFAULT_TENANT_ID]);
                addLog(`🧹 Cleared existing inventory for product: ${detailedProduct.productName}`, 'info');
              }
              
              updated++;
              addLog(`🔄 Updated existing product: ${detailedProduct.productName}`, 'success');
            } else {
              // Insert new product
              const result = await query(`
                INSERT INTO products (
                  id, tenant_id, name, description, price, 
                  images, tags, status, created_at, updated_at
                ) VALUES (
                  uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, $8, $9
                ) RETURNING id
              `, [
                productData.tenant_id,
                productData.name,
                productData.description,
                productData.price,
                productData.images,
                productData.tags,
                productData.status,
                productData.created_at,
                productData.updated_at
              ]);
              productId = result.rows[0].id;
              imported++;
              addLog(`➕ Imported new product: ${detailedProduct.productName}`, 'success');
            }

            // Create inventory records using the new inventory system
            if (includeInventory && inventoryItems.length > 0) {
              let inventoryCreated = 0;
              for (const inventoryItem of inventoryItems) {
                try {
                  await createInventoryRecord(productId, DEFAULT_TENANT_ID, inventoryItem);
                  inventoryCreated++;
                } catch (invError) {
                  addLog(`⚠️ Failed to create inventory record: ${invError.message}`, 'warning');
                }
              }
              addLog(`📦 Created ${inventoryCreated} inventory records for ${detailedProduct.productName}`, 'success');
            }

            // Associate product with collection
            if (productId && dbCollectionId) {
              const associated = await associateProductWithCollection(productId, dbCollectionId);
              if (associated) {
                addLog(`🔗 Associated product ${detailedProduct.productName} with collection`, 'info');
              }
            }

          } catch (productError) {
            addLog(`❌ Error processing product ${product.productId}: ${productError.message}`, 'error');
            errors++;
            errorMessages.push(`Product ${product.productId}: ${productError.message}`);
          }
        }

      } catch (collectionError) {
        addLog(`❌ Error processing collection ${collectionId}: ${collectionError.message}`, 'error');
        errors++;
        errorMessages.push(`Collection ${collectionId}: ${collectionError.message}`);
      }
    }

    addLog('🏁 Sync process completed', 'info');
    addLog(`📊 Final results: ${imported} imported, ${updated} updated, ${errors} errors`, 'success');
    addLog(`📂 Collections processed: ${createdCollections.size}`, 'success');

    const results = {
      imported,
      updated,
      errors,
      errorMessages: errorMessages.slice(0, 10), // Limit error messages
      total: imported + updated,
      collections: createdCollections.size,
      settings: syncSettings,
      logs: logs // Include detailed logs in response
    };

    console.log('Sync completed:', results);

    return jsonResponse(results);

  } catch (error) {
    console.error('CommentSold sync error:', error);
    return internalServerErrorResponse(`Sync failed: ${error.message}`);
  }
}