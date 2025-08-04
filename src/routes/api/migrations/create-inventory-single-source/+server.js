import { query } from '$lib/database.js';
import { Pool } from 'pg';
import { json } from '@sveltejs/kit';
import dotenv from 'dotenv';

dotenv.config();

export async function POST({ request }) {
	try {
		const { action } = await request.json();
		
		if (action === 'create_schema') {
			await createNewSchema();
			return json({ success: true, message: 'New inventory schema created successfully' });
		} else if (action === 'migrate_data') {
			await migrateData();
			return json({ success: true, message: 'Data migration completed successfully' });
		} else if (action === 'verify_data') {
			const verification = await verifyData();
			return json({ success: true, verification });
		} else if (action === 'cleanup_old_fields') {
			await cleanupOldFields();
			return json({ success: true, message: 'Old fields cleaned up successfully' });
		}
		
		return json({ error: 'Invalid action' }, { status: 400 });
	} catch (error) {
		console.error('Migration error:', error);
		return json({ error: error.message }, { status: 500 });
	}
}

async function createNewSchema() {
	console.log('Creating new inventory schema...');
	
	// Create product_variants table
	await query(`
		CREATE TABLE IF NOT EXISTS product_variants (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
			tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
			name VARCHAR(255) NOT NULL, -- "Small", "Large", "Blue", etc.
			type VARCHAR(100) NOT NULL, -- "size", "color", etc.
			position INTEGER DEFAULT 1,
			price_adjustment DECIMAL(10,2) DEFAULT 0, -- price difference from base
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);
	`);
	
	// Add indexes for product_variants
	await query(`
		CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
		CREATE INDEX IF NOT EXISTS idx_product_variants_tenant_id ON product_variants(tenant_id);
		CREATE INDEX IF NOT EXISTS idx_product_variants_type ON product_variants(type);
	`);
	
	// Add tenant isolation policy for product_variants
	await query(`
		CREATE POLICY IF NOT EXISTS tenant_isolation_product_variants 
		ON product_variants 
		FOR ALL 
		USING (tenant_id::text = current_setting('app.current_tenant_id', true));
	`);
	
	// Enable RLS on product_variants
	await query(`ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;`);
	
	// Add update trigger for product_variants
	await query(`
		CREATE TRIGGER IF NOT EXISTS update_product_variants_updated_at 
		BEFORE UPDATE ON product_variants 
		FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
	`);
	
	// Add variant_combination field to inventory table
	await query(`
		ALTER TABLE inventory 
		ADD COLUMN IF NOT EXISTS variant_combination JSONB DEFAULT '{}';
	`);
	
	// Add index for variant_combination
	await query(`
		CREATE INDEX IF NOT EXISTS idx_inventory_variant_combination 
		ON inventory USING GIN (variant_combination);
	`);
	
	console.log('New inventory schema created successfully');
}

async function migrateData() {
	console.log('Starting data migration...');
	
	const pool = new Pool({
		connectionString: process.env.DATABASE_URL,
		ssl: { rejectUnauthorized: false }
	});
	const client = await pool.connect();
	
	try {
		await client.query('BEGIN');
		
		// Get all products with variants
		const productsResult = await client.query(`
			SELECT id, tenant_id, variants, inventory_count, name
			FROM products 
			WHERE variants IS NOT NULL AND variants != '[]'::jsonb
		`);
		
		for (const product of productsResult.rows) {
			const variants = product.variants || [];
			
			// Extract variant types from the first variant to create product_variants
			const variantTypes = new Set();
			variants.forEach(variant => {
				if (variant.size) variantTypes.add('size');
				if (variant.color) variantTypes.add('color');
			});
			
			// Create product_variants entries
			const variantTypeMap = {};
			for (const type of variantTypes) {
				const uniqueValues = [...new Set(variants.map(v => v[type]).filter(Boolean))];
				
				for (let i = 0; i < uniqueValues.length; i++) {
					const value = uniqueValues[i];
					const variantResult = await client.query(`
						INSERT INTO product_variants (product_id, tenant_id, name, type, position)
						VALUES ($1, $2, $3, $4, $5)
						RETURNING id
					`, [product.id, product.tenant_id, value, type, i + 1]);
					
					if (!variantTypeMap[type]) variantTypeMap[type] = {};
					variantTypeMap[type][value] = variantResult.rows[0].id;
				}
			}
			
			// Create inventory records from variants
			for (const variant of variants) {
				const variantCombination = {};
				if (variant.size) variantCombination.size = variant.size;
				if (variant.color) variantCombination.color = variant.color;
				
				// Check if inventory record already exists for this combination
				const existingInventory = await client.query(`
					SELECT id FROM inventory 
					WHERE product_id = $1 AND tenant_id = $2 
					AND variant_combination = $3
				`, [product.id, product.tenant_id, JSON.stringify(variantCombination)]);
				
				if (existingInventory.rows.length === 0) {
					await client.query(`
						INSERT INTO inventory (
							product_id, tenant_id, quantity, variant_combination, 
							price, sku, position
						) VALUES ($1, $2, $3, $4, $5, $6, $7)
					`, [
						product.id,
						product.tenant_id,
						variant.inventory_quantity || 0,
						JSON.stringify(variantCombination),
						variant.price || null,
						variant.sku || '',
						variant.position || 1
					]);
				}
			}
		}
		
		// Handle products with only inventory_count (no variants)
		const simpleProductsResult = await client.query(`
			SELECT id, tenant_id, inventory_count, name
			FROM products 
			WHERE (variants IS NULL OR variants = '[]'::jsonb) 
			AND inventory_count > 0
		`);
		
		for (const product of simpleProductsResult.rows) {
			// Check if inventory record already exists
			const existingInventory = await client.query(`
				SELECT id FROM inventory 
				WHERE product_id = $1 AND tenant_id = $2
			`, [product.id, product.tenant_id]);
			
			if (existingInventory.rows.length === 0) {
				await client.query(`
					INSERT INTO inventory (product_id, tenant_id, quantity, variant_combination)
					VALUES ($1, $2, $3, '{}')
				`, [product.id, product.tenant_id, product.inventory_count || 0]);
			}
		}
		
		await client.query('COMMIT');
		console.log('Data migration completed successfully');
		
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
		await pool.end();
	}
}

async function verifyData() {
	console.log('Verifying migrated data...');
	
	// Count products vs inventory records
	const productCount = await query('SELECT COUNT(*) as count FROM products');
	const inventoryCount = await query('SELECT COUNT(*) as count FROM inventory');
	const variantCount = await query('SELECT COUNT(*) as count FROM product_variants');
	
	// Check for data consistency
	const inconsistentProducts = await query(`
		SELECT p.id, p.name, p.inventory_count,
			   COALESCE(SUM(i.quantity), 0) as total_inventory_quantity
		FROM products p
		LEFT JOIN inventory i ON p.id = i.product_id
		GROUP BY p.id, p.name, p.inventory_count
		HAVING p.inventory_count != COALESCE(SUM(i.quantity), 0)
		LIMIT 10
	`);
	
	return {
		productCount: productCount.rows[0].count,
		inventoryCount: inventoryCount.rows[0].count,
		variantCount: variantCount.rows[0].count,
		inconsistentProducts: inconsistentProducts.rows
	};
}

async function cleanupOldFields() {
	console.log('Cleaning up old fields...');
	
	// This will be done after all code is updated
	// For now, just add comments to mark deprecated fields
	await query(`
		COMMENT ON COLUMN products.inventory_count IS 'DEPRECATED: Use inventory table instead';
		COMMENT ON COLUMN products.variants IS 'DEPRECATED: Use product_variants and inventory tables instead';
	`);
	
	console.log('Old fields marked as deprecated');
}