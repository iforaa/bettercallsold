import { query, getCached, setCache } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';

export async function GET() {
	try {
		// Create cache key for app config
		const cacheKey = `mobile_app_config_${DEFAULT_TENANT_ID}`;
		
		// Try to get from cache first
		const cachedConfig = await getCached(cacheKey);
		if (cachedConfig) {
			console.log(`🚀 Cache hit for ${cacheKey}`);
			return jsonResponse(cachedConfig);
		}
		
		console.log(`🔍 Cache miss for ${cacheKey}, fetching from database`);
		console.log('🔗 Fetching app config for mobile app');

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
			// Return default configuration if none exists
			const defaultConfig = {
				colors: {
					primary: '#FF69B4',
					secondary: '#FF1493',
					accent: '#FFB6C1',
					background: '#FFFFFF',
					text: '#000000'
				},
				messages: {
					promoLine1: 'Live every night 8pm CST!',
					promoLine2: 'Free Shipping 24/7!'
				},
				tabs: [
					{key: 'index', title: 'Discount Divas', icon: 'home-outline', enabled: true},
					{key: 'shop', title: 'Shop', icon: 'bag-outline', enabled: true},
					{key: 'popclips', title: 'POPCLIPS', icon: 'play-outline', enabled: true},
					{key: 'waitlist', title: 'Waitlist', icon: 'heart-outline', enabled: true},
					{key: 'favorites', title: 'Favorites', icon: 'star-outline', enabled: true},
					{key: 'account', title: 'Account', icon: 'person-outline', enabled: true}
				],
				appName: 'Discount Divas',
				lastUpdated: null
			};
			
			// Cache default config for 10 minutes (600 seconds)
			await setCache(cacheKey, defaultConfig, 600);
			
			return jsonResponse(defaultConfig);
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

		console.log('✅ App config fetched successfully');

		const configResponse = {
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
		};
		
		// Cache the config for 10 minutes (600 seconds) 
		await setCache(cacheKey, configResponse, 600);
		
		return jsonResponse(configResponse);

	} catch (error) {
		console.error('❌ Error fetching app config:', error);
		return internalServerErrorResponse('Failed to fetch app config');
	}
}