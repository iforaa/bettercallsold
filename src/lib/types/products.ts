/**
 * Product Type Definitions
 * Complete TypeScript interfaces for the products domain
 */

import type { BaseEntity } from './common';

// Product status options
export type ProductStatus = 'active' | 'draft' | 'archived';

// Product image types
export interface ProductImage {
  url: string;
  alt?: string;
  position?: number;
  id?: string;
}

// Product variant interface
export interface ProductVariant extends BaseEntity {
  product_id: string;
  title: string;
  price: number;
  compare_price?: number | null;
  sku?: string;
  barcode?: string;
  inventory_quantity: number;
  inventory_policy: 'deny' | 'continue';
  weight?: number;
  weight_unit?: 'g' | 'kg' | 'oz' | 'lb';
  requires_shipping: boolean;
  taxable: boolean;
  position: number;
  option1?: string;
  option2?: string;
  option3?: string;
}

// Main product interface
export interface Product extends BaseEntity {
  name: string;
  description?: string;
  status: ProductStatus;
  price: number;
  compare_price?: number | null;
  images?: ProductImage[] | string; // Can be JSON string from API
  tags?: string[];
  collections?: string[]; // Collection IDs
  charges_tax: boolean;
  
  // Computed/aggregated fields
  total_inventory?: number;
  variant_count?: number;
  variants?: ProductVariant[];
  
  // Shopify/API specific fields
  vendor?: string;
  product_type?: string;
  handle?: string;
  template_suffix?: string;
  published_at?: string;
  
  // SEO fields
  seo_title?: string;
  seo_description?: string;
}

// Product with computed display properties
export interface ProductFormatted extends Product {
  formattedPrice: string;
  formattedComparePrice?: string;
  statusInfo: ProductStatusInfo;
  inventoryStatus: InventoryStatusInfo;
  firstImage?: string;
  totalVariants: number;
  isActive: boolean;
  isDraft: boolean;
  isArchived: boolean;
}

// Product status information
export interface ProductStatusInfo {
  label: string;
  color: 'success' | 'warning' | 'error' | 'info' | 'default';
  class: string;
}

// Inventory status information
export interface InventoryStatusInfo {
  label: string;
  class: string;
  variant: 'success' | 'warning' | 'error' | 'info' | 'default';
}

// Product filters for API requests
export interface ProductFilters {
  status: ProductStatus | 'all';
  search: string;
  collection?: string;
  tags?: string;
  limit: number;
  offset: number;
}

// Product form data for creation/editing
export interface ProductFormData {
  title: string;
  name: string;
  description: string;
  price: string | number;
  comparePrice?: string | number;
  status: ProductStatus;
  chargesTax: boolean;
  tags: string;
  collections: string[];
  images: File[];
  variants: ProductVariant[];
}

// Product creation/update data for API
export interface ProductCreateData {
  name: string;
  description?: string;
  price: number;
  compare_price?: number | null;
  status: ProductStatus;
  images?: string[];
  tags?: string[];
  collections?: string[];
  charges_tax: boolean;
  variants?: Partial<ProductVariant>[];
}

// Product metrics for dashboard/analytics
export interface ProductMetrics {
  total: number;
  active: number;
  draft: number;
  archived: number;
  totalInventory: number;
  outOfStock: number;
  lowStock: number;
}

// Export parameters
export interface ProductExportParams {
  format: 'csv-excel' | 'plain-csv';
  scope: 'current-page' | 'all-products' | 'selected';
  productIds?: string[];
  status?: ProductStatus;
  collection?: string;
  tags?: string;
}

// Bulk operation results
export interface BulkDeleteResult {
  successful: string[];
  failed: Array<{
    id: string;
    error: string;
  }>;
}

// Collection interface (for product organization)
export interface Collection extends BaseEntity {
  name: string;
  description?: string;
  handle?: string;
  image?: ProductImage;
  published_at?: string;
  sort_order?: 'alpha-asc' | 'alpha-desc' | 'best-selling' | 'created' | 'created-desc' | 'manual' | 'price-asc' | 'price-desc';
}

// Product table display options
export interface ProductTableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

// Product search/filter state
export interface ProductSearchState {
  query: string;
  status: ProductStatus | 'all';
  collection: string;
  tags: string;
  sortBy: 'name' | 'created_at' | 'price' | 'inventory' | 'status';
  sortOrder: 'asc' | 'desc';
}

// Upload result
export interface ImageUploadResult {
  url: string;
  filename: string;
  size: number;
}

// Collection form data for creation/editing
export interface CollectionFormData {
  name: string;
  description: string;
  image_url: string;
  sort_order: number;
  images: File[];
}