/**
 * ProductService - Client-side product operations
 * Handles all product-related API calls and data transformations
 * Note: All server-side logic (feature flags, database operations) handled in API endpoints
 */

import { MediaService } from './MediaService.js';

export class ProductService {
  /**
   * Get all products with optional filtering and pagination
   */
  static async getProducts(params = {}) {
    const searchParams = new URLSearchParams();
    
    if (params.status && params.status !== 'all') searchParams.set('status', params.status);
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.offset) searchParams.set('offset', params.offset.toString());
    if (params.search) searchParams.set('q', params.search);
    if (params.collection) searchParams.set('collection', params.collection);
    if (params.tags) searchParams.set('tags', params.tags);
    
    const url = `/api/products${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch products: HTTP ${response.status}`);
    }
    
    return await response.json();
  }

  /**
   * Get a single product by ID
   */
  static async getProduct(id) {
    const response = await fetch(`/api/products/${id}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Product not found');
      }
      throw new Error(`Failed to fetch product: HTTP ${response.status}`);
    }
    
    return await response.json();
  }

  /**
   * Create a new product
   */
  static async createProduct(productData) {
    const response = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Failed to create product: HTTP ${response.status}`);
    }
    
    return await response.json();
  }

  /**
   * Update an existing product
   */
  static async updateProduct(id, updates) {
    const response = await fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Failed to update product: HTTP ${response.status}`);
    }
    
    return await response.json();
  }

  /**
   * Delete a product
   */
  static async deleteProduct(id) {
    const response = await fetch(`/api/products/${id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Failed to delete product: HTTP ${response.status}`);
    }
    
    return await response.json();
  }

  /**
   * Bulk delete products
   */
  static async bulkDeleteProducts(productIds) {
    const response = await fetch('/api/products/bulk', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_ids: productIds })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Failed to bulk delete products: HTTP ${response.status}`);
    }
    
    return await response.json();
  }

  /**
   * Upload product images
   */
  static async uploadImages(images) {
    if (!images || images.length === 0) return [];
    
    const imageUrls = [];
    
    for (const image of images) {
      try {
        const url = await MediaService.uploadImage(image);
        imageUrls.push(url);
      } catch (error) {
        console.error('Failed to upload image:', error);
        throw new Error(`Failed to upload image: ${error.message}`);
      }
    }
    
    return imageUrls;
  }

  /**
   * Get product collections
   */
  static async getCollections() {
    const response = await fetch('/api/collections');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch collections: HTTP ${response.status}`);
    }
    
    return await response.json();
  }

  /**
   * Export products to CSV/Excel
   */
  static async exportProducts(params = {}) {
    const searchParams = new URLSearchParams();
    
    if (params.format) searchParams.set('format', params.format);
    if (params.status) searchParams.set('status', params.status);
    if (params.collection) searchParams.set('collection', params.collection);
    
    const url = `/api/products/export${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to export products: HTTP ${response.status}`);
    }
    
    const blob = await response.blob();
    const filename = response.headers.get('content-disposition')?.split('filename=')[1] || 'products.csv';
    
    return { blob, filename };
  }

  // Client-side helper methods for data transformation and validation

  /**
   * Format product data for display
   */
  static formatProduct(product) {
    if (!product) return null;
    
    return {
      ...product,
      formattedPrice: this.formatCurrency(product.price || 0),
      formattedImages: this.formatImages(product.images),
      statusLabel: this.getStatusLabel(product.status),
      tagsArray: this.parseTags(product.tags),
      hasInventory: product.inventory && product.inventory.length > 0,
      totalQuantity: this.calculateTotalQuantity(product.inventory)
    };
  }

  /**
   * Calculate metrics from products array
   */
  static calculateMetrics(products) {
    if (!Array.isArray(products)) return { total: 0, active: 0, draft: 0, archived: 0, totalValue: 0 };
    
    const metrics = {
      total: products.length,
      active: 0,
      draft: 0,
      archived: 0,
      totalValue: 0
    };
    
    products.forEach(product => {
      switch (product.status) {
        case 'active':
          metrics.active++;
          break;
        case 'draft':
          metrics.draft++;
          break;
        case 'archived':
          metrics.archived++;
          break;
      }
      
      // Calculate total value using price and inventory quantity
      const quantity = this.calculateTotalQuantity(product.inventory);
      metrics.totalValue += (product.price || 0) * quantity;
    });
    
    return metrics;
  }

  /**
   * Validate product data before submission
   */
  static validateProduct(productData) {
    const errors = [];
    
    if (!productData.title?.trim()) {
      errors.push('Product title is required');
    }
    
    if (!productData.price || productData.price < 0) {
      errors.push('Valid price is required');
    }
    
    if (!productData.status) {
      errors.push('Product status is required');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Prepare product data for API submission
   */
  static prepareProductData(formData, imageUrls = []) {
    const productData = {
      title: formData.title?.trim(),
      description: formData.description?.trim(),
      price: parseFloat(formData.price) || 0,
      status: formData.status || 'draft',
      tags: formData.tags?.trim() ? formData.tags.trim().split(',').map(tag => tag.trim()).filter(tag => tag) : [],
      vendor: formData.vendor?.trim(),
      product_type: formData.product_type?.trim(),
      images: imageUrls,
      collections: formData.collections || [] // Add collections support
    };
    
    // Remove empty values
    Object.keys(productData).forEach(key => {
      if (productData[key] === '' || productData[key] === null || productData[key] === undefined) {
        delete productData[key];
      }
    });
    
    return productData;
  }

  // Helper methods for data formatting

  static formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency 
    }).format(amount || 0);
  }

  static formatImages(images) {
    if (!images) return [];
    
    try {
      if (typeof images === 'string') {
        return JSON.parse(images);
      }
      return Array.isArray(images) ? images : [];
    } catch {
      return [];
    }
  }

  static getStatusLabel(status) {
    const labels = {
      'active': 'Active',
      'draft': 'Draft',
      'archived': 'Archived'
    };
    return labels[status] || 'Unknown';
  }

  static parseTags(tags) {
    if (!tags) return [];
    if (Array.isArray(tags)) return tags;
    return tags.split(',').map(tag => tag.trim()).filter(tag => tag);
  }

  static calculateTotalQuantity(inventory) {
    if (!inventory || !Array.isArray(inventory)) return 0;
    return inventory.reduce((total, item) => total + (item.quantity || 0), 0);
  }
}