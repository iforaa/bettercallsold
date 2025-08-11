/**
 * Mobile App Service - Stateless business logic for mobile app configuration
 * Follows the Services + Runes + Context architecture pattern
 */

export class MobileAppService {
	/**
	 * Get mobile app configuration
	 * @returns {Promise<Object>} App configuration
	 */
	static async getAppConfig() {
		const response = await fetch('/api/admin/app-config');
		
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}
		
		const data = await response.json();
		
		if (!data.success) {
			throw new Error(data.message || 'Failed to load configuration');
		}
		
		return data.config;
	}

	/**
	 * Save mobile app configuration
	 * @param {Object} config - App configuration to save
	 * @returns {Promise<Object>} Save result
	 */
	static async saveAppConfig(config) {
		const response = await fetch('/api/admin/app-config', {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(config),
		});
		
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}
		
		const data = await response.json();
		
		if (!data.success) {
			throw new Error(data.message || 'Failed to save configuration');
		}
		
		return data;
	}

	/**
	 * Get default app configuration
	 * @returns {Object} Default configuration
	 */
	static getDefaultConfig() {
		return {
			colors: {
				primary: "#FF69B4",
				secondary: "#FF1493",
				accent: "#FFB6C1",
				background: "#FFFFFF",
				text: "#000000",
			},
			messages: {
				promoLine1: "Live every night 8pm CST!",
				promoLine2: "Free Shipping 24/7!",
			},
			tabs: [
				{
					key: "index",
					title: "Discount Divas",
					icon: "home-outline",
					enabled: true,
				},
				{ key: "shop", title: "Shop", icon: "bag-outline", enabled: true },
				{
					key: "popclips",
					title: "POPCLIPS",
					icon: "play-outline",
					enabled: true,
				},
				{
					key: "waitlist",
					title: "Waitlist",
					icon: "heart-outline",
					enabled: true,
				},
				{
					key: "favorites",
					title: "Favorites",
					icon: "star-outline",
					enabled: true,
				},
				{
					key: "account",
					title: "Account",
					icon: "person-outline",
					enabled: true,
				},
			],
			appName: "Discount Divas",
		};
	}

	/**
	 * Get predefined color presets
	 * @returns {Array} Array of color presets
	 */
	static getColorPresets() {
		return [
			{
				name: "Pink (Default)",
				colors: {
					primary: "#FF69B4",
					secondary: "#FF1493",
					accent: "#FFB6C1",
					background: "#FFFFFF",
					text: "#000000",
				},
			},
			{
				name: "Blue Ocean",
				colors: {
					primary: "#0066CC",
					secondary: "#004499",
					accent: "#66B3FF",
					background: "#FFFFFF",
					text: "#000000",
				},
			},
			{
				name: "Purple Luxury",
				colors: {
					primary: "#8A2BE2",
					secondary: "#6A1B9A",
					accent: "#BA68C8",
					background: "#FFFFFF",
					text: "#000000",
				},
			},
			{
				name: "Green Fresh",
				colors: {
					primary: "#4CAF50",
					secondary: "#388E3C",
					accent: "#81C784",
					background: "#FFFFFF",
					text: "#000000",
				},
			},
			{
				name: "Orange Energy",
				colors: {
					primary: "#FF9800",
					secondary: "#F57C00",
					accent: "#FFB74D",
					background: "#FFFFFF",
					text: "#000000",
				},
			},
			{
				name: "Dark Mode",
				colors: {
					primary: "#FF69B4",
					secondary: "#FF1493",
					accent: "#FFB6C1",
					background: "#121212",
					text: "#FFFFFF",
				},
			},
		];
	}

	/**
	 * Get available icons for tabs
	 * @returns {Array} Array of available icons
	 */
	static getAvailableIcons() {
		return [
			"home-outline",
			"bag-outline",
			"play-outline",
			"heart-outline",
			"star-outline",
			"person-outline",
			"storefront-outline",
			"gift-outline",
			"flash-outline",
			"trending-up-outline",
			"diamond-outline",
			"ribbon-outline",
			"sparkles-outline",
		];
	}

	/**
	 * Business logic: Validate app configuration
	 * @param {Object} config - Configuration to validate
	 * @returns {Object} Validation result
	 */
	static validateConfig(config) {
		const errors = [];

		// Validate app name
		if (!config.appName || config.appName.trim().length === 0) {
			errors.push('App name is required');
		}

		// Validate colors
		if (!config.colors) {
			errors.push('Color configuration is required');
		} else {
			const requiredColors = ['primary', 'secondary', 'accent', 'background', 'text'];
			for (const color of requiredColors) {
				if (!config.colors[color]) {
					errors.push(`${color} color is required`);
				} else if (!MobileAppService.isValidHexColor(config.colors[color])) {
					errors.push(`${color} must be a valid hex color`);
				}
			}
		}

		// Validate messages
		if (!config.messages) {
			errors.push('Promo messages are required');
		} else {
			if (!config.messages.promoLine1) {
				errors.push('Promo message line 1 is required');
			}
			if (!config.messages.promoLine2) {
				errors.push('Promo message line 2 is required');
			}
		}

		// Validate tabs
		if (!config.tabs || !Array.isArray(config.tabs)) {
			errors.push('Tabs configuration is required');
		} else {
			const enabledTabs = config.tabs.filter(tab => tab.enabled);
			if (enabledTabs.length === 0) {
				errors.push('At least one tab must be enabled');
			}

			config.tabs.forEach((tab, index) => {
				if (!tab.title || tab.title.trim().length === 0) {
					errors.push(`Tab ${index + 1} title is required`);
				}
				if (!tab.icon) {
					errors.push(`Tab ${index + 1} icon is required`);
				}
			});
		}

		return {
			valid: errors.length === 0,
			errors: errors
		};
	}

	/**
	 * Business logic: Check if a string is a valid hex color
	 * @param {string} color - Color string to validate
	 * @returns {boolean} True if valid hex color
	 */
	static isValidHexColor(color) {
		const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
		return hexRegex.test(color);
	}

	/**
	 * Business logic: Apply color preset to configuration
	 * @param {Object} config - Current configuration
	 * @param {Object} preset - Color preset to apply
	 * @returns {Object} Updated configuration
	 */
	static applyColorPreset(config, preset) {
		return {
			...config,
			colors: { ...preset.colors }
		};
	}

	/**
	 * Business logic: Toggle tab enabled state
	 * @param {Object} config - Current configuration
	 * @param {number} tabIndex - Index of tab to toggle
	 * @returns {Object} Updated configuration
	 */
	static toggleTab(config, tabIndex) {
		if (tabIndex < 0 || tabIndex >= config.tabs.length) {
			throw new Error('Invalid tab index');
		}

		const updatedConfig = { ...config };
		updatedConfig.tabs = [...config.tabs];
		updatedConfig.tabs[tabIndex] = {
			...config.tabs[tabIndex],
			enabled: !config.tabs[tabIndex].enabled
		};

		return updatedConfig;
	}

	/**
	 * Business logic: Update tab configuration
	 * @param {Object} config - Current configuration
	 * @param {number} tabIndex - Index of tab to update
	 * @param {Object} updates - Tab updates
	 * @returns {Object} Updated configuration
	 */
	static updateTab(config, tabIndex, updates) {
		if (tabIndex < 0 || tabIndex >= config.tabs.length) {
			throw new Error('Invalid tab index');
		}

		const updatedConfig = { ...config };
		updatedConfig.tabs = [...config.tabs];
		updatedConfig.tabs[tabIndex] = {
			...config.tabs[tabIndex],
			...updates
		};

		return updatedConfig;
	}

	/**
	 * Business logic: Get enabled tabs for preview
	 * @param {Object} config - App configuration
	 * @returns {Array} Array of enabled tabs
	 */
	static getEnabledTabs(config) {
		return config.tabs ? config.tabs.filter(tab => tab.enabled) : [];
	}

	/**
	 * Business logic: Generate configuration summary
	 * @param {Object} config - App configuration
	 * @returns {Object} Configuration summary
	 */
	static getConfigSummary(config) {
		const enabledTabs = MobileAppService.getEnabledTabs(config);
		
		return {
			appName: config.appName || 'Unnamed App',
			tabCount: enabledTabs.length,
			colorScheme: config.colors?.background === '#121212' ? 'Dark' : 'Light',
			hasPromoMessages: !!(config.messages?.promoLine1 && config.messages?.promoLine2),
			isValid: MobileAppService.validateConfig(config).valid
		};
	}
}