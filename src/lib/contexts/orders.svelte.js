/**
 * Orders Context - Component-tree scoped state
 * Handles UI state like selections, sorting, bulk actions
 */

import { setContext, getContext } from 'svelte';

const ORDERS_CONTEXT = 'orders';

export function createOrdersContext() {
  // Local component-tree state
  const state = $state({
    selectedOrders: [],
    sortBy: 'created_at',
    sortDirection: 'desc',
    showFilters: false,
    bulkActions: {
      processing: false,
      selected: 'none'
    }
  });

  const actions = {
    selectOrder(id) {
      const index = state.selectedOrders.indexOf(id);
      if (index > -1) {
        state.selectedOrders.splice(index, 1);
      } else {
        state.selectedOrders.push(id);
      }
    },

    selectAllOrders(orderIds) {
      state.selectedOrders = [...orderIds];
    },

    clearSelection() {
      state.selectedOrders = [];
    },

    isSelected(id) {
      return state.selectedOrders.includes(id);
    },

    setSorting(field, direction) {
      state.sortBy = field;
      state.sortDirection = direction;
    },

    toggleFilters() {
      state.showFilters = !state.showFilters;
    },

    async performBulkAction(action) {
      state.bulkActions.processing = true;
      state.bulkActions.selected = action;
      
      try {
        // Implement bulk actions here
        console.log(`Performing ${action} on orders:`, state.selectedOrders);
        
        // For now, just simulate the action
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Clear selection after successful action
        state.selectedOrders = [];
      } catch (error) {
        console.error('Bulk action failed:', error);
        throw error;
      } finally {
        state.bulkActions.processing = false;
        state.bulkActions.selected = 'none';
      }
    }
  };

  // Derived values for the context
  const hasSelection = $derived(state.selectedOrders.length > 0);
  const selectionCount = $derived(state.selectedOrders.length);
  
  const derived = {
    get hasSelection() { return hasSelection; },
    get selectionCount() { return selectionCount; },
    allSelected(orderIds) {
      return orderIds && orderIds.length > 0 && 
             orderIds.every(id => state.selectedOrders.includes(id));
    }
  };

  const context = { state, actions, derived };
  setContext(ORDERS_CONTEXT, context);
  
  return context;
}

export function getOrdersContext() {
  const context = getContext(ORDERS_CONTEXT);
  if (!context) {
    throw new Error('getOrdersContext must be called within a component that has createOrdersContext in its tree');
  }
  return context;
}