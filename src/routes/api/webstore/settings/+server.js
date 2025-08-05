import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse, badRequestResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';

// Get webstore settings
export async function GET() {
	try {
		// Get settings for the current tenant
		const settingsQuery = `
			SELECT 
				store_name,
				store_description,
				store_url,
				header_logo_url,
				header_navigation,
				primary_color,
				secondary_color,
				accent_color,
				background_color,
				text_color,
				font_family,
				font_size_base,
				footer_enabled,
				footer_sections,
				footer_newsletter_enabled,
				footer_text,
				hero_image_url,
				hero_title,
				hero_subtitle,
				hero_cta_text,
				hero_cta_url,
				products_per_page,
				show_product_prices,
				show_product_variants,
				enable_cart,
				enable_wishlist,
				meta_title,
				meta_description,
				meta_keywords,
				social_links,
				store_enabled,
				maintenance_mode,
				maintenance_message,
				created_at,
				updated_at
			FROM webstore_settings 
			WHERE tenant_id = $1
		`;
		
		const result = await query(settingsQuery, [DEFAULT_TENANT_ID]);
		
		if (result.rows.length === 0) {
			// If no settings exist, create default ones
			const defaultSettings = {
				store_name: 'My Store',
				store_description: '',
				primary_color: '#1a1a1a',
				secondary_color: '#6b7280',
				accent_color: '#3b82f6',
				header_navigation: ['Home', 'Catalog', 'Contact'],
				hero_title: 'Welcome to our store',
				hero_subtitle: 'Discover amazing products',
				hero_cta_text: 'Shop Now',
				store_enabled: false
			};
			
			const insertQuery = `
				INSERT INTO webstore_settings (
					tenant_id, store_name, store_description, primary_color, 
					secondary_color, accent_color, header_navigation, hero_title,
					hero_subtitle, hero_cta_text, store_enabled
				) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
				RETURNING *
			`;
			
			const insertResult = await query(insertQuery, [
				DEFAULT_TENANT_ID,
				defaultSettings.store_name,
				defaultSettings.store_description,
				defaultSettings.primary_color,
				defaultSettings.secondary_color,
				defaultSettings.accent_color,
				JSON.stringify(defaultSettings.header_navigation),
				defaultSettings.hero_title,
				defaultSettings.hero_subtitle,
				defaultSettings.hero_cta_text,
				defaultSettings.store_enabled
			]);
			
			return jsonResponse(insertResult.rows[0]);
		}
		
		return jsonResponse(result.rows[0]);
	} catch (error) {
		console.error('Get webstore settings error:', error);
		return internalServerErrorResponse('Failed to fetch webstore settings');
	}
}

// Update webstore settings
export async function PUT({ request }) {
	try {
		const settingsData = await request.json();
		
		// Build dynamic query based on provided fields
		const allowedFields = [
			'store_name', 'store_description', 'store_url', 'header_logo_url',
			'header_navigation', 'primary_color', 'secondary_color', 'accent_color',
			'background_color', 'text_color', 'font_family', 'font_size_base',
			'footer_enabled', 'footer_sections', 'footer_newsletter_enabled',
			'footer_text', 'hero_image_url', 'hero_title', 'hero_subtitle',
			'hero_cta_text', 'hero_cta_url', 'products_per_page',
			'show_product_prices', 'show_product_variants', 'enable_cart',
			'enable_wishlist', 'meta_title', 'meta_description', 'meta_keywords',
			'social_links', 'store_enabled', 'maintenance_mode', 'maintenance_message'
		];
		
		const updateFields = [];
		const updateValues = [];
		let paramIndex = 2; // Start at 2 because $1 is tenant_id
		
		for (const [key, value] of Object.entries(settingsData)) {
			if (allowedFields.includes(key) && value !== undefined) {
				updateFields.push(`${key} = $${paramIndex}`);
				
				// Handle JSON fields
				if (['header_navigation', 'footer_sections', 'social_links'].includes(key)) {
					updateValues.push(JSON.stringify(value));
				} else {
					updateValues.push(value);
				}
				paramIndex++;
			}
		}
		
		if (updateFields.length === 0) {
			return badRequestResponse('No valid fields provided for update');
		}
		
		// Add updated_at field
		updateFields.push(`updated_at = NOW()`);
		
		const updateQuery = `
			UPDATE webstore_settings 
			SET ${updateFields.join(', ')}
			WHERE tenant_id = $1
			RETURNING *
		`;
		
		const result = await query(updateQuery, [DEFAULT_TENANT_ID, ...updateValues]);
		
		if (result.rows.length === 0) {
			return internalServerErrorResponse('Failed to update webstore settings');
		}
		
		return jsonResponse({
			message: 'Webstore settings updated successfully',
			data: result.rows[0]
		});
	} catch (error) {
		console.error('Update webstore settings error:', error);
		return internalServerErrorResponse('Failed to update webstore settings');
	}
}