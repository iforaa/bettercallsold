-- Comprehensive Migration Verification Script

\echo '=== INVENTORY MIGRATION VERIFICATION ==='
\echo ''

-- Check record counts
\echo '1. Record Counts:'
SELECT 
    'Products' as table_name, COUNT(*) as record_count FROM products
UNION ALL
SELECT 
    'Inventory' as table_name, COUNT(*) as record_count FROM inventory
UNION ALL
SELECT 
    'Product Variants' as table_name, COUNT(*) as record_count FROM product_variants;

\echo ''

-- Check inventory distribution
\echo '2. Inventory Distribution:'
SELECT 
    CASE 
        WHEN variant_combination = '{}' THEN 'Simple Products'
        ELSE 'Variant Products'
    END as product_type,
    COUNT(*) as inventory_records,
    SUM(quantity) as total_quantity
FROM inventory
GROUP BY (variant_combination = '{}')
ORDER BY (variant_combination = '{}') DESC;

\echo ''

-- Check sample variant combinations
\echo '3. Sample Variant Combinations:'
SELECT 
    p.name,
    i.variant_combination,
    i.quantity,
    i.price
FROM products p
JOIN inventory i ON p.id = i.product_id
WHERE i.variant_combination != '{}'
LIMIT 10;

\echo ''

-- Check products with high inventory counts
\echo '4. Products with Highest Inventory:'
SELECT 
    p.name,
    SUM(i.quantity) as total_inventory,
    COUNT(i.id) as variant_count
FROM products p
JOIN inventory i ON p.id = i.product_id
GROUP BY p.id, p.name
ORDER BY SUM(i.quantity) DESC
LIMIT 5;

\echo ''

-- Check for any potential data issues
\echo '5. Data Quality Check:'
SELECT 
    'Inventory without Product' as issue,
    COUNT(*) as count
FROM inventory i
LEFT JOIN products p ON i.product_id = p.id
WHERE p.id IS NULL

UNION ALL

SELECT 
    'Negative Quantities' as issue,
    COUNT(*) as count
FROM inventory
WHERE quantity < 0

UNION ALL

SELECT 
    'Null Variant Combinations' as issue,
    COUNT(*) as count
FROM inventory
WHERE variant_combination IS NULL;

\echo ''
\echo '=== VERIFICATION COMPLETE ==='