/**
 * Global Products State - Svelte 5 Runes
 * Universal reactivity for product data across the entire app
 */

import { ProductService } from '../services/ProductService.js';

// IMPORTANT: Use objects for automatic proxy reactivity
export const productsState = $state({
  // Main data
  products: [],
  currentProduct: null,
  collections: [],
  
  // Loading states for different sections
  loading: {
    products: false,
    current: false,
    collections: false,
    creating: false,
    updating: false,
    deleting: false,
    bulk: false,
    export: false
  },
  
  // Error states for different sections
  errors: {
    products: '',
    current: '',
    collections: '',
    creating: '',
    updating: '',
    deleting: '',
    bulk: '',
    export: ''
  },
  
  // Filters and search
  filters: {
    status: 'all',
    search: '',
    collection: '',
    tags: '',
    limit: 50,
    offset: 0
  },
  
  // Form states
  form: {
    data: null,
    uploading: false,
    unsavedChanges: false
  },
  
  // Metadata
  lastFetch: null,
  metrics: null
});

// Computed functions (can't export $derived from modules)
export function getFilteredProducts() {
  if (!productsState.products) return [];
  
  return productsState.products.filter(product => {
    const matchesStatus = productsState.filters.status === 'all' || 
                         product.status === productsState.filters.status;
    
    const matchesSearch = !productsState.filters.search ||
                         product.name.toLowerCase().includes(productsState.filters.search.toLowerCase()) ||
                         (product.description && product.description.toLowerCase().includes(productsState.filters.search.toLowerCase()));
                         
    const matchesCollection = !productsState.filters.collection ||
                            (product.collections && product.collections.includes(productsState.filters.collection));
                            
    const matchesTags = !productsState.filters.tags ||
                       (product.tags && product.tags.some(tag => 
                         tag.toLowerCase().includes(productsState.filters.tags.toLowerCase())
                       ));
    
    return matchesStatus && matchesSearch && matchesCollection && matchesTags;
  });
}

export function getProductMetrics() {
  const filtered = getFilteredProducts();
  const metrics = ProductService.calculateMetrics(filtered);
  
  // Return formatted metrics for display
  return [
    {
      key: 'total',
      value: metrics.total,
      label: 'TOTAL PRODUCTS',
      variant: 'accent'
    },
    {
      key: 'active', 
      value: metrics.active,
      label: 'ACTIVE',
      variant: 'success'
    },
    {
      key: 'draft',
      value: metrics.draft,
      label: 'DRAFTS',
      variant: 'warning'
    },
    {
      key: 'outOfStock',
      value: metrics.outOfStock,
      label: 'OUT OF STOCK',
      variant: 'error'
    }
  ];
}

export function getCurrentProductDisplay() {
  if (!productsState.currentProduct) return null;
  return ProductService.formatProduct(productsState.currentProduct);
}

export function hasCriticalErrors() {
  return Boolean(productsState.errors.products) || Boolean(productsState.errors.current);
}

export function isAnyLoading() {
  const loading = productsState.loading;
  return loading.products || loading.current || loading.creating || 
         loading.updating || loading.deleting || loading.bulk || loading.export;
}

export function getStatusBreakdown() {
  const filtered = getFilteredProducts();
  const breakdown = {
    'Active': 0,
    'Draft': 0,
    'Archived': 0
  };
  
  filtered.forEach(product => {
    const status = product.status.charAt(0).toUpperCase() + product.status.slice(1);
    breakdown[status] = (breakdown[status] || 0) + 1;
  });
  
  return breakdown;
}

// Actions for state management
export const productsActions = {
  async loadProducts(params = {}) {
    // Prevent multiple concurrent loads
    if (productsState.loading.products) {
      console.log('Products load already in progress, skipping');
      return;
    }
    
    productsState.loading.products = true;
    productsState.errors.products = '';
    
    // Merge with existing filters
    const mergedParams = {
      ...productsState.filters,
      ...params
    };
    
    try {
      const products = await ProductService.getProducts(mergedParams);
      productsState.products = Array.isArray(products) ? products : [];
      productsState.lastFetch = new Date();
      
      // Update metrics
      productsState.metrics = ProductService.calculateMetrics(productsState.products);
      
      console.log(`Loaded ${productsState.products.length} products`);
    } catch (error) {
      productsState.errors.products = error.message;
      productsState.products = [];
      console.error('Failed to load products:', error);
    } finally {
      productsState.loading.products = false;
    }
  },

  async loadProduct(id) {
    // Prevent multiple concurrent loads
    if (productsState.loading.current) {
      console.log('Product load already in progress, skipping');
      return;
    }
    
    productsState.loading.current = true;
    productsState.errors.current = '';
    
    try {
      const product = await ProductService.getProduct(id);
      productsState.currentProduct = product;
      
      console.log('Loaded product:', product.id);
    } catch (error) {
      productsState.errors.current = error.message;
      productsState.currentProduct = null;
      console.error('Failed to load product:', error);
    } finally {
      productsState.loading.current = false;
    }
  },

  async createProduct(formData, images = []) {
    productsState.loading.creating = true;
    productsState.errors.creating = '';
    
    try {
      // Upload images first if any
      let imageUrls = [];
      if (images.length > 0) {
        productsState.form.uploading = true;
        imageUrls = await ProductService.uploadImages(images);
      }
      
      // Prepare product data
      const productData = ProductService.prepareProductData(formData, imageUrls);
      
      // Validate data
      const validation = ProductService.validateProduct(productData);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }
      
      // Create product
      const result = await ProductService.createProduct(productData);
      
      // Add to products list if successful
      if (result.data) {
        productsState.products = [result.data, ...productsState.products];
        productsState.currentProduct = result.data;
        
        // Update metrics
        productsState.metrics = ProductService.calculateMetrics(productsState.products);
        
        // Clear form state
        productsState.form.data = null;
        productsState.form.unsavedChanges = false;
      }
      
      return result;
    } catch (error) {
      productsState.errors.creating = error.message;
      throw error;
    } finally {
      productsState.loading.creating = false;
      productsState.form.uploading = false;
    }
  },

  async updateProduct(id, formData, images = []) {
    productsState.loading.updating = true;
    productsState.errors.updating = '';
    
    try {
      // Upload images first if any
      let imageUrls = [];
      if (images.length > 0) {
        productsState.form.uploading = true;
        imageUrls = await ProductService.uploadImages(images);
      }
      
      // Prepare product data (if formData is provided, otherwise use it as updates directly)
      let updates;
      if (formData && typeof formData === 'object' && formData.title !== undefined) {
        // This is form data from the component
        // Get existing images from current product
        const existingImages = productsState.currentProduct?.images || [];
        const currentImagesArray = Array.isArray(existingImages) ? existingImages : JSON.parse(existingImages || '[]');
        
        // Merge existing images with new uploaded images
        const allImages = [...currentImagesArray, ...imageUrls];
        
        updates = ProductService.prepareProductData(formData, allImages);
      } else {
        // This is already prepared updates object
        updates = formData;
        if (imageUrls.length > 0) {
          // Append new images to existing ones or create new array
          updates.images = [...(updates.images || []), ...imageUrls];
        }
      }
      
      const updatedProduct = await ProductService.updateProduct(id, updates);
      
      // Update current product if it's the one being edited
      if (productsState.currentProduct?.id === id) {
        productsState.currentProduct = updatedProduct;
      }
      
      // Update in products list
      const index = productsState.products.findIndex(p => p.id === id);
      if (index !== -1) {
        productsState.products[index] = updatedProduct;
      }
      
      // Recalculate metrics
      productsState.metrics = ProductService.calculateMetrics(productsState.products);
      
      return updatedProduct;
    } catch (error) {
      productsState.errors.updating = error.message;
      throw error;
    } finally {
      productsState.loading.updating = false;
      productsState.form.uploading = false;
    }
  },

  async deleteProduct(id) {
    productsState.loading.deleting = true;
    productsState.errors.deleting = '';
    
    try {
      await ProductService.deleteProduct(id);
      
      // Remove from products list
      productsState.products = productsState.products.filter(p => p.id !== id);
      
      // Clear current product if it was deleted
      if (productsState.currentProduct?.id === id) {
        productsState.currentProduct = null;
      }
      
      // Recalculate metrics
      productsState.metrics = ProductService.calculateMetrics(productsState.products);
      
      return true;
    } catch (error) {
      productsState.errors.deleting = error.message;
      throw error;
    } finally {
      productsState.loading.deleting = false;
    }
  },

  async bulkDeleteProducts(productIds) {
    productsState.loading.bulk = true;
    productsState.errors.bulk = '';
    
    try {
      const results = await ProductService.bulkDeleteProducts(productIds);
      
      // Remove successful deletions from local state
      if (results.successful.length > 0) {
        productsState.products = productsState.products.filter(
          p => !results.successful.includes(p.id)
        );
        
        // Clear current product if it was deleted
        if (productsState.currentProduct && results.successful.includes(productsState.currentProduct.id)) {
          productsState.currentProduct = null;
        }
        
        // Recalculate metrics
        productsState.metrics = ProductService.calculateMetrics(productsState.products);
      }
      
      return results;
    } catch (error) {
      productsState.errors.bulk = error.message;
      throw error;
    } finally {
      productsState.loading.bulk = false;
    }
  },

  async exportProducts(exportParams) {
    productsState.loading.export = true;
    productsState.errors.export = '';
    
    try {
      const { blob, filename } = await ProductService.exportProducts(exportParams);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      return true;
    } catch (error) {
      productsState.errors.export = error.message;
      throw error;
    } finally {
      productsState.loading.export = false;
    }
  },

  async loadCollections() {
    if (productsState.loading.collections) return;
    
    productsState.loading.collections = true;
    productsState.errors.collections = '';
    
    try {
      const collections = await ProductService.getCollections();
      productsState.collections = Array.isArray(collections) ? collections : [];
      
      console.log(`Loaded ${productsState.collections.length} collections`);
    } catch (error) {
      productsState.errors.collections = error.message;
      productsState.collections = [];
      console.error('Failed to load collections:', error);
    } finally {
      productsState.loading.collections = false;
    }
  },

  // Filter and search management
  setFilter(key, value) {
    productsState.filters[key] = value;
    
    // Auto-reload when filters change (except search - that's manual)
    if (key !== 'search') {
      this.loadProducts();
    }
  },

  clearFilters() {
    productsState.filters = {
      status: 'all',
      search: '',
      collection: '',
      tags: '',
      limit: 50,
      offset: 0
    };
    this.loadProducts();
  },

  // Form management
  setFormData(data) {
    productsState.form.data = data;
    productsState.form.unsavedChanges = true;
  },

  clearForm() {
    productsState.form.data = null;
    productsState.form.unsavedChanges = false;
    productsState.form.uploading = false;
  },

  // Clear states
  clearCurrentProduct() {
    productsState.currentProduct = null;
    productsState.errors.current = '';
  },

  clearErrors() {
    productsState.errors = {
      products: '',
      current: '',
      collections: '',
      creating: '',
      updating: '',
      deleting: '',
      bulk: '',
      export: ''
    };
  },

  // Retry operations
  retry() {
    if (productsState.errors.products) {
      return this.loadProducts(productsState.filters);
    }
    if (productsState.errors.current && productsState.currentProduct) {
      return this.loadProduct(productsState.currentProduct.id);
    }
    if (productsState.errors.collections) {
      return this.loadCollections();
    }
  }
};