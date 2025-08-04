import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse, badRequestResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';

export async function GET() {
	try {
		console.log('🔗 Fetching app config for admin');

		// Get app configuration
		const configQuery = `
			SELECT 
				primary_color,
				secondary_color,
				accent_color,
				background_color,
				text_color,
				promo_message_line1,
				promo_message_line2,
				enabled_tabs,
				app_name,
				updated_at
			FROM app_config 
			WHERE tenant_id = $1 AND config_type = 'mobile_app'
			LIMIT 1
		`;

		const result = await query(configQuery, [DEFAULT_TENANT_ID]);
		
		if (result.rows.length === 0) {
			return jsonResponse({ 
				success: false, 
				message: 'No configuration found' 
			});
		}

		const config = result.rows[0];

		// Parse enabled_tabs JSON
		let enabledTabs = [];
		try {
			enabledTabs = typeof config.enabled_tabs === 'string' 
				? JSON.parse(config.enabled_tabs) 
				: config.enabled_tabs || [];
		} catch (e) {
			console.error('Error parsing enabled_tabs:', e);
			enabledTabs = [];
		}

		return jsonResponse({
			success: true,
			config: {
				colors: {
					primary: config.primary_color,
					secondary: config.secondary_color,
					accent: config.accent_color,
					background: config.background_color,
					text: config.text_color
				},
				messages: {
					promoLine1: config.promo_message_line1,
					promoLine2: config.promo_message_line2
				},
				tabs: enabledTabs,
				appName: config.app_name,
				lastUpdated: config.updated_at
			}
		});

	} catch (error) {
		console.error('❌ Error fetching app config:', error);
		return internalServerErrorResponse('Failed to fetch app config');
	}
}

export async function PUT({ request }) {
	try {
		const { colors, messages, tabs, appName } = await request.json();
		
		console.log('🔗 Updating app config:', { colors, messages, tabs, appName });

		// Validate required fields
		if (!colors || !messages || !tabs) {
			return badRequestResponse('Missing required fields: colors, messages, tabs');
		}

		// Validate color format (hex colors)
		const hexColorRegex = /^#[0-9A-F]{6}$/i;
		const colorFields = ['primary', 'secondary', 'accent', 'background', 'text'];
		
		for (const field of colorFields) {
			if (colors[field] && !hexColorRegex.test(colors[field])) {
				return badRequestResponse(`Invalid hex color format for ${field}: ${colors[field]}`);
			}
		}

		// Update app configuration
		const updateQuery = `
			UPDATE app_config 
			SET 
				primary_color = $2,
				secondary_color = $3,
				accent_color = $4,
				background_color = $5,
				text_color = $6,
				promo_message_line1 = $7,
				promo_message_line2 = $8,
				enabled_tabs = $9::jsonb,
				app_name = $10,
				updated_at = CURRENT_TIMESTAMP
			WHERE tenant_id = $1 AND config_type = 'mobile_app'
			RETURNING id
		`;

		const values = [
			DEFAULT_TENANT_ID,
			colors.primary || '#FF69B4',
			colors.secondary || '#FF1493',
			colors.accent || '#FFB6C1',
			colors.background || '#FFFFFF',
			colors.text || '#000000',
			messages.promoLine1 || 'Live every night 8pm CST!',
			messages.promoLine2 || 'Free Shipping 24/7!',
			JSON.stringify(tabs),
			appName || 'Discount Divas'
		];

		const result = await query(updateQuery, values);
		
		if (result.rows.length === 0) {
			return internalServerErrorResponse('Failed to update app config');
		}

		console.log('✅ App config updated successfully');

		return jsonResponse({
			success: true,
			message: 'App configuration updated successfully'
		});

	} catch (error) {
		console.error('❌ Error updating app config:', error);
		return internalServerErrorResponse('Failed to update app config: ' + error.message);
	}
}