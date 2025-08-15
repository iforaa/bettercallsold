/**
 * Inventory Global State Management
 * Uses Svelte 5 runes for universal reactivity
 * Follows the Services + Runes + Context architecture pattern
 */

import { InventoryService } from '../services/InventoryService.js';

// IMPORTANT: Use objects for automatic proxy reactivity
export const inventoryState = $state({
	// Inventory items list state
	items: [],
	loading: {
		list: false,
		updating: false,
		bulkUpdate: false
	},
	errors: {
		list: '',
		updating: '',
		bulkUpdate: ''
	},
	lastFetch: null,
	
	// Filters and search
	filters: {
		search: '',
		location: 'all',
		stockStatus: 'all', // 'all', 'in_stock', 'low_stock', 'out_of_stock'
		limit: 50,
		offset: 0
	},
	
	// Pagination metadata from API
	pagination: null,
	
	// Metrics and analytics
	metrics: {
		totalItems: 0,
		totalCostValue: 0,
		totalRetailValue: 0,
		lowStockCount: 0,
		lowStockItems: []
	},
	
	// Selection state for bulk operations
	selection: {
		selectedItems: [],
		selectAll: false
	},
	
	// Modal and form state
	modal: {
		showAdjustModal: false,
		adjustingItem: null,
		adjustBy: 0,
		newQuantity: 0,
		adjustReason: 'Correction (default)'
	}
});

// Actions for state management
export const inventoryActions = {
	/**
	 * Load inventory items with optional parameters
	 * @param {Object} params - Query parameters
	 */
	async loadInventory(params = {}) {
		// Prevent concurrent loads
		if (inventoryState.loading.list) {
			console.log('Inventory load already in progress, skipping');
			return;
		}
		
		inventoryState.loading.list = true;
		inventoryState.errors.list = '';
		
		try {
			const queryParams = { ...inventoryState.filters, ...params };
			const response = await InventoryService.getInventoryItems(queryParams);
			
			// Handle both old and new response formats
			let items;
			if (response.items) {
				// New paginated response format
				items = response.items;
				inventoryState.pagination = response.pagination;
			} else {
				// Old array response format (fallback)
				items = response;
				inventoryState.pagination = null;
			}
			
			// Format items for display
			inventoryState.items = items.map(InventoryService.formatInventoryItem);
			inventoryState.lastFetch = new Date();
			
			// Load metrics in parallel
			this.loadMetrics();
			
		} catch (error) {
			inventoryState.errors.list = error.message;
			console.error('Failed to load inventory:', error);
		} finally {
			inventoryState.loading.list = false;
		}
	},

	/**
	 * Load inventory metrics and analytics
	 */
	async loadMetrics() {
		try {
			const metrics = await InventoryService.getInventoryMetrics(5); // 5 as low stock threshold
			inventoryState.metrics = metrics;
		} catch (error) {
			console.error('Failed to load inventory metrics:', error);
			// Don't set error state for metrics as it's not critical
		}
	},

	/**
	 * Update inventory quantity for a single item
	 * @param {string} id - Inventory item ID
	 * @param {number} quantity - New quantity
	 * @param {string} reason - Reason for adjustment
	 */
	async updateQuantity(id, quantity, reason = 'Manual adjustment') {
		inventoryState.loading.updating = true;
		inventoryState.errors.updating = '';
		
		try {
			const validation = InventoryService.validateQuantityAdjustment(quantity, 0);
			if (!validation.valid) {
				throw new Error(validation.error);
			}

			const result = await InventoryService.updateInventoryQuantity(id, quantity, reason);
			
			// Update the item in local state
			const itemIndex = inventoryState.items.findIndex(item => item.id === id);
			if (itemIndex !== -1) {
				const currentItem = inventoryState.items[itemIndex];
				const updatedItem = InventoryService.formatInventoryItem({
					...currentItem,
					quantity: quantity,
					available: quantity,
					on_hand: quantity,
					updated_at: result.item?.updated_at || new Date().toISOString()
				});
				inventoryState.items[itemIndex] = updatedItem;
			}
			
			// Refresh metrics after update
			this.loadMetrics();
			
			return result;
			
		} catch (error) {
			inventoryState.errors.updating = error.message;
			throw error;
		} finally {
			inventoryState.loading.updating = false;
		}
	},

	/**
	 * Bulk update inventory quantities
	 * @param {Array} updates - Array of update objects
	 */
	async bulkUpdateQuantities(updates) {
		inventoryState.loading.bulkUpdate = true;
		inventoryState.errors.bulkUpdate = '';
		
		try {
			// Validate all updates first
			for (const update of updates) {
				const validation = InventoryService.validateQuantityAdjustment(update.quantity, 0);
				if (!validation.valid) {
					throw new Error(`Invalid quantity for item ${update.id}: ${validation.error}`);
				}
			}

			const result = await InventoryService.bulkUpdateQuantities(updates);
			
			// Update local state for successful updates
			if (result.successful) {
				result.successful.forEach(updatedItem => {
					const itemIndex = inventoryState.items.findIndex(item => item.id === updatedItem.id);
					if (itemIndex !== -1) {
						const currentItem = inventoryState.items[itemIndex];
						const formattedItem = InventoryService.formatInventoryItem({
							...currentItem,
							...updatedItem
						});
						inventoryState.items[itemIndex] = formattedItem;
					}
				});
			}
			
			// Clear selection after bulk update
			this.clearSelection();
			
			// Refresh metrics
			this.loadMetrics();
			
			return result;
			
		} catch (error) {
			inventoryState.errors.bulkUpdate = error.message;
			throw error;
		} finally {
			inventoryState.loading.bulkUpdate = false;
		}
	},

	/**
	 * Set filter values
	 * @param {string} key - Filter key
	 * @param {any} value - Filter value
	 * @param {boolean} reload - Whether to reload inventory immediately
	 */
	setFilter(key, value, reload = true) {
		inventoryState.filters[key] = value;
		// Reset pagination when filters change (except when setting offset/limit directly)
		if (key !== 'limit' && key !== 'offset') {
			inventoryState.filters.offset = 0;
		}
		// Reload inventory with new filters only if requested
		if (reload) {
			this.loadInventory();
		}
	},

	/**
	 * Set multiple filters at once without triggering multiple reloads
	 * @param {Object} filters - Filters object
	 */
	setFilters(filters, reload = true) {
		Object.assign(inventoryState.filters, filters);
		inventoryState.filters.offset = 0; // Reset pagination
		if (reload) {
			this.loadInventory();
		}
	},

	/**
	 * Search inventory items
	 * @param {string} query - Search query
	 */
	async searchInventory(query) {
		this.setFilter('search', query);
		await this.loadInventory();
	},

	/**
	 * Toggle item selection
	 * @param {string} itemId - Item ID to toggle
	 */
	toggleItemSelection(itemId) {
		const { selectedItems } = inventoryState.selection;
		const isSelected = selectedItems.includes(itemId);
		
		if (isSelected) {
			inventoryState.selection.selectedItems = selectedItems.filter(id => id !== itemId);
		} else {
			inventoryState.selection.selectedItems = [...selectedItems, itemId];
		}
		
		// Update selectAll state
		inventoryState.selection.selectAll = 
			inventoryState.selection.selectedItems.length === inventoryState.items.length;
	},

	/**
	 * Toggle select all items
	 */
	toggleSelectAll() {
		if (inventoryState.selection.selectAll) {
			inventoryState.selection.selectedItems = inventoryState.items.map(item => item.id);
		} else {
			inventoryState.selection.selectedItems = [];
		}
	},

	/**
	 * Clear selection
	 */
	clearSelection() {
		inventoryState.selection.selectedItems = [];
		inventoryState.selection.selectAll = false;
	},

	/**
	 * Open quantity adjustment modal
	 * @param {Object} item - Inventory item to adjust
	 * @param {string} field - Field being adjusted ('available' or 'on_hand')
	 */
	openAdjustModal(item, field = 'available') {
		const currentValue = field === 'available' ? item.availableCount : item.onHandCount;
		
		inventoryState.modal = {
			showAdjustModal: true,
			adjustingItem: { ...item, field },
			adjustBy: 0,
			newQuantity: currentValue,
			adjustReason: 'Correction (default)'
		};
	},

	/**
	 * Close adjustment modal
	 */
	closeAdjustModal() {
		inventoryState.modal = {
			showAdjustModal: false,
			adjustingItem: null,
			adjustBy: 0,
			newQuantity: 0,
			adjustReason: 'Correction (default)'
		};
	},

	/**
	 * Update adjust by value and recalculate new quantity
	 * @param {number} adjustBy - Amount to adjust by
	 */
	updateAdjustBy(adjustBy) {
		inventoryState.modal.adjustBy = adjustBy;
		
		if (inventoryState.modal.adjustingItem) {
			const currentValue = inventoryState.modal.adjustingItem.field === 'available' 
				? inventoryState.modal.adjustingItem.availableCount 
				: inventoryState.modal.adjustingItem.onHandCount;
			inventoryState.modal.newQuantity = currentValue + adjustBy;
		}
	},

	/**
	 * Update new quantity value and recalculate adjust by
	 * @param {number} newQuantity - New quantity value
	 */
	updateNewQuantity(newQuantity) {
		inventoryState.modal.newQuantity = newQuantity;
		
		if (inventoryState.modal.adjustingItem) {
			const currentValue = inventoryState.modal.adjustingItem.field === 'available' 
				? inventoryState.modal.adjustingItem.availableCount 
				: inventoryState.modal.adjustingItem.onHandCount;
			inventoryState.modal.adjustBy = newQuantity - currentValue;
		}
	},

	/**
	 * Save quantity adjustment
	 */
	async saveAdjustment() {
		const { adjustingItem, newQuantity, adjustReason } = inventoryState.modal;
		if (!adjustingItem) return;
		
		try {
			await this.updateQuantity(adjustingItem.id, newQuantity, adjustReason);
			this.closeAdjustModal();
			return true;
		} catch (error) {
			// Error is already handled in updateQuantity
			throw error;
		}
	},

	/**
	 * Retry failed operations
	 */
	async retry() {
		if (inventoryState.errors.list) {
			return await this.loadInventory();
		}
		if (inventoryState.errors.updating) {
			// Clear error to allow retry
			inventoryState.errors.updating = '';
		}
		if (inventoryState.errors.bulkUpdate) {
			// Clear error to allow retry
			inventoryState.errors.bulkUpdate = '';
		}
	},

	/**
	 * Go to next page
	 */
	nextPage() {
		const newOffset = inventoryState.filters.offset + inventoryState.filters.limit;
		this.setFilter('offset', newOffset);
	},

	/**
	 * Go to previous page
	 */
	prevPage() {
		const newOffset = Math.max(0, inventoryState.filters.offset - inventoryState.filters.limit);
		this.setFilter('offset', newOffset);
	},

	/**
	 * Go to specific page
	 * @param {number} page - Page number (1-based)
	 */
	goToPage(page) {
		const newOffset = (page - 1) * inventoryState.filters.limit;
		this.setFilter('offset', newOffset);
	},

	/**
	 * Set page size
	 * @param {number} size - New page size
	 */
	setPageSize(size) {
		this.setFilter('limit', size);
		this.setFilter('offset', 0); // Reset to first page
	},

	/**
	 * Reset all state to initial values
	 */
	reset() {
		inventoryState.items = [];
		inventoryState.loading = { list: false, updating: false, bulkUpdate: false };
		inventoryState.errors = { list: '', updating: '', bulkUpdate: '' };
		inventoryState.lastFetch = null;
		inventoryState.filters = {
			search: '',
			location: 'all',
			stockStatus: 'all',
			limit: 50,
			offset: 0
		};
		inventoryState.pagination = null;
		inventoryState.metrics = {
			totalItems: 0,
			totalCostValue: 0,
			totalRetailValue: 0,
			lowStockCount: 0,
			lowStockItems: []
		};
		this.clearSelection();
		this.closeAdjustModal();
	}
};

// Computed/derived values - Note: These need to be used in components, not exported from modules
export function getFilteredInventory() {
	if (!inventoryState.items) return [];
	
	const { search, location, stockStatus } = inventoryState.filters;
	
	return inventoryState.items.filter(item => {
		const matchesSearch = !search || 
			item.formattedTitle.toLowerCase().includes(search.toLowerCase()) ||
			item.formattedSKU.toLowerCase().includes(search.toLowerCase());
			
		const matchesLocation = location === 'all' || 
			item.formattedLocation.toLowerCase().includes(location.toLowerCase());
			
		const matchesStockStatus = stockStatus === 'all' || 
			item.stockStatus.status === stockStatus;
			
		return matchesSearch && matchesLocation && matchesStockStatus;
	});
}

export function getInventoryMetrics() {
	const filteredItems = getFilteredInventory();
	
	const metrics = {
		...inventoryState.metrics,
		filteredCount: filteredItems.length,
		selectedCount: inventoryState.selection.selectedItems.length,
		hasSelection: inventoryState.selection.selectedItems.length > 0,
		hasFiltersApplied: inventoryState.filters.search || 
						   inventoryState.filters.location !== 'all' || 
						   inventoryState.filters.stockStatus !== 'all'
	};
	
	// Calculate filtered metrics
	if (filteredItems.length > 0) {
		metrics.filteredTotalValue = InventoryService.calculateTotalValue(filteredItems, 'cost');
		metrics.filteredRetailValue = InventoryService.calculateTotalValue(filteredItems, 'retail');
		metrics.filteredLowStockCount = InventoryService.getLowStockItems(filteredItems, 5).length;
		metrics.filteredOutOfStockCount = InventoryService.filterByStockStatus(filteredItems, 'out_of_stock').length;
	}
	
	return metrics;
}

export function getSelectedItems() {
	return inventoryState.items.filter(item => 
		inventoryState.selection.selectedItems.includes(item.id)
	);
}

export function getAdjustmentModalData() {
	return {
		...inventoryState.modal,
		isLoading: inventoryState.loading.updating,
		hasErrors: Boolean(inventoryState.errors.updating),
		errorMessage: inventoryState.errors.updating
	};
}

export function getPaginationInfo() {
	const { limit, offset } = inventoryState.filters;
	const currentPage = Math.floor(offset / limit) + 1;
	
	// Use API pagination metadata if available, otherwise fall back to client-side logic
	if (inventoryState.pagination) {
		const startItem = inventoryState.pagination.total === 0 ? 0 : offset + 1;
		const endItem = Math.min(offset + limit, inventoryState.pagination.total);
		
		return {
			currentPage: inventoryState.pagination.page,
			startItem,
			endItem,
			total: inventoryState.pagination.total,
			hasNext: inventoryState.pagination.hasNext,
			hasPrev: inventoryState.pagination.hasPrev,
			limit
		};
	}
	
	// Fallback for backward compatibility
	const startItem = offset + 1;
	const endItem = Math.min(offset + limit, offset + inventoryState.items.length);
	const hasNext = inventoryState.items.length === limit; // Assume there's more if we got a full page
	const hasPrev = offset > 0;
	
	return {
		currentPage,
		startItem,
		endItem,
		total: inventoryState.items.length,
		hasNext,
		hasPrev,
		limit
	};
}