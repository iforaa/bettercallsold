/**
 * Inventory Type Definitions
 * Complete TypeScript interfaces for the inventory domain
 */

import type { BaseEntity } from './common';

// Inventory item status options
export type InventoryStockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

// Inventory locations
export type InventoryLocation = 'all' | string;

// Adjustment reasons
export type AdjustmentReason = 
  | 'Correction (default)'
  | 'Cycle count'
  | 'Damaged'
  | 'Quality control'
  | 'Received'
  | 'Sold'
  | 'Other';

// Base inventory item interface
export interface InventoryItem extends BaseEntity {
  product_id: string;
  product_name: string;
  quantity: number;
  variant_combination?: {
    size?: string;
    color?: string;
    [key: string]: any;
  };
  price?: number;
  cost?: number;
  sku?: {
    Valid: boolean;
    String: string;
  };
  location?: {
    Valid: boolean;
    String: string;
  };
  position: number;
  product_images?: string | any[];
  product_status: string;
  base_price: number;
  
  // Legacy fields for compatibility
  size?: {
    Valid: boolean;
    String: string;
  };
  color?: {
    Valid: boolean;
    String: string;
  };
  available?: number;
  on_hand?: number;
  unavailable?: number;
  committed?: number;
}

// Formatted inventory item with computed properties
export interface InventoryItemFormatted extends InventoryItem {
  formattedTitle: string;
  formattedSKU: string;
  formattedLocation: string;
  availableCount: number;
  onHandCount: number;
  unavailableCount: number;
  committedCount: number;
  stockStatus: InventoryStockStatusInfo;
  isLowStock: boolean;
  isOutOfStock: boolean;
  hasVariants: boolean;
  formattedPrice: string;
  formattedCost?: string;
  totalValue: number;
  formattedTotalValue: string;
}

// Stock status information
export interface InventoryStockStatusInfo {
  status: InventoryStockStatus;
  label: string;
  color: 'success' | 'warning' | 'error' | 'info' | 'default';
  class: string;
}

// Inventory filters for API requests
export interface InventoryFilters {
  search: string;
  location: InventoryLocation;
  stockStatus: InventoryStockStatus | 'all';
  limit: number;
  offset: number;
}

// Inventory metrics and analytics
export interface InventoryMetrics {
  totalItems: number;
  totalCostValue: number;
  totalRetailValue: number;
  lowStockCount: number;
  lowStockItems: InventoryItem[];
  
  // Computed metrics for filtered data
  filteredCount?: number;
  selectedCount?: number;
  hasSelection?: boolean;
  hasFiltersApplied?: boolean;
  filteredTotalValue?: number;
  filteredRetailValue?: number;
  filteredLowStockCount?: number;
  filteredOutOfStockCount?: number;
}

// Quantity adjustment data
export interface QuantityAdjustment {
  id: string;
  quantity: number;
  reason: AdjustmentReason;
  field?: 'available' | 'on_hand';
}

// Bulk update operation data
export interface BulkUpdateOperation {
  updates: QuantityAdjustment[];
}

// Bulk update results
export interface BulkUpdateResult {
  successful: Array<{
    id: string;
    quantity: number;
    updated_at: string;
  }>;
  failed: Array<{
    id: string;
    error: string;
  }>;
}

// Inventory adjustment modal data
export interface InventoryAdjustmentModal {
  showAdjustModal: boolean;
  adjustingItem: InventoryItemFormatted | null;
  adjustBy: number;
  newQuantity: number;
  adjustReason: AdjustmentReason;
}

// Inventory selection state
export interface InventorySelection {
  selectedItems: string[];
  selectAll: boolean;
}

// Inventory loading states
export interface InventoryLoadingStates {
  list: boolean;
  updating: boolean;
  bulkUpdate: boolean;
}

// Inventory error states
export interface InventoryErrorStates {
  list: string;
  updating: string;
  bulkUpdate: string;
}

// Complete inventory state interface
export interface InventoryState {
  items: InventoryItemFormatted[];
  loading: InventoryLoadingStates;
  errors: InventoryErrorStates;
  lastFetch: Date | null;
  filters: InventoryFilters;
  metrics: InventoryMetrics;
  selection: InventorySelection;
  modal: InventoryAdjustmentModal;
}

// Inventory search state
export interface InventorySearchState {
  query: string;
  location: InventoryLocation;
  stockStatus: InventoryStockStatus | 'all';
  sortBy: 'product_name' | 'quantity' | 'sku' | 'location' | 'updated_at';
  sortOrder: 'asc' | 'desc';
}

// Inventory table column configuration
export interface InventoryTableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  type?: 'text' | 'number' | 'button' | 'checkbox' | 'status';
}

// Validation result for quantity adjustments
export interface QuantityValidationResult {
  valid: boolean;
  error?: string;
}

// Adjustment calculation result
export interface AdjustmentCalculation {
  difference: number;
  isIncrease: boolean;
  isDecrease: boolean;
  percentageChange: number;
  formattedDifference: string;
}

// Low stock alert configuration
export interface LowStockAlert {
  threshold: number;
  enabled: boolean;
  notifyEmail?: string;
}

// Inventory location configuration
export interface LocationConfig {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  address?: string;
}

// Inventory export parameters
export interface InventoryExportParams {
  format: 'csv-excel' | 'plain-csv' | 'json';
  scope: 'current-page' | 'all-items' | 'selected' | 'filtered';
  itemIds?: string[];
  includeMetrics?: boolean;
  includeImages?: boolean;
}

// Inventory import data
export interface InventoryImportData {
  items: Array<{
    product_id?: string;
    sku?: string;
    quantity: number;
    cost?: number;
    location?: string;
  }>;
  options: {
    updateExisting: boolean;
    createMissing: boolean;
    defaultLocation?: string;
  };
}

// Inventory activity log entry
export interface InventoryActivityLog extends BaseEntity {
  inventory_id: string;
  action: 'created' | 'updated' | 'deleted' | 'adjusted';
  previous_quantity?: number;
  new_quantity: number;
  reason?: string;
  user_id?: string;
  metadata?: Record<string, any>;
}