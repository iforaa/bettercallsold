/**
 * ProductService - Stateless business logic for product operations
 * Handles all product-related API calls and data transformations
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
   * Get single product by ID
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
   * Create new product
   */
  static async createProduct(productData) {
    const response = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create product: HTTP ${response.status}`);
    }
    
    return await response.json();
  }

  /**
   * Update existing product
   */
  static async updateProduct(id, updates) {
    const response = await fetch(`/api/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update product: HTTP ${response.status}`);
    }
    
    return await response.json();
  }

  /**
   * Delete product
   */
  static async deleteProduct(id) {
    const response = await fetch(`/api/products/${id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete product: HTTP ${response.status}`);
    }
    
    return true;
  }

  /**
   * Bulk delete multiple products
   */
  static async bulkDeleteProducts(productIds) {
    const results = {
      successful: [],
      failed: []
    };
    
    // Delete products one by one to handle individual failures
    for (const productId of productIds) {
      try {
        await this.deleteProduct(productId);
        results.successful.push(productId);
      } catch (error) {
        results.failed.push({ id: productId, error: error.message });
      }
    }
    
    return results;
  }

  /**
   * Export products to CSV/Excel
   */
  static async exportProducts(exportParams) {
    const response = await fetch('/api/products/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(exportParams)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to export products: HTTP ${response.status}`);
    }
    
    // Return blob for download
    const blob = await response.blob();
    const filename = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'products-export.csv';
    
    return { blob, filename };
  }


  /**
   * Get collections for product organization
   */
  static async getCollections() {
    const response = await fetch('/api/collections');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch collections: HTTP ${response.status}`);
    }
    
    return await response.json();
  }

  // =====================================
  // Business Logic Methods
  // =====================================

  /**
   * Format product data for display
   */
  static formatProduct(product) {
    return {
      ...product,
      formattedPrice: this.formatPrice(product.price),
      formattedComparePrice: product.compare_price ? this.formatPrice(product.compare_price) : null,
      statusInfo: this.getStatusInfo(product.status),
      inventoryStatus: this.getInventoryStatus(product.total_inventory || 0),
      firstImage: this.getFirstImage(product.images),
      totalVariants: product.variant_count || 0,
      isActive: product.status === 'active',
      isDraft: product.status === 'draft',
      isArchived: product.status === 'archived'
    };
  }

  /**
   * Get product status information
   */
  static getStatusInfo(status) {
    const statusMap = {
      'active': { label: 'Active', color: 'success', class: 'status-active' },
      'draft': { label: 'Draft', color: 'default', class: 'status-draft' },
      'archived': { label: 'Archived', color: 'default', class: 'status-archived' }
    };
    
    return statusMap[status] || { label: 'Unknown', color: 'default', class: 'status-unknown' };
  }

  /**
   * Get inventory status information
   */
  static getInventoryStatus(count) {
    if (count === 0) {
      return { label: 'Out of Stock', class: 'out-of-stock', variant: 'error' };
    }
    if (count < 10) {
      return { label: 'Low Stock', class: 'low-stock', variant: 'warning' };
    }
    return { label: 'In Stock', class: 'in-stock', variant: 'success' };
  }

  /**
   * Format price for display
   */
  static formatPrice(price) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  }

  /**
   * Get first image from product images
   */
  static getFirstImage(images) {
    try {
      if (!images) return null;
      
      let imageArray = images;
      if (typeof images === 'string') {
        imageArray = JSON.parse(images);
      }
      
      if (Array.isArray(imageArray) && imageArray.length > 0) {
        const firstImage = imageArray[0];
        if (typeof firstImage === 'string') {
          return firstImage;
        } else if (firstImage && typeof firstImage === 'object' && firstImage.url) {
          return firstImage.url;
        }
      }
      
      return null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Calculate product metrics from products array
   */
  static calculateMetrics(products) {
    if (!Array.isArray(products)) {
      return {
        total: 0,
        active: 0,
        draft: 0,
        archived: 0,
        totalInventory: 0,
        outOfStock: 0,
        lowStock: 0
      };
    }

    const metrics = products.reduce((acc, product) => {
      acc.total++;
      
      // Status counts
      if (product.status === 'active') acc.active++;
      else if (product.status === 'draft') acc.draft++;
      else if (product.status === 'archived') acc.archived++;
      
      // Inventory counts
      const inventory = product.total_inventory || 0;
      acc.totalInventory += inventory;
      
      if (inventory === 0) acc.outOfStock++;
      else if (inventory < 10) acc.lowStock++;
      
      return acc;
    }, {
      total: 0,
      active: 0,
      draft: 0,
      archived: 0,
      totalInventory: 0,
      outOfStock: 0,
      lowStock: 0
    });

    return metrics;
  }

  /**
   * Validate product data
   */
  static validateProduct(productData) {
    const errors = [];
    
    if (!productData.name || productData.name.trim().length === 0) {
      errors.push('Product name is required');
    }
    
    if (productData.price !== undefined && (isNaN(productData.price) || productData.price < 0)) {
      errors.push('Price must be a valid positive number');
    }
    
    if (productData.compare_price !== undefined && productData.compare_price !== null) {
      if (isNaN(productData.compare_price) || productData.compare_price < 0) {
        errors.push('Compare price must be a valid positive number');
      }
      if (productData.price && productData.compare_price <= productData.price) {
        errors.push('Compare price must be higher than the regular price');
      }
    }
    
    if (productData.status && !['active', 'draft', 'archived'].includes(productData.status)) {
      errors.push('Status must be one of: active, draft, archived');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Upload images using centralized MediaService
   */
  static async uploadImages(images) {
    if (!images || images.length === 0) {
      return [];
    }

    try {
      const { results, errors } = await MediaService.uploadFiles(images, {
        provider: 'cloudflare',
        cache: true,
        parallel: true
      });
      
      if (errors.length > 0) {
        console.warn('Some images failed to upload:', errors);
      }
      
      return results.map(result => result.url);
      
    } catch (error) {
      console.error('Failed to upload images:', error);
      throw new Error(`Failed to upload images: ${error.message}`);
    }
  }

  /**
   * Download media from URL and upload using centralized MediaService
   * Used for importing media from external sources (e.g., CommentSold)
   */
  static async downloadAndUploadMedia(mediaUrls, productName = 'product') {
    if (!mediaUrls || mediaUrls.length === 0) {
      return [];
    }

    try {
      const { results, errors } = await MediaService.downloadAndUpload(mediaUrls, {
        provider: 'cloudflare',
        productName,
        stopOnError: false,
        cache: false // Don't cache external downloads
      });
      
      if (errors.length > 0) {
        console.warn(`Failed to upload ${errors.length} media files:`, errors);
      }
      
      return results.map(result => result.url);
      
    } catch (error) {
      console.error('Failed to download and upload media:', error);
      throw new Error(`Failed to download and upload media: ${error.message}`);
    }
  }

  /**
   * Prepare product data for API submission
   */
  static prepareProductData(formData, images = []) {
    return {
      name: formData.title || formData.name,
      description: formData.description || '',
      price: parseFloat(formData.price) || 0,
      compare_price: formData.comparePrice ? parseFloat(formData.comparePrice) : null,
      status: formData.status?.toLowerCase() || 'draft',
      images: images,
      tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
      collections: formData.collections || [],
      charges_tax: Boolean(formData.chargesTax),
      variants: formData.variants || []
    };
  }

  /**
   * Get export parameters based on scope and selection
   */
  static getExportParams(scope, selection, filters = {}) {
    const params = {
      format: 'csv-excel',
      scope: scope
    };

    switch (scope) {
      case 'selected':
        if (!selection || selection.length === 0) {
          throw new Error('No products selected for export');
        }
        params.productIds = selection;
        break;
      
      case 'current-page':
        if (filters.status && filters.status !== 'all') {
          params.status = filters.status;
        }
        break;
      
      case 'all-products':
        // Export all products without filters
        break;
    }

    return params;
  }
}