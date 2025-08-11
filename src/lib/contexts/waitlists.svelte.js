/**
 * Waitlists Context - Component-tree scoped state
 * Manages selection, sorting, bulk actions, and UI state for waitlist components
 */

import { setContext, getContext } from 'svelte';

const WAITLISTS_CONTEXT = 'waitlists';

export function createWaitlistsContext() {
  // Local component-tree state
  const state = $state({
    // Selection management
    selectedWaitlists: [],
    selectAll: false,
    
    // Sorting and display
    sortBy: 'created_at',
    sortDirection: 'desc',
    
    // UI state
    showFilters: false,
    showBulkActions: false,
    
    // Bulk operations
    bulkActions: {
      processing: false,
      action: null // 'authorize' | 'delete' | null
    },
    
    // Filter UI state
    filterState: {
      status: 'all',
      source: 'all',
      search: ''
    }
  });

  const actions = {
    // Selection management
    selectWaitlist(id) {
      const index = state.selectedWaitlists.indexOf(id);
      if (index > -1) {
        state.selectedWaitlists.splice(index, 1);
      } else {
        state.selectedWaitlists.push(id);
      }
      
      // Update selectAll state based on current selection
      this.updateSelectAllState();
    },

    selectAllWaitlists(waitlistIds) {
      if (state.selectAll) {
        // Deselect all
        state.selectedWaitlists = [];
        state.selectAll = false;
      } else {
        // Select all
        state.selectedWaitlists = [...waitlistIds];
        state.selectAll = true;
      }
    },

    updateSelectAllState(totalWaitlists = 0) {
      if (totalWaitlists === 0) return;
      state.selectAll = state.selectedWaitlists.length === totalWaitlists;
    },

    clearSelection() {
      state.selectedWaitlists = [];
      state.selectAll = false;
      this.hideBulkActions();
    },

    // Sorting
    setSorting(field, direction = null) {
      if (state.sortBy === field && !direction) {
        // Toggle direction if same field
        state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        state.sortBy = field;
        state.sortDirection = direction || 'desc';
      }
    },

    // UI state management
    toggleFilters() {
      state.showFilters = !state.showFilters;
    },

    showBulkActionsPanel() {
      state.showBulkActions = true;
    },

    hideBulkActions() {
      state.showBulkActions = false;
      state.bulkActions.action = null;
    },

    // Bulk operations
    setBulkAction(action) {
      state.bulkActions.action = action;
      state.showBulkActions = true;
    },

    async performBulkAction(actionHandler) {
      if (!state.bulkActions.action || state.selectedWaitlists.length === 0) {
        return;
      }

      state.bulkActions.processing = true;
      
      try {
        const action = state.bulkActions.action;
        const selectedIds = [...state.selectedWaitlists];
        
        // Call the provided action handler
        await actionHandler(action, selectedIds);
        
        // Clear selection and hide actions on success
        this.clearSelection();
        
        console.log(`Bulk ${action} completed successfully for ${selectedIds.length} items`);
      } catch (error) {
        console.error('Bulk action failed:', error);
        throw error;
      } finally {
        state.bulkActions.processing = false;
      }
    },

    // Filter management
    updateFilterState(key, value) {
      state.filterState[key] = value;
    },

    applyFilters(onFilterChange) {
      if (onFilterChange) {
        onFilterChange(state.filterState);
      }
    },

    clearFilterState() {
      state.filterState = {
        status: 'all',
        source: 'all',
        search: ''
      };
    },

    // Search
    performSearch(onSearch) {
      if (onSearch && state.filterState.search.trim()) {
        onSearch(state.filterState.search.trim());
      }
    }
  };

  // Derived values for the context
  const hasSelection = $derived(state.selectedWaitlists.length > 0);
  const selectionCount = $derived(state.selectedWaitlists.length);
  const canPerformBulkActions = $derived(state.selectedWaitlists.length > 0 && !state.bulkActions.processing);
  const sortIcon = $derived(state.sortDirection === 'asc' ? '↑' : '↓');
  const isProcessingBulkAction = $derived(state.bulkActions.processing);
  const hasActiveFilters = $derived(
    state.filterState.status !== 'all' || 
    state.filterState.source !== 'all' || 
    state.filterState.search.trim() !== ''
  );

  const derived = {
    get hasSelection() { return hasSelection; },
    get selectionCount() { return selectionCount; },
    get canPerformBulkActions() { return canPerformBulkActions; },
    get sortIcon() { return sortIcon; },
    get isProcessingBulkAction() { return isProcessingBulkAction; },
    get hasActiveFilters() { return hasActiveFilters; }
  };

  const context = { state, actions, derived };
  setContext(WAITLISTS_CONTEXT, context);
  
  return context;
}

export function getWaitlistsContext() {
  const context = getContext(WAITLISTS_CONTEXT);
  if (!context) {
    throw new Error('getWaitlistsContext must be called within a component that has createWaitlistsContext in its tree');
  }
  return context;
}