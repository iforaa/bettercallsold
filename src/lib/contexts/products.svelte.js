/**
 * Products Context - Component-tree scoped state
 * Manages selection, bulk operations, and UI state for products components
 */

import { getContext, setContext } from 'svelte';

const PRODUCTS_CONTEXT_KEY = 'products-context';

// Create products context
export function createProductsContext() {
  const state = $state({
    // Selection management
    selectedProducts: [],
    
    // UI state
    showExportModal: false,
    exportScope: 'current-page', // 'current-page', 'all-products', 'selected'
    exportFormat: 'csv-excel', // 'csv-excel', 'plain-csv'
    
    // Filter UI state
    currentTab: 'all',
    searchQuery: '',
    
    // Bulk actions state
    bulkActions: {
      processing: false,
      operation: null // 'delete', 'export'
    }
  });
  
  // Derived computations
  const hasSelection = $derived(state.selectedProducts.length > 0);
  const canPerformBulkActions = $derived(state.selectedProducts.length > 0 && !state.bulkActions.processing);
  const allSelected = $derived(false); // Placeholder - will be overridden by parent component
  
  // Group derived values
  const derived = {
    get hasSelection() { return hasSelection; },
    get canPerformBulkActions() { return canPerformBulkActions; },
    get allSelected() { return allSelected; },
    get selectionCount() { return state.selectedProducts.length; },
    get isProcessingBulkAction() { return state.bulkActions.processing; }
  };
  
  const actions = {
    // Selection management
    selectProduct(productId) {
      if (state.selectedProducts.includes(productId)) {
        state.selectedProducts = state.selectedProducts.filter(id => id !== productId);
      } else {
        state.selectedProducts = [...state.selectedProducts, productId];
      }
    },
    
    selectAll(productIds = []) {
      state.selectedProducts = [...productIds];
    },
    
    clearSelection() {
      state.selectedProducts = [];
    },
    
    toggleSelectAll(productIds = []) {
      if (state.selectedProducts.length === productIds.length) {
        this.clearSelection();
      } else {
        this.selectAll(productIds);
      }
    },
    
    // Export modal management
    openExportModal() {
      state.showExportModal = true;
    },
    
    closeExportModal() {
      state.showExportModal = false;
      state.exportScope = 'current-page';
      state.exportFormat = 'csv-excel';
    },
    
    setExportScope(scope) {
      state.exportScope = scope;
    },
    
    setExportFormat(format) {
      state.exportFormat = format;
    },
    
    // Tab management
    setCurrentTab(tabId) {
      state.currentTab = tabId;
      // Clear selection when switching tabs
      this.clearSelection();
    },
    
    // Search management
    setSearchQuery(query) {
      state.searchQuery = query;
    },
    
    // Bulk actions
    startBulkAction(operation) {
      state.bulkActions.processing = true;
      state.bulkActions.operation = operation;
    },
    
    completeBulkAction() {
      state.bulkActions.processing = false;
      state.bulkActions.operation = null;
      // Clear selection after bulk operation
      this.clearSelection();
    },
    
    // Reset all state
    reset() {
      state.selectedProducts = [];
      state.showExportModal = false;
      state.exportScope = 'current-page';
      state.exportFormat = 'csv-excel';
      state.currentTab = 'all';
      state.searchQuery = '';
      state.bulkActions.processing = false;
      state.bulkActions.operation = null;
    }
  };
  
  const context = {
    state,
    derived,
    actions
  };
  
  setContext(PRODUCTS_CONTEXT_KEY, context);
  
  return context;
}

// Get products context
export function getProductsContext() {
  const context = getContext(PRODUCTS_CONTEXT_KEY);
  if (!context) {
    throw new Error('Products context not found. Make sure to call createProductsContext() in a parent component.');
  }
  return context;
}