/**
 * Collections Global State Management
 * Uses Svelte 5 runes for universal reactivity
 * Follows the Services + Runes + Context architecture pattern
 */

import { CollectionService } from '../services/CollectionService.js';

// IMPORTANT: Use objects for automatic proxy reactivity
export const collectionsState = $state({
	// Collections list state
	collections: [],
	loading: {
		list: false,
		current: false,
		updating: false
	},
	errors: {
		list: '',
		current: '',
		updating: ''
	},
	lastFetch: null,
	
	// Current collection state (for details page)
	currentCollection: null,
	
	// Form state
	form: {
		uploading: false,
		unsavedChanges: false
	},
	
	// Filters and search
	filters: {
		search: '',
		status: 'all',
		sort: 'name',
		limit: 50
	},
	
	// Metrics
	metrics: {
		total: 0,
		withImages: 0,
		totalProducts: 0,
		averageProducts: 0
	}
});

// Actions for state management
export const collectionsActions = {
	/**
	 * Load collections list with optional parameters
	 * @param {Object} params - Query parameters
	 */
	async loadCollections(params = {}) {
		// Prevent concurrent loads
		if (collectionsState.loading.list) {
			console.log('Collections load already in progress, skipping');
			return;
		}
		
		collectionsState.loading.list = true;
		collectionsState.errors.list = '';
		
		try {
			const queryParams = { ...collectionsState.filters, ...params };
			const collections = await CollectionService.getCollections(queryParams);
			
			// Format collections for display
			collectionsState.collections = collections.map(CollectionService.formatCollection);
			collectionsState.lastFetch = new Date();
			
			// Update metrics
			const metrics = await CollectionService.getCollectionsMetrics();
			collectionsState.metrics = metrics;
			
		} catch (error) {
			collectionsState.errors.list = error.message;
			console.error('Failed to load collections:', error);
		} finally {
			collectionsState.loading.list = false;
		}
	},

	/**
	 * Load a single collection by ID
	 * @param {string} id - Collection ID
	 */
	async loadCollection(id) {
		// Prevent concurrent loads for the same collection
		if (collectionsState.loading.current && collectionsState.currentCollection?.id === id) {
			console.log('Collection load already in progress, skipping');
			return;
		}
		
		collectionsState.loading.current = true;
		collectionsState.errors.current = '';
		
		try {
			const collection = await CollectionService.getCollection(id);
			collectionsState.currentCollection = CollectionService.formatCollection(collection);
		} catch (error) {
			collectionsState.errors.current = error.message;
			collectionsState.currentCollection = null;
			console.error('Failed to load collection:', error);
		} finally {
			collectionsState.loading.current = false;
		}
	},

	/**
	 * Create a new collection
	 * @param {Object} collectionData - Collection data
	 * @param {File[]} images - Optional images
	 * @returns {Promise<Object>} Created collection
	 */
	async createCollection(collectionData, images = []) {
		collectionsState.loading.updating = true;
		collectionsState.errors.updating = '';
		
		// Set uploading state if images are provided
		if (images.length > 0) {
			collectionsState.form.uploading = true;
		}
		
		try {
			const newCollection = await CollectionService.createCollection(collectionData, images);
			const formattedCollection = CollectionService.formatCollection(newCollection);
			
			// Add to collections list
			collectionsState.collections.unshift(formattedCollection);
			
			// Update metrics
			collectionsState.metrics.total += 1;
			if (formattedCollection.hasImage) {
				collectionsState.metrics.withImages += 1;
			}
			
			collectionsState.form.unsavedChanges = false;
			return formattedCollection;
			
		} catch (error) {
			collectionsState.errors.updating = error.message;
			throw error;
		} finally {
			collectionsState.loading.updating = false;
			collectionsState.form.uploading = false;
		}
	},

	/**
	 * Update an existing collection
	 * @param {string} id - Collection ID
	 * @param {Object} updates - Updates to apply
	 * @param {File[]} images - Optional new images
	 * @returns {Promise<Object>} Updated collection
	 */
	async updateCollection(id, updates, images = []) {
		collectionsState.loading.updating = true;
		collectionsState.errors.updating = '';
		
		// Set uploading state if images are provided
		if (images.length > 0) {
			collectionsState.form.uploading = true;
		}
		
		try {
			const updatedCollection = await CollectionService.updateCollection(id, updates, images);
			const formattedCollection = CollectionService.formatCollection(updatedCollection);
			
			// Update current collection if it's the one being edited
			if (collectionsState.currentCollection?.id === id) {
				collectionsState.currentCollection = formattedCollection;
			}
			
			// Update in collections list
			const index = collectionsState.collections.findIndex(collection => collection.id === id);
			if (index !== -1) {
				collectionsState.collections[index] = formattedCollection;
			}
			
			collectionsState.form.unsavedChanges = false;
			return formattedCollection;
			
		} catch (error) {
			collectionsState.errors.updating = error.message;
			throw error;
		} finally {
			collectionsState.loading.updating = false;
			collectionsState.form.uploading = false;
		}
	},

	/**
	 * Delete a collection
	 * @param {string} id - Collection ID
	 */
	async deleteCollection(id) {
		collectionsState.loading.updating = true;
		collectionsState.errors.updating = '';
		
		try {
			await CollectionService.deleteCollection(id);
			
			// Remove from collections list
			collectionsState.collections = collectionsState.collections.filter(collection => collection.id !== id);
			
			// Clear current collection if it's the deleted one
			if (collectionsState.currentCollection?.id === id) {
				collectionsState.currentCollection = null;
			}
			
			// Update metrics
			collectionsState.metrics.total = Math.max(0, collectionsState.metrics.total - 1);
			
		} catch (error) {
			collectionsState.errors.updating = error.message;
			throw error;
		} finally {
			collectionsState.loading.updating = false;
		}
	},

	/**
	 * Add products to a collection
	 * @param {string} collectionId - Collection ID
	 * @param {string[]} productIds - Product IDs to add
	 */
	async addProductsToCollection(collectionId, productIds) {
		try {
			const updatedCollection = await CollectionService.addProductsToCollection(collectionId, productIds);
			const formattedCollection = CollectionService.formatCollection(updatedCollection);
			
			// Update current collection
			if (collectionsState.currentCollection?.id === collectionId) {
				collectionsState.currentCollection = formattedCollection;
			}
			
			// Update in list
			const index = collectionsState.collections.findIndex(c => c.id === collectionId);
			if (index !== -1) {
				collectionsState.collections[index] = formattedCollection;
			}
			
			return formattedCollection;
		} catch (error) {
			collectionsState.errors.updating = error.message;
			throw error;
		}
	},

	/**
	 * Remove products from a collection
	 * @param {string} collectionId - Collection ID
	 * @param {string[]} productIds - Product IDs to remove
	 */
	async removeProductsFromCollection(collectionId, productIds) {
		try {
			const updatedCollection = await CollectionService.removeProductsFromCollection(collectionId, productIds);
			const formattedCollection = CollectionService.formatCollection(updatedCollection);
			
			// Update current collection
			if (collectionsState.currentCollection?.id === collectionId) {
				collectionsState.currentCollection = formattedCollection;
			}
			
			// Update in list
			const index = collectionsState.collections.findIndex(c => c.id === collectionId);
			if (index !== -1) {
				collectionsState.collections[index] = formattedCollection;
			}
			
			return formattedCollection;
		} catch (error) {
			collectionsState.errors.updating = error.message;
			throw error;
		}
	},

	/**
	 * Set filter values
	 * @param {string} key - Filter key
	 * @param {any} value - Filter value
	 */
	setFilter(key, value) {
		collectionsState.filters[key] = value;
	},

	/**
	 * Set multiple filters at once
	 * @param {Object} filters - Filters object
	 */
	setFilters(filters) {
		Object.assign(collectionsState.filters, filters);
	},

	/**
	 * Clear current collection
	 */
	clearCurrentCollection() {
		collectionsState.currentCollection = null;
		collectionsState.errors.current = '';
		collectionsState.form.unsavedChanges = false;
	},

	/**
	 * Mark form as having unsaved changes
	 */
	markUnsavedChanges() {
		collectionsState.form.unsavedChanges = true;
	},

	/**
	 * Clear form state
	 */
	clearForm() {
		collectionsState.form.unsavedChanges = false;
		collectionsState.form.uploading = false;
	},

	/**
	 * Retry failed operations
	 */
	async retry() {
		if (collectionsState.errors.list) {
			return await this.loadCollections();
		}
		if (collectionsState.errors.current && collectionsState.currentCollection?.id) {
			return await this.loadCollection(collectionsState.currentCollection.id);
		}
	},

	/**
	 * Search collections
	 * @param {string} query - Search query
	 */
	async searchCollections(query) {
		this.setFilter('search', query);
		await this.loadCollections();
	}
};

// Computed/derived values - Note: These need to be used in components, not exported from modules
export function getFilteredCollections() {
	if (!collectionsState.collections) return [];
	
	const { search, status } = collectionsState.filters;
	
	return collectionsState.collections.filter(collection => {
		const matchesSearch = !search || 
			collection.name.toLowerCase().includes(search.toLowerCase()) ||
			(collection.description && collection.description.toLowerCase().includes(search.toLowerCase()));
			
		const matchesStatus = status === 'all' || 
			(status === 'active' && collection.hasProducts) ||
			(status === 'empty' && !collection.hasProducts);
			
		return matchesSearch && matchesStatus;
	});
}

export function getCollectionMetrics() {
	const collections = getFilteredCollections();
	
	const statusCounts = collections.reduce((acc, collection) => {
		const status = collection.hasProducts ? 'active' : 'empty';
		acc[status] = (acc[status] || 0) + 1;
		return acc;
	}, {});
	
	const totalProducts = collections.reduce((sum, collection) => {
		const productCount = collection.products?.length || collection.product_count || 0;
		return sum + productCount;
	}, 0);
	
	return {
		...collectionsState.metrics,
		filtered: collections.length,
		statusCounts,
		totalProducts: totalProducts
	};
}

export function getCurrentCollectionDisplay() {
	const collection = collectionsState.currentCollection;
	if (!collection) return null;
	
	return {
		...collection,
		isLoading: collectionsState.loading.current,
		hasErrors: Boolean(collectionsState.errors.current),
		isUpdating: collectionsState.loading.updating,
		hasUnsavedChanges: collectionsState.form.unsavedChanges,
		isUploading: collectionsState.form.uploading
	};
}