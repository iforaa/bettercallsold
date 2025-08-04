import { CommentSoldAPI } from '$lib/commentsold-api.js';
import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse, badRequestResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';

export async function POST({ request }) {
  try {
    const syncSettings = await request.json();
    
    const {
      maxReplays = 20,
      includeProducts = true,
      syncMode = 'update' // 'replace' or 'update'
    } = syncSettings;

    console.log('Starting CommentSold replays sync with settings:', syncSettings);

    // Initialize CommentSold API client
    const api = new CommentSoldAPI();
    
    // Stats tracking
    let imported = 0;
    let updated = 0;
    let errors = 0;
    const errorMessages = [];
    const logs = [];

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

    addLog('🚀 Starting CommentSold replays sync', 'info');
    addLog(`📋 Configuration: ${maxReplays} max replays, include products: ${includeProducts}`, 'info');

    // Clear existing replays if replace mode
    if (syncMode === 'replace') {
      addLog('🗑️ Replace mode: Clearing existing replays...', 'warning');
      await query(
        'DELETE FROM live_streams WHERE tenant_id = $1',
        [DEFAULT_TENANT_ID]
      );
      addLog('✅ Existing replays cleared', 'success');
    }

    try {
      // Get live sales/replays from CommentSold
      addLog('📡 Fetching replays from CommentSold...', 'info');
      const liveSales = includeProducts 
        ? await api.getLiveSalesWithDetails(maxReplays)
        : await api.getLiveSales().then(sales => sales.slice(0, maxReplays));

      addLog(`📦 Found ${liveSales.length} replays from CommentSold`, 'success');

      // Process each replay
      for (const liveSale of liveSales) {
        try {
          addLog(`🎬 Processing replay: ${liveSale.name} (ID: ${liveSale.id})`, 'info');
          
          // Check if replay already exists
          const existingReplay = await query(
            'SELECT id FROM live_streams WHERE external_id = $1 AND tenant_id = $2',
            [liveSale.id, DEFAULT_TENANT_ID]
          );

          const now = new Date().toISOString();
          const replayData = {
            external_id: liveSale.id,
            tenant_id: DEFAULT_TENANT_ID,
            title: liveSale.name, // Keep title for compatibility
            name: liveSale.name,
            description: `CommentSold live sale: ${liveSale.name}`,
            source_url: liveSale.sourceUrl,
            source_thumb: liveSale.sourceThumb,
            animated_thumb: liveSale.animatedThumb,
            started_at: liveSale.startedAtDate,
            ended_at: liveSale.endedAtDate,
            product_count: liveSale.productCount,
            peak_viewers: liveSale.peakViewers,
            is_live: liveSale.isLive,
            label: liveSale.label,
            is_wide_cell: liveSale.isWideCell,
            status: 'active',
            metadata: JSON.stringify({
              sync_date: now,
              cs_id: liveSale.id,
              products_synced: includeProducts
            }),
            updated_at: now
          };

          let replayId;
          if (existingReplay.rows.length > 0) {
            // Update existing replay
            await query(`
              UPDATE live_streams SET 
                title = $1, name = $2, description = $3, source_url = $4, source_thumb = $5, 
                animated_thumb = $6, started_at = $7, ended_at = $8, product_count = $9, 
                peak_viewers = $10, is_live = $11, label = $12, is_wide_cell = $13, 
                metadata = $14, updated_at = $15
              WHERE external_id = $16 AND tenant_id = $17
            `, [
              replayData.title, replayData.name, replayData.description, replayData.source_url, 
              replayData.source_thumb, replayData.animated_thumb, replayData.started_at, 
              replayData.ended_at, replayData.product_count, replayData.peak_viewers,
              replayData.is_live, replayData.label, replayData.is_wide_cell, replayData.metadata, 
              replayData.updated_at, replayData.external_id, replayData.tenant_id
            ]);
            replayId = existingReplay.rows[0].id;
            updated++;
            addLog(`🔄 Updated existing replay: ${liveSale.name}`, 'success');
          } else {
            // Insert new replay
            const result = await query(`
              INSERT INTO live_streams (
                external_id, tenant_id, title, name, description, source_url, source_thumb, 
                animated_thumb, started_at, ended_at, product_count, peak_viewers, is_live, 
                label, is_wide_cell, status, metadata, created_at, updated_at
              ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
              ) RETURNING id
            `, [
              replayData.external_id, replayData.tenant_id, replayData.title, replayData.name,
              replayData.description, replayData.source_url, replayData.source_thumb, 
              replayData.animated_thumb, replayData.started_at, replayData.ended_at, 
              replayData.product_count, replayData.peak_viewers, replayData.is_live, 
              replayData.label, replayData.is_wide_cell, replayData.status, replayData.metadata,
              now, replayData.updated_at
            ]);
            replayId = result.rows[0].id;
            imported++;
            addLog(`➕ Imported new replay: ${liveSale.name}`, 'success');
          }

          // Sync products if requested and available
          if (includeProducts && liveSale.products && liveSale.products.length > 0) {
            addLog(`📦 Syncing ${liveSale.products.length} products for replay: ${liveSale.name}`, 'info');
            
            // Clear existing products for this replay
            await query('DELETE FROM replay_products WHERE replay_id = $1', [replayId]);
            
            // Insert replay products
            for (const product of liveSale.products) {
              try {
                const productData = {
                  replay_id: replayId,
                  external_id: product.productId,
                  product_name: product.productName,
                  brand: product.brand,
                  identifier: product.identifier,
                  thumbnail: product.thumbnail,
                  price: product.price,
                  price_label: product.priceLabel,
                  quantity: product.quantity,
                  badge_label: product.badgeLabel,
                  shown_at: product.shownAtDate,
                  hidden_at: product.hiddenAtDate,
                  is_favorite: product.isFavorite,
                  description: product.description,
                  store_description: product.storeDescription,
                  product_path: product.productPath,
                  external_product_id: product.externalId,
                  product_type: product.productType,
                  shopify_product_id: product.shopifyProductId,
                  media: JSON.stringify(product.media),
                  overlay_texts: JSON.stringify(product.overlayTexts),
                  inventory: JSON.stringify(product.inventory),
                  metadata: JSON.stringify({
                    sync_date: now,
                    cs_product_id: product.productId,
                    cs_replay_id: liveSale.id
                  })
                };

                await query(`
                  INSERT INTO replay_products (
                    replay_id, external_id, product_name, brand, identifier, thumbnail,
                    price, price_label, quantity, badge_label, shown_at, hidden_at,
                    is_favorite, description, store_description, product_path,
                    external_product_id, product_type, shopify_product_id,
                    media, overlay_texts, inventory, metadata, created_at, updated_at
                  ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 
                    $16, $17, $18, $19, $20, $21, $22, $23, $24, $25
                  )
                `, [
                  productData.replay_id, productData.external_id, productData.product_name,
                  productData.brand, productData.identifier, productData.thumbnail,
                  productData.price, productData.price_label, productData.quantity,
                  productData.badge_label, productData.shown_at, productData.hidden_at,
                  productData.is_favorite, productData.description, productData.store_description,
                  productData.product_path, productData.external_product_id, productData.product_type,
                  productData.shopify_product_id, productData.media, productData.overlay_texts,
                  productData.inventory, productData.metadata, now, now
                ]);
              } catch (productError) {
                addLog(`❌ Error syncing product ${product.productId}: ${productError.message}`, 'error');
                errors++;
              }
            }
            
            addLog(`✅ Synced ${liveSale.products.length} products for replay: ${liveSale.name}`, 'success');
          }

        } catch (replayError) {
          addLog(`❌ Error processing replay ${liveSale.id}: ${replayError.message}`, 'error');
          errors++;
          errorMessages.push(`Replay ${liveSale.id}: ${replayError.message}`);
        }
      }

    } catch (apiError) {
      addLog(`❌ Error fetching replays from CommentSold: ${apiError.message}`, 'error');
      errors++;
      errorMessages.push(`CommentSold API: ${apiError.message}`);
    }

    addLog('🏁 Replays sync process completed', 'info');
    addLog(`📊 Final results: ${imported} imported, ${updated} updated, ${errors} errors`, 'success');

    const results = {
      imported,
      updated,
      errors,
      errorMessages: errorMessages.slice(0, 10), // Limit error messages
      total: imported + updated,
      settings: syncSettings,
      logs: logs
    };

    console.log('Replays sync completed:', results);

    return jsonResponse(results);

  } catch (error) {
    console.error('CommentSold replays sync error:', error);
    return internalServerErrorResponse(`Replays sync failed: ${error.message}`);
  }
}