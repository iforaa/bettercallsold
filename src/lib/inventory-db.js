import { query } from './database.js';

/**
 * Inventory Database Helper Functions
 * Single source of truth for inventory management
 */

// Get product with all inventory records
export async function getProductWithInventory(productId, tenantId) {
    const result = await query(`
        SELECT 
            p.id,
            p.name,
            p.description,
            p.price,
            p.images,
            p.tags,
            p.status,
            p.created_at,
            p.updated_at,
            COALESCE(SUM(i.quantity), 0) as total_inventory,
            jsonb_agg(
                jsonb_build_object(
                    'id', i.id,
                    'quantity', i.quantity,
                    'variant_combination', i.variant_combination,
                    'price', COALESCE(i.price, p.price),
                    'sku', i.sku,
                    'cost', i.cost,
                    'location', i.location,
                    'position', i.position
                ) ORDER BY i.position, i.created_at
            ) FILTER (WHERE i.id IS NOT NULL) as inventory_items
        FROM products p
        LEFT JOIN inventory i ON p.id = i.product_id AND i.tenant_id = $2
        WHERE p.id = $1 AND p.tenant_id = $2
        GROUP BY p.id
    `, [productId, tenantId]);
    
    return result.rows[0] || null;
}

// Get all products with inventory totals for listing
export async function getProductsWithInventory(tenantId, limit = 50, offset = 0, status = null) {
    let whereClause = 'WHERE p.tenant_id = $1';
    let params = [tenantId, limit, offset];
    
    // Add status filter if provided
    if (status && status !== 'all') {
        whereClause += ' AND p.status = $4';
        params.push(status);
    }
    
    const result = await query(`
        SELECT 
            p.id,
            p.name,
            p.description,
            p.price,
            p.images,
            p.status,
            p.created_at,
            p.updated_at,
            COALESCE(SUM(i.quantity), 0) as total_inventory,
            COUNT(i.id) as variant_count,
            COALESCE(
                jsonb_agg(
                    DISTINCT jsonb_build_object(
                        'id', c.id,
                        'name', c.name,
                        'description', c.description
                    )
                ) FILTER (WHERE c.id IS NOT NULL),
                '[]'::jsonb
            ) as product_collections
        FROM products p
        LEFT JOIN inventory i ON p.id = i.product_id AND i.tenant_id = $1
        LEFT JOIN product_collections pc ON p.id = pc.product_id
        LEFT JOIN collections c ON pc.collection_id = c.id
        ${whereClause}
        GROUP BY p.id
        ORDER BY p.created_at DESC
        LIMIT $2 OFFSET $3
    `, params);
    
    return result.rows;
}

// Update inventory quantity for a specific inventory record
export async function updateInventoryQuantity(inventoryId, newQuantity, tenantId) {
    const result = await query(`
        UPDATE inventory 
        SET quantity = $1, updated_at = NOW()
        WHERE id = $2 AND tenant_id = $3
        RETURNING *
    `, [newQuantity, inventoryId, tenantId]);
    
    return result.rows[0] || null;
}

// Create new inventory record
export async function createInventoryRecord(productId, tenantId, inventoryData) {
    const {
        quantity = 0,
        variant_combination = {},
        price = null,
        sku = '',
        cost = null,
        location = '',
        position = 1
    } = inventoryData;
    
    const result = await query(`
        INSERT INTO inventory (
            product_id, tenant_id, quantity, variant_combination, 
            price, sku, cost, location, position
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
    `, [productId, tenantId, quantity, JSON.stringify(variant_combination), price, sku, cost, location, position]);
    
    return result.rows[0];
}

// Delete inventory record
export async function deleteInventoryRecord(inventoryId, tenantId) {
    const result = await query(`
        DELETE FROM inventory 
        WHERE id = $1 AND tenant_id = $2
        RETURNING id
    `, [inventoryId, tenantId]);
    
    return result.rows.length > 0;
}

// Get inventory by variant combination
export async function getInventoryByVariant(productId, variantCombination, tenantId) {
    const result = await query(`
        SELECT * FROM inventory
        WHERE product_id = $1 
        AND variant_combination = $2
        AND tenant_id = $3
    `, [productId, JSON.stringify(variantCombination), tenantId]);
    
    return result.rows[0] || null;
}

// Get low stock products (quantity < threshold)
export async function getLowStockProducts(tenantId, threshold = 5) {
    const result = await query(`
        SELECT 
            p.id,
            p.name,
            i.id as inventory_id,
            i.quantity,
            i.variant_combination,
            i.sku
        FROM products p
        JOIN inventory i ON p.id = i.product_id
        WHERE i.tenant_id = $1 
        AND i.quantity < $2
        ORDER BY i.quantity ASC, p.name
    `, [tenantId, threshold]);
    
    return result.rows;
}

// Get total inventory value
export async function getInventoryValue(tenantId) {
    const result = await query(`
        SELECT 
            SUM(i.quantity * COALESCE(i.cost, i.price, p.price, 0)) as total_cost_value,
            SUM(i.quantity * COALESCE(i.price, p.price, 0)) as total_retail_value,
            SUM(i.quantity) as total_quantity
        FROM inventory i
        JOIN products p ON i.product_id = p.id
        WHERE i.tenant_id = $1
    `, [tenantId]);
    
    return result.rows[0];
}

// Search products by name with inventory
export async function searchProductsWithInventory(tenantId, searchTerm, limit = 20) {
    const result = await query(`
        SELECT 
            p.id,
            p.name,
            p.price,
            p.images,
            COALESCE(SUM(i.quantity), 0) as total_inventory,
            COUNT(i.id) as variant_count
        FROM products p
        LEFT JOIN inventory i ON p.id = i.product_id AND i.tenant_id = $1
        WHERE p.tenant_id = $1 
        AND p.name ILIKE $2
        GROUP BY p.id
        ORDER BY p.name
        LIMIT $3
    `, [tenantId, `%${searchTerm}%`, limit]);
    
    return result.rows;
}