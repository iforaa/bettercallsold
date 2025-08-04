import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse } from '$lib/response.js';

export async function POST() {
	try {
		console.log('Creating app_config table...');

		// Create the app_config table
		const createTableQuery = `
			CREATE TABLE IF NOT EXISTS app_config (
				id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
				tenant_id UUID NOT NULL,
				config_type VARCHAR(50) NOT NULL DEFAULT 'mobile_app',
				
				-- Color configuration
				primary_color VARCHAR(7) DEFAULT '#FF69B4',
				secondary_color VARCHAR(7) DEFAULT '#FF1493',
				accent_color VARCHAR(7) DEFAULT '#FFB6C1',
				background_color VARCHAR(7) DEFAULT '#FFFFFF',
				text_color VARCHAR(7) DEFAULT '#000000',
				
				-- Message configuration
				promo_message_line1 VARCHAR(255) DEFAULT 'Live every night 8pm CST!',
				promo_message_line2 VARCHAR(255) DEFAULT 'Free Shipping 24/7!',
				
				-- Tab configuration (JSON array)
				enabled_tabs JSONB DEFAULT '[
					{"key": "index", "title": "Discount Divas", "icon": "home-outline", "enabled": true},
					{"key": "shop", "title": "Shop", "icon": "bag-outline", "enabled": true},
					{"key": "popclips", "title": "POPCLIPS", "icon": "play-outline", "enabled": true},
					{"key": "waitlist", "title": "Waitlist", "icon": "heart-outline", "enabled": true},
					{"key": "favorites", "title": "Favorites", "icon": "star-outline", "enabled": true},
					{"key": "account", "title": "Account", "icon": "person-outline", "enabled": true}
				]'::jsonb,
				
				-- App metadata
				app_name VARCHAR(255) DEFAULT 'Discount Divas',
				
				-- Timestamps
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				
				-- Unique constraint per tenant
				UNIQUE(tenant_id, config_type)
			);
		`;

		await query(createTableQuery);
		console.log('✅ App config table created successfully');

		// Create indexes for better performance
		const indexQueries = [
			'CREATE INDEX IF NOT EXISTS idx_app_config_tenant_id ON app_config(tenant_id);',
			'CREATE INDEX IF NOT EXISTS idx_app_config_type ON app_config(config_type);'
		];

		for (const indexQuery of indexQueries) {
			await query(indexQuery);
		}
		console.log('✅ App config table indexes created successfully');

		// Insert default configuration for the default tenant
		const insertDefaultQuery = `
			INSERT INTO app_config (tenant_id, config_type)
			VALUES ($1, 'mobile_app')
			ON CONFLICT (tenant_id, config_type) DO NOTHING
		`;

		await query(insertDefaultQuery, ['11111111-1111-1111-1111-111111111111']);
		console.log('✅ Default app config created successfully');

		return jsonResponse({
			success: true,
			message: 'App config table and default configuration created successfully'
		});

	} catch (error) {
		console.error('❌ Error creating app config table:', error);
		return internalServerErrorResponse('Failed to create app config table');
	}
}