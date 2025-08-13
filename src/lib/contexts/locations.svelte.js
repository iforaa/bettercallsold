/**
 * Locations Context - Component-tree scoped state
 * Handles UI state like selections, sorting, bulk actions, view modes
 * Following the Services + Runes + Context architecture pattern
 */

import { setContext, getContext } from 'svelte';
import { locationsActions } from '../state/locations.svelte.js';

const LOCATIONS_CONTEXT = 'locations';

export function createLocationsContext() {
  // Local component-tree state (UI-specific, not global)
  const state = $state({
    selectedLocations: [],
    sortBy: 'created_at',
    sortDirection: 'desc',
    showFilters: false,
    viewMode: 'list', // 'list' | 'grid'
    bulkActions: {
      processing: false,
      selectedAction: 'none'
    }
  });

  const actions = {
    // Selection management
    selectLocation(id) {
      const index = state.selectedLocations.indexOf(id);
      if (index > -1) {
        state.selectedLocations.splice(index, 1);
      } else {
        state.selectedLocations.push(id);
      }
    },

    selectAllLocations(locationIds) {
      if (this.allSelected(locationIds)) {
        // If all are selected, deselect all
        state.selectedLocations = [];
      } else {
        // Select all
        state.selectedLocations = [...locationIds];
      }
    },

    clearSelection() {
      state.selectedLocations = [];
    },

    isSelected(id) {
      return state.selectedLocations.includes(id);
    },

    // Sorting
    setSorting(field, direction = 'asc') {
      // Toggle direction if same field
      if (state.sortBy === field) {
        state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        state.sortBy = field;
        state.sortDirection = direction;
      }
    },

    // UI state management
    toggleFilters() {
      state.showFilters = !state.showFilters;
    },

    setViewMode(mode) {
      if (['list', 'grid'].includes(mode)) {
        state.viewMode = mode;
      }
    },

    // Bulk actions
    async performBulkAction(action) {
      if (!state.selectedLocations.length) return;
      
      state.bulkActions.processing = true;
      state.bulkActions.selectedAction = action;
      
      try {
        switch (action) {
          case 'activate':
            await Promise.all(
              state.selectedLocations.map(id => 
                locationsActions.updateLocation(id, { status: 'active' })
              )
            );
            break;
            
          case 'deactivate':
            await Promise.all(
              state.selectedLocations.map(id => 
                locationsActions.updateLocation(id, { status: 'inactive' })
              )
            );
            break;
            
          case 'delete':
            await Promise.all(
              state.selectedLocations.map(id => 
                locationsActions.deleteLocation(id)
              )
            );
            break;
            
          case 'enable_pickup':
            await Promise.all(
              state.selectedLocations.map(id => 
                locationsActions.updateLocation(id, { is_pickup_location: true })
              )
            );
            break;
            
          case 'disable_pickup':
            await Promise.all(
              state.selectedLocations.map(id => 
                locationsActions.updateLocation(id, { is_pickup_location: false })
              )
            );
            break;
            
          case 'enable_fulfillment':
            await Promise.all(
              state.selectedLocations.map(id => 
                locationsActions.updateLocation(id, { is_fulfillment_center: true })
              )
            );
            break;
            
          case 'disable_fulfillment':
            await Promise.all(
              state.selectedLocations.map(id => 
                locationsActions.updateLocation(id, { is_fulfillment_center: false })
              )
            );
            break;
            
          default:
            throw new Error(`Unknown bulk action: ${action}`);
        }
        
        // Clear selection after successful action
        state.selectedLocations = [];
      } catch (error) {
        console.error(`Bulk action "${action}" failed:`, error);
        throw error;
      } finally {
        state.bulkActions.processing = false;
        state.bulkActions.selectedAction = 'none';
      }
    }
  };

  // Derived values for the context
  const hasSelection = $derived(state.selectedLocations.length > 0);
  const selectionCount = $derived(state.selectedLocations.length);
  const isAllSelected = $derived.by(() => {
    return (locationIds) => {
      return locationIds && locationIds.length > 0 && 
             locationIds.every(id => state.selectedLocations.includes(id));
    };
  });
  
  const derived = {
    get hasSelection() { return hasSelection; },
    get selectionCount() { return selectionCount; },
    get canPerformBulkActions() { 
      return hasSelection && !state.bulkActions.processing; 
    },
    allSelected(locationIds) {
      return locationIds && locationIds.length > 0 && 
             locationIds.every(id => state.selectedLocations.includes(id));
    },
    sortedLocations(locations) {
      if (!locations || !Array.isArray(locations)) return [];
      
      return [...locations].sort((a, b) => {
        const aValue = a[state.sortBy];
        const bValue = b[state.sortBy];
        
        // Handle different data types
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          const result = aValue.localeCompare(bValue);
          return state.sortDirection === 'asc' ? result : -result;
        }
        
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          const result = aValue - bValue;
          return state.sortDirection === 'asc' ? result : -result;
        }
        
        if (aValue instanceof Date && bValue instanceof Date) {
          const result = aValue.getTime() - bValue.getTime();
          return state.sortDirection === 'asc' ? result : -result;
        }
        
        // Handle date strings
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          const dateA = new Date(aValue);
          const dateB = new Date(bValue);
          if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
            const result = dateA.getTime() - dateB.getTime();
            return state.sortDirection === 'asc' ? result : -result;
          }
        }
        
        // Default string comparison
        const result = String(aValue).localeCompare(String(bValue));
        return state.sortDirection === 'asc' ? result : -result;
      });
    }
  };

  const context = { state, actions, derived };
  setContext(LOCATIONS_CONTEXT, context);
  
  return context;
}

export function getLocationsContext() {
  const context = getContext(LOCATIONS_CONTEXT);
  if (!context) {
    throw new Error('getLocationsContext must be called within a component that has createLocationsContext in its tree');
  }
  return context;
}