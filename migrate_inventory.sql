-- Migration Script: Convert to Single Source of Truth Inventory System
-- Step 1: Migrate variants data to inventory table

BEGIN;

-- First, let's create inventory records from the variants JSONB data
-- This handles products like "Long Ruffled Sleeve Floral Printed Midi Dress" with detailed variants

INSERT INTO inventory (product_id, tenant_id, quantity, variant_combination, price, sku, position)
SELECT 
    p.id as product_id,
    p.tenant_id,
    COALESCE((variant->>'inventory_quantity')::integer, 0) as quantity,
    CASE 
        WHEN variant->>'size' != '' AND variant->>'color' != '' THEN
            jsonb_build_object('size', variant->>'size', 'color', variant->>'color')
        WHEN variant->>'size' != '' THEN
            jsonb_build_object('size', variant->>'size')
        WHEN variant->>'color' != '' THEN
            jsonb_build_object('color', variant->>'color')
        ELSE
            '{}'::jsonb
    END as variant_combination,
    COALESCE((variant->>'price')::numeric, p.price) as price,
    COALESCE(variant->>'sku', '') as sku,
    COALESCE((variant->>'position')::integer, 1) as position
FROM products p,
jsonb_array_elements(p.variants) as variant
WHERE jsonb_array_length(p.variants) > 0
AND variant ? 'inventory_quantity'  -- Only variants with inventory data
;

-- Handle simple products with variants that only have color/size but no inventory_quantity
-- These use the product's inventory_count divided by number of variants

INSERT INTO inventory (product_id, tenant_id, quantity, variant_combination, price)
SELECT 
    p.id as product_id,
    p.tenant_id,
    GREATEST(FLOOR(COALESCE(p.inventory_count, 0) / jsonb_array_length(p.variants)), 0) as quantity,
    CASE 
        WHEN variant->>'size' != '' AND variant->>'color' != '' THEN
            jsonb_build_object('size', variant->>'size', 'color', variant->>'color')
        WHEN variant->>'size' != '' THEN
            jsonb_build_object('size', variant->>'size')
        WHEN variant->>'color' != '' THEN
            jsonb_build_object('color', variant->>'color')
        ELSE
            '{}'::jsonb
    END as variant_combination,
    p.price as price
FROM products p,
jsonb_array_elements(p.variants) as variant
WHERE jsonb_array_length(p.variants) > 0
AND NOT (variant ? 'inventory_quantity')  -- Only variants WITHOUT inventory data
;

-- Handle products with NO variants but have inventory_count
-- These become single inventory records with empty variant_combination

INSERT INTO inventory (product_id, tenant_id, quantity, variant_combination, price)
SELECT 
    p.id as product_id,
    p.tenant_id,
    COALESCE(p.inventory_count, 0) as quantity,
    '{}'::jsonb as variant_combination,
    p.price as price
FROM products p
WHERE (p.variants IS NULL OR jsonb_array_length(p.variants) = 0)
AND COALESCE(p.inventory_count, 0) > 0
;

-- Verify the migration
SELECT 
    'Migration Summary' as status,
    COUNT(*) as total_products,
    COUNT(CASE WHEN variants IS NOT NULL AND jsonb_array_length(variants) > 0 THEN 1 END) as products_with_variants,
    COUNT(CASE WHEN inventory_count > 0 THEN 1 END) as products_with_inventory_count
FROM products;

SELECT 
    'Inventory Records Created' as status,
    COUNT(*) as total_inventory_records,
    COUNT(CASE WHEN variant_combination = '{}' THEN 1 END) as simple_products,
    COUNT(CASE WHEN variant_combination != '{}' THEN 1 END) as variant_products
FROM inventory;

COMMIT;