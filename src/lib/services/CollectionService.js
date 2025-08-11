/**
 * Collection Service - Stateless business logic for collections management
 * Follows the Services + Runes + Context architecture pattern
 */

export class CollectionService {
	/**
	 * Get all collections with filtering options
	 * @param {Object} params - Query parameters for filtering
	 * @returns {Promise<Array>} Collections array
	 */
	static async getCollections(params = {}) {
		const searchParams = new URLSearchParams();
		
		if (params.limit) searchParams.set('limit', params.limit.toString());
		if (params.status) searchParams.set('status', params.status);
		if (params.search) searchParams.set('q', params.search);
		if (params.sort) searchParams.set('sort', params.sort);
		
		const url = `/api/collections${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
		const response = await fetch(url);
		
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}
		
		return await response.json();
	}

	/**
	 * Get a single collection by ID
	 * @param {string} id - Collection ID
	 * @returns {Promise<Object>} Collection object
	 */
	static async getCollection(id) {
		const response = await fetch(`/api/collections/${id}`);
		
		if (!response.ok) {
			if (response.status === 404) {
				throw new Error('Collection not found');
			}
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}
		
		return await response.json();
	}

	/**
	 * Create a new collection
	 * @param {Object} collectionData - Collection data to create
	 * @param {File[]} images - Optional image files to upload
	 * @returns {Promise<Object>} Created collection
	 */
	static async createCollection(collectionData, images = []) {
		let finalImageUrl = collectionData.image_url;
		
		// Upload image first if provided
		if (images.length > 0) {
			finalImageUrl = await this.uploadImage(images[0]);
		}
		
		const payload = {
			...collectionData,
			image_url: finalImageUrl
		};
		
		const response = await fetch('/api/collections', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});
		
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}
		
		return await response.json();
	}

	/**
	 * Update an existing collection
	 * @param {string} id - Collection ID
	 * @param {Object} updates - Collection updates
	 * @param {File[]} images - Optional new image files
	 * @returns {Promise<Object>} Updated collection
	 */
	static async updateCollection(id, updates, images = []) {
		let finalImageUrl = updates.image_url;
		
		// Upload new image if provided
		if (images.length > 0) {
			finalImageUrl = await this.uploadImage(images[0]);
		}
		
		const payload = {
			...updates,
			image_url: finalImageUrl
		};
		
		const response = await fetch(`/api/collections/${id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});
		
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}
		
		return await response.json();
	}

	/**
	 * Delete a collection
	 * @param {string} id - Collection ID
	 * @returns {Promise<boolean>} Success status
	 */
	static async deleteCollection(id) {
		const response = await fetch(`/api/collections/${id}`, {
			method: 'DELETE'
		});
		
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}
		
		return true;
	}

	/**
	 * Add products to a collection
	 * @param {string} collectionId - Collection ID
	 * @param {string[]} productIds - Array of product IDs to add
	 * @returns {Promise<Object>} Updated collection
	 */
	static async addProductsToCollection(collectionId, productIds) {
		// Get current collection to preserve existing products
		const collection = await this.getCollection(collectionId);
		const currentProductIds = collection.products?.map(p => p.id) || [];
		const newProductIds = [...new Set([...currentProductIds, ...productIds])]; // Deduplicate
		
		return await this.updateCollection(collectionId, {
			name: collection.name,
			description: collection.description,
			image_url: collection.image_url,
			sort_order: collection.sort_order,
			product_ids: newProductIds
		});
	}

	/**
	 * Remove products from a collection
	 * @param {string} collectionId - Collection ID
	 * @param {string[]} productIds - Array of product IDs to remove
	 * @returns {Promise<Object>} Updated collection
	 */
	static async removeProductsFromCollection(collectionId, productIds) {
		// Get current collection
		const collection = await this.getCollection(collectionId);
		const currentProductIds = collection.products?.map(p => p.id) || [];
		const newProductIds = currentProductIds.filter(id => !productIds.includes(id));
		
		return await this.updateCollection(collectionId, {
			name: collection.name,
			description: collection.description,
			image_url: collection.image_url,
			sort_order: collection.sort_order,
			product_ids: newProductIds
		});
	}

	/**
	 * Upload collection image
	 * @param {File} file - Image file to upload
	 * @returns {Promise<string>} Image URL
	 */
	static async uploadImage(file) {
		const formData = new FormData();
		formData.append('file', file);
		
		const response = await fetch('/api/upload', {
			method: 'POST',
			body: formData
		});
		
		if (!response.ok) {
			throw new Error(`Failed to upload image: ${response.statusText}`);
		}
		
		const result = await response.json();
		return result.url;
	}

	/**
	 * Search collections
	 * @param {string} query - Search query
	 * @param {Object} filters - Additional filters
	 * @returns {Promise<Array>} Filtered collections
	 */
	static async searchCollections(query, filters = {}) {
		return await this.getCollections({
			search: query,
			...filters
		});
	}

	/**
	 * Get collections metrics/statistics
	 * @returns {Promise<Object>} Collections metrics
	 */
	static async getCollectionsMetrics() {
		const collections = await this.getCollections();
		
		const metrics = {
			total: collections.length,
			withImages: collections.filter(c => c.image_url).length,
			totalProducts: collections.reduce((sum, c) => sum + (c.product_count || 0), 0),
			averageProducts: collections.length > 0 
				? Math.round(collections.reduce((sum, c) => sum + (c.product_count || 0), 0) / collections.length)
				: 0
		};
		
		return metrics;
	}

	/**
	 * Business logic: Check if collection name is valid
	 * @param {string} name - Collection name to validate
	 * @returns {boolean} Is valid
	 */
	static isValidName(name) {
		return typeof name === 'string' && name.trim().length > 0 && name.trim().length <= 255;
	}

	/**
	 * Business logic: Get collection status info for display
	 * @param {Object} collection - Collection object
	 * @returns {Object} Status information
	 */
	static getStatusInfo(collection) {
		const hasProducts = (collection.products?.length || collection.product_count || 0) > 0;
		const hasImage = Boolean(collection.image_url);
		
		if (hasProducts && hasImage) {
			return {
				label: 'Active',
				color: 'success',
				class: 'status-success'
			};
		} else if (hasProducts) {
			return {
				label: 'Active',
				color: 'warning', 
				class: 'status-warning'
			};
		} else {
			return {
				label: 'Empty',
				color: 'default',
				class: 'status-default'
			};
		}
	}

	/**
	 * Business logic: Format collection for display
	 * @param {Object} collection - Raw collection data
	 * @returns {Object} Formatted collection
	 */
	static formatCollection(collection) {
		const statusInfo = CollectionService.getStatusInfo(collection);
		const productCount = collection.products?.length || collection.product_count || 0;
		
		return {
			...collection,
			formattedProductCount: productCount === 1 ? '1 product' : `${productCount} products`,
			statusInfo,
			hasProducts: productCount > 0,
			hasImage: Boolean(collection.image_url),
			isEmpty: productCount === 0,
			createdDate: collection.created_at ? new Date(collection.created_at).toLocaleDateString() : '',
			updatedDate: collection.updated_at ? new Date(collection.updated_at).toLocaleDateString() : ''
		};
	}
}