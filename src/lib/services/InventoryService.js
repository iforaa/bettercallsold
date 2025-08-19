/**
 * Inventory Service - Stateless business logic for inventory management
 * Follows the Services + Runes + Context architecture pattern
 * Note: Feature flags are handled server-side in API endpoints
 */

export class InventoryService {
	/**
	 * Get all inventory items with filtering options
	 * @param {Object} params - Query parameters for filtering
	 * @returns {Promise<Array>} Inventory items array
	 */
	static async getInventoryItems(params = {}) {
		const searchParams = new URLSearchParams();
		
		if (params.limit) searchParams.set('limit', params.limit.toString());
		if (params.offset) searchParams.set('offset', params.offset.toString());
		if (params.search) searchParams.set('search', params.search);
		if (params.location) searchParams.set('location', params.location);
		if (params.stockStatus) searchParams.set('stockStatus', params.stockStatus);
		
		const url = `/api/inventory/details${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
		const response = await fetch(url);
		
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}
		
		return await response.json();
	}

	/**
	 * Update inventory quantity for a single item
	 * @param {string} id - Inventory item ID
	 * @param {number} quantity - New quantity
	 * @param {string} reason - Reason for adjustment
	 * @returns {Promise<Object>} Updated inventory item
	 */
	static async updateInventoryQuantity(id, quantity, reason = 'Manual adjustment') {
		const response = await fetch('/api/inventory/details', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id, quantity, reason })
		});
		
		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
		}
		
		return await response.json();
	}

	/**
	 * Bulk update inventory quantities
	 * @param {Array} updates - Array of {id, quantity, reason} objects
	 * @returns {Promise<Object>} Bulk update results
	 */
	static async bulkUpdateQuantities(updates) {
		const response = await fetch('/api/inventory/bulk', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ updates })
		});
		
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}
		
		return await response.json();
	}

	/**
	 * Get inventory metrics and analytics
	 * @param {number} lowStockThreshold - Threshold for low stock items
	 * @returns {Promise<Object>} Inventory metrics
	 */
	static async getInventoryMetrics(lowStockThreshold = 5) {
		try {
			// Get inventory value
			const valueResponse = await fetch('/api/inventory?action=value');
			const valueData = valueResponse.ok ? await valueResponse.json() : { total_cost_value: 0, total_retail_value: 0, total_quantity: 0 };

			// Get low stock items
			const lowStockResponse = await fetch(`/api/inventory?action=low_stock&threshold=${lowStockThreshold}`);
			const lowStockItems = lowStockResponse.ok ? await lowStockResponse.json() : [];

			return {
				totalItems: parseInt(valueData.total_quantity) || 0,
				totalCostValue: parseFloat(valueData.total_cost_value) || 0,
				totalRetailValue: parseFloat(valueData.total_retail_value) || 0,
				lowStockCount: lowStockItems.length,
				lowStockItems: lowStockItems
			};
		} catch (error) {
			console.error('Error fetching inventory metrics:', error);
			return {
				totalItems: 0,
				totalCostValue: 0,
				totalRetailValue: 0,
				lowStockCount: 0,
				lowStockItems: []
			};
		}
	}

	/**
	 * Search inventory items
	 * @param {string} query - Search query
	 * @param {Object} filters - Additional filters
	 * @returns {Promise<Array>} Filtered inventory items
	 */
	static async searchInventory(query, filters = {}) {
		return await this.getInventoryItems({
			search: query,
			...filters
		});
	}

	/**
	 * Business logic: Format inventory item for display
	 * @param {Object} item - Raw inventory item data
	 * @returns {Object} Formatted inventory item
	 */
	static formatInventoryItem(item) {
		const quantity = item.quantity || 0;
		const stockStatus = InventoryService.getStockStatus(item);
		
		return {
			...item,
			formattedTitle: InventoryService.formatProductTitle(item),
			formattedVariantCombination: InventoryService.formatVariantCombination(item),
			formattedSKU: InventoryService.formatSKU(item),
			formattedLocation: InventoryService.formatLocation(item),
			availableCount: InventoryService.getAvailableCount(item),
			onHandCount: InventoryService.getOnHandCount(item),
			unavailableCount: InventoryService.getUnavailableCount(item),
			committedCount: InventoryService.getCommittedCount(item),
			stockStatus,
			isLowStock: InventoryService.isLowStock(item),
			isOutOfStock: quantity === 0,
			hasVariants: InventoryService.hasVariants(item),
			formattedPrice: InventoryService.formatCurrency(item.price || item.base_price || 0),
			formattedCost: item.cost ? InventoryService.formatCurrency(item.cost) : null,
			totalValue: quantity * (item.cost || item.price || item.base_price || 0),
			formattedTotalValue: InventoryService.formatCurrency(quantity * (item.cost || item.price || item.base_price || 0))
		};
	}

	/**
	 * Business logic: Format product title with variants
	 * @param {Object} item - Inventory item
	 * @returns {string} Formatted title
	 */
	static formatProductTitle(item) {
		// Just return the product name - variant info will be shown separately
		return item.product_name || item.title || 'Unknown Product';
	}
	
	/**
	 * Business logic: Format variant combination for display (Shopify-style)
	 * @param {Object} item - Inventory item
	 * @returns {string} Formatted variant combination
	 */
	static formatVariantCombination(item) {
		const variants = [];
		
		// Handle Shopify option1, option2, option3 format (new format)
		if (item.option1 && typeof item.option1 === 'string' && item.option1.trim()) {
			variants.push(item.option1.trim());
		}
		if (item.option2 && typeof item.option2 === 'string' && item.option2.trim()) {
			variants.push(item.option2.trim());
		}
		if (item.option3 && typeof item.option3 === 'string' && item.option3.trim()) {
			variants.push(item.option3.trim());
		}
		
		// If we found options, return them
		if (variants.length > 0) {
			return variants.join(' / ');
		}
		
		// Fallback to old size/color format
		let legacyVariants = [];
		
		// Safely extract color - handle different data structures
		let color = '';
		if (item.color) {
			if (typeof item.color === 'string') {
				color = item.color;
			} else if (item.color.Valid && item.color.String) {
				color = item.color.String;
			}
		} else if (item.variant_color && typeof item.variant_color === 'string') {
			color = item.variant_color;
		}
		
		// Safely extract size - handle different data structures  
		let size = '';
		if (item.size) {
			if (typeof item.size === 'string') {
				size = item.size;
			} else if (item.size.Valid && item.size.String) {
				size = item.size.String;
			}
		} else if (item.variant_size && typeof item.variant_size === 'string') {
			size = item.variant_size;
		}
		
		// Add to variants if they exist and are not empty
		if (color && color.trim && color.trim()) {
			legacyVariants.push(color.trim());
		}
		if (size && size.trim && size.trim()) {
			legacyVariants.push(size.trim());
		}
		
		if (legacyVariants.length > 0) {
			return legacyVariants.join(' / ');
		}
		
		// Check variant title
		const variantTitle = item.variant_title || item.title;
		if (variantTitle && typeof variantTitle === 'string' && variantTitle.trim() && variantTitle !== 'Default Title' && variantTitle.trim() !== '') {
			return variantTitle.trim();
		}
		
		// Fallback: create a meaningful identifier from available data
		// This helps distinguish variants when no proper option data exists
		const identifiers = [];
		
		// Add SKU if it exists
		if (item.sku?.Valid && item.sku.String && item.sku.String.trim()) {
			identifiers.push(`SKU: ${item.sku.String.trim()}`);
		}
		
		// Add position if it's meaningful (not 1 or if there are multiple variants)
		if (item.position && item.position > 1) {
			identifiers.push(`Variant ${item.position}`);
		}
		
		// If we have at least one identifier, return it
		if (identifiers.length > 0) {
			return identifiers.join(' • ');
		}
		
		// Return empty string when there's truly no distinguishing information
		return '';
	}

	/**
	 * Business logic: Format SKU for display
	 * @param {Object} item - Inventory item
	 * @returns {string} Formatted SKU
	 */
	static formatSKU(item) {
		return item.sku?.Valid ? item.sku.String : '-';
	}

	/**
	 * Business logic: Format location for display
	 * @param {Object} item - Inventory item
	 * @returns {string} Formatted location
	 */
	static formatLocation(item) {
		return item.location?.Valid ? item.location.String : 'Default Location';
	}

	/**
	 * Business logic: Get available count
	 * @param {Object} item - Inventory item
	 * @returns {number} Available count
	 */
	static getAvailableCount(item) {
		return item.available || item.quantity || 0;
	}

	/**
	 * Business logic: Get on hand count
	 * @param {Object} item - Inventory item
	 * @returns {number} On hand count
	 */
	static getOnHandCount(item) {
		return item.on_hand || item.quantity || 0;
	}

	/**
	 * Business logic: Get unavailable count
	 * @param {Object} item - Inventory item
	 * @returns {number} Unavailable count
	 */
	static getUnavailableCount(item) {
		return item.unavailable || 0;
	}

	/**
	 * Business logic: Get committed count
	 * @param {Object} item - Inventory item
	 * @returns {number} Committed count
	 */
	static getCommittedCount(item) {
		return item.committed || 0;
	}

	/**
	 * Business logic: Check if item has variants
	 * @param {Object} item - Inventory item
	 * @returns {boolean} Has variants
	 */
	static hasVariants(item) {
		return (item.color?.Valid && item.color.String) || (item.size?.Valid && item.size.String);
	}

	/**
	 * Business logic: Get stock status
	 * @param {Object} item - Inventory item
	 * @param {number} lowStockThreshold - Low stock threshold
	 * @returns {Object} Stock status info
	 */
	static getStockStatus(item, lowStockThreshold = 5) {
		const quantity = item.quantity || 0;
		
		if (quantity === 0) {
			return {
				status: 'out_of_stock',
				label: 'Out of stock',
				color: 'error',
				class: 'status-error'
			};
		} else if (quantity <= lowStockThreshold) {
			return {
				status: 'low_stock',
				label: 'Low stock',
				color: 'warning',
				class: 'status-warning'
			};
		} else {
			return {
				status: 'in_stock',
				label: 'In stock',
				color: 'success',
				class: 'status-success'
			};
		}
	}

	/**
	 * Business logic: Check if item is low stock
	 * @param {Object} item - Inventory item
	 * @param {number} threshold - Low stock threshold
	 * @returns {boolean} Is low stock
	 */
	static isLowStock(item, threshold = 5) {
		const quantity = item.quantity || 0;
		return quantity > 0 && quantity <= threshold;
	}

	/**
	 * Business logic: Format currency
	 * @param {number} amount - Amount to format
	 * @param {string} currency - Currency code
	 * @returns {string} Formatted currency
	 */
	static formatCurrency(amount, currency = 'USD') {
		return new Intl.NumberFormat('en-US', { 
			style: 'currency', 
			currency 
		}).format(amount || 0);
	}

	/**
	 * Business logic: Calculate total inventory value
	 * @param {Array} items - Inventory items
	 * @param {string} valueType - 'cost' or 'retail'
	 * @returns {number} Total value
	 */
	static calculateTotalValue(items, valueType = 'cost') {
		return items.reduce((total, item) => {
			const quantity = item.quantity || 0;
			const price = valueType === 'cost' 
				? (item.cost || item.price || item.base_price || 0)
				: (item.price || item.base_price || 0);
			return total + (quantity * price);
		}, 0);
	}

	/**
	 * Business logic: Filter items by stock status
	 * @param {Array} items - Inventory items
	 * @param {string} status - Stock status to filter by
	 * @returns {Array} Filtered items
	 */
	static filterByStockStatus(items, status) {
		return items.filter(item => {
			const stockStatus = this.getStockStatus(item);
			return stockStatus.status === status;
		});
	}

	/**
	 * Business logic: Get low stock items
	 * @param {Array} items - Inventory items
	 * @param {number} threshold - Low stock threshold
	 * @returns {Array} Low stock items
	 */
	static getLowStockItems(items, threshold = 5) {
		return items.filter(item => this.isLowStock(item, threshold));
	}

	/**
	 * Business logic: Validate quantity adjustment
	 * @param {number} newQuantity - New quantity value
	 * @param {number} currentQuantity - Current quantity value
	 * @returns {Object} Validation result
	 */
	static validateQuantityAdjustment(newQuantity, currentQuantity) {
		if (newQuantity < 0) {
			return {
				valid: false,
				error: 'Quantity cannot be negative'
			};
		}

		if (!Number.isInteger(newQuantity)) {
			return {
				valid: false,
				error: 'Quantity must be a whole number'
			};
		}

		return { valid: true };
	}

	/**
	 * Business logic: Calculate adjustment difference
	 * @param {number} newQuantity - New quantity
	 * @param {number} currentQuantity - Current quantity
	 * @returns {Object} Adjustment info
	 */
	static calculateAdjustment(newQuantity, currentQuantity) {
		const difference = newQuantity - currentQuantity;
		
		return {
			difference,
			isIncrease: difference > 0,
			isDecrease: difference < 0,
			percentageChange: currentQuantity > 0 ? (difference / currentQuantity) * 100 : 0,
			formattedDifference: difference > 0 ? `+${difference}` : difference.toString()
		};
	}
}