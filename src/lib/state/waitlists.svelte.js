/**
 * Global Waitlists State - Svelte 5 Runes
 * Universal reactivity for waitlist data across the entire app
 */

import { WaitlistService } from '../services/WaitlistService.js';

// IMPORTANT: Use objects for automatic proxy reactivity
export const waitlistsState = $state({
  // Main data
  waitlists: [],
  currentWaitlist: null,
  
  // Loading states for different sections
  loading: {
    waitlists: false,
    current: false,
    bulk: false
  },
  
  // Error states for different sections
  errors: {
    waitlists: '',
    current: '',
    bulk: ''
  },
  
  // Filters and search
  filters: {
    status: 'all',
    source: 'all', 
    search: '',
    limit: 50,
    offset: 0
  },
  
  // Metadata
  lastFetch: null,
  metrics: null
});

// Computed functions (can't export $derived from modules)
export function getFilteredWaitlists() {
  if (!waitlistsState.waitlists) return [];
  
  return waitlistsState.waitlists.filter(waitlist => {
    const matchesStatus = waitlistsState.filters.status === 'all' || 
                         WaitlistService.getStatus(waitlist) === waitlistsState.filters.status;
    
    const matchesSource = waitlistsState.filters.source === 'all' ||
                         waitlist.order_source === waitlistsState.filters.source;
                         
    const matchesSearch = !waitlistsState.filters.search ||
                         waitlist.user_name.toLowerCase().includes(waitlistsState.filters.search.toLowerCase()) ||
                         waitlist.user_email.toLowerCase().includes(waitlistsState.filters.search.toLowerCase()) ||
                         waitlist.product_name.toLowerCase().includes(waitlistsState.filters.search.toLowerCase());
    
    return matchesStatus && matchesSource && matchesSearch;
  });
}

export function getWaitlistMetrics() {
  const filtered = getFilteredWaitlists();
  const metrics = WaitlistService.calculateMetrics(filtered);
  
  // Return formatted metrics for display
  return [
    {
      key: 'total',
      value: metrics.total,
      label: 'TOTAL ENTRIES',
      variant: 'accent'
    },
    {
      key: 'pending', 
      value: metrics.pending,
      label: 'PENDING',
      variant: 'warning'
    },
    {
      key: 'authorized',
      value: metrics.authorized,
      label: 'AUTHORIZED',
      variant: 'success'
    },
    {
      key: 'authorizationRate',
      value: metrics.authorizationRate,
      label: 'AUTH RATE',
      variant: 'info',
      format: 'percentage'
    }
  ];
}

export function getCurrentWaitlistDisplay() {
  if (!waitlistsState.currentWaitlist) return null;
  return WaitlistService.formatWaitlistEntry(waitlistsState.currentWaitlist);
}

export function hasCriticalErrors() {
  return waitlistsState.errors.waitlists || waitlistsState.errors.current;
}

export function isAnyLoading() {
  const loading = waitlistsState.loading;
  return loading.waitlists || loading.current || loading.bulk;
}

export function getSourceBreakdown() {
  const filtered = getFilteredWaitlists();
  const breakdown = {};
  
  filtered.forEach(waitlist => {
    const sourceInfo = WaitlistService.getSourceInfo(waitlist.order_source);
    const label = sourceInfo.label;
    breakdown[label] = (breakdown[label] || 0) + 1;
  });
  
  return breakdown;
}

// Actions for state management
export const waitlistsActions = {
  async loadWaitlists(params = {}) {
    // Prevent multiple concurrent loads
    if (waitlistsState.loading.waitlists) {
      console.log('Waitlists load already in progress, skipping');
      return;
    }
    
    waitlistsState.loading.waitlists = true;
    waitlistsState.errors.waitlists = '';
    
    // Merge with existing filters
    const mergedParams = {
      ...waitlistsState.filters,
      ...params
    };
    
    try {
      const waitlists = await WaitlistService.getWaitlists(mergedParams);
      waitlistsState.waitlists = Array.isArray(waitlists) ? waitlists : [];
      waitlistsState.lastFetch = new Date();
      
      // Update metrics
      waitlistsState.metrics = WaitlistService.calculateMetrics(waitlistsState.waitlists);
      
      console.log(`Loaded ${waitlistsState.waitlists.length} waitlist entries`);
    } catch (error) {
      waitlistsState.errors.waitlists = error.message;
      waitlistsState.waitlists = [];
      console.error('Failed to load waitlists:', error);
    } finally {
      waitlistsState.loading.waitlists = false;
    }
  },

  async loadWaitlist(id) {
    // Prevent multiple concurrent loads
    if (waitlistsState.loading.current) {
      console.log('Waitlist load already in progress, skipping');
      return;
    }
    
    waitlistsState.loading.current = true;
    waitlistsState.errors.current = '';
    
    try {
      const waitlist = await WaitlistService.getWaitlist(id);
      waitlistsState.currentWaitlist = waitlist;
      
      console.log('Loaded waitlist entry:', waitlist.id);
    } catch (error) {
      waitlistsState.errors.current = error.message;
      waitlistsState.currentWaitlist = null;
      console.error('Failed to load waitlist entry:', error);
    } finally {
      waitlistsState.loading.current = false;
    }
  },

  async updateWaitlist(id, updates) {
    try {
      const updatedWaitlist = await WaitlistService.updateWaitlistEntry(id, updates);
      
      // Update current waitlist if it's the one being edited
      if (waitlistsState.currentWaitlist?.id === id) {
        waitlistsState.currentWaitlist = updatedWaitlist;
      }
      
      // Update in waitlists list
      const index = waitlistsState.waitlists.findIndex(w => w.id === id);
      if (index !== -1) {
        waitlistsState.waitlists[index] = updatedWaitlist;
      }
      
      // Recalculate metrics
      waitlistsState.metrics = WaitlistService.calculateMetrics(waitlistsState.waitlists);
      
      return updatedWaitlist;
    } catch (error) {
      waitlistsState.errors.current = error.message;
      throw error;
    }
  },

  async deleteWaitlist(id) {
    try {
      await WaitlistService.deleteWaitlistEntry(id);
      
      // Remove from waitlists list
      waitlistsState.waitlists = waitlistsState.waitlists.filter(w => w.id !== id);
      
      // Clear current waitlist if it was deleted
      if (waitlistsState.currentWaitlist?.id === id) {
        waitlistsState.currentWaitlist = null;
      }
      
      // Recalculate metrics
      waitlistsState.metrics = WaitlistService.calculateMetrics(waitlistsState.waitlists);
      
      return true;
    } catch (error) {
      waitlistsState.errors.waitlists = error.message;
      throw error;
    }
  },

  async authorizeWaitlist(id) {
    return this.updateWaitlist(id, { 
      authorized_at: Math.floor(Date.now() / 1000) 
    });
  },

  async bulkAuthorize(entryIds) {
    waitlistsState.loading.bulk = true;
    waitlistsState.errors.bulk = '';
    
    try {
      const results = await WaitlistService.bulkAuthorizeEntries(entryIds);
      
      // Update local state with results
      results.forEach(updatedEntry => {
        const index = waitlistsState.waitlists.findIndex(w => w.id === updatedEntry.id);
        if (index !== -1) {
          waitlistsState.waitlists[index] = updatedEntry;
        }
      });
      
      // Recalculate metrics
      waitlistsState.metrics = WaitlistService.calculateMetrics(waitlistsState.waitlists);
      
      return results;
    } catch (error) {
      waitlistsState.errors.bulk = error.message;
      throw error;
    } finally {
      waitlistsState.loading.bulk = false;
    }
  },

  async bulkDelete(entryIds) {
    waitlistsState.loading.bulk = true;
    waitlistsState.errors.bulk = '';
    
    try {
      await WaitlistService.bulkDeleteEntries(entryIds);
      
      // Remove from local state
      waitlistsState.waitlists = waitlistsState.waitlists.filter(
        w => !entryIds.includes(w.id)
      );
      
      // Clear current waitlist if it was deleted
      if (waitlistsState.currentWaitlist && entryIds.includes(waitlistsState.currentWaitlist.id)) {
        waitlistsState.currentWaitlist = null;
      }
      
      // Recalculate metrics
      waitlistsState.metrics = WaitlistService.calculateMetrics(waitlistsState.waitlists);
      
      return true;
    } catch (error) {
      waitlistsState.errors.bulk = error.message;
      throw error;
    } finally {
      waitlistsState.loading.bulk = false;
    }
  },

  async searchWaitlists(query) {
    try {
      const results = await WaitlistService.searchWaitlists(query);
      waitlistsState.waitlists = Array.isArray(results) ? results : [];
      waitlistsState.metrics = WaitlistService.calculateMetrics(waitlistsState.waitlists);
      return results;
    } catch (error) {
      waitlistsState.errors.waitlists = error.message;
      throw error;
    }
  },

  // Filter and search management
  setFilter(key, value) {
    waitlistsState.filters[key] = value;
    
    // Auto-reload when filters change (except search - that's manual)
    if (key !== 'search') {
      this.loadWaitlists();
    }
  },

  clearFilters() {
    waitlistsState.filters = {
      status: 'all',
      source: 'all',
      search: '',
      limit: 50,
      offset: 0
    };
    this.loadWaitlists();
  },

  // Clear states
  clearCurrentWaitlist() {
    waitlistsState.currentWaitlist = null;
    waitlistsState.errors.current = '';
  },

  clearErrors() {
    waitlistsState.errors = {
      waitlists: '',
      current: '',
      bulk: ''
    };
  },

  // Retry operations
  retry() {
    if (waitlistsState.errors.waitlists) {
      return this.loadWaitlists(waitlistsState.filters);
    }
    if (waitlistsState.errors.current && waitlistsState.currentWaitlist) {
      return this.loadWaitlist(waitlistsState.currentWaitlist.id);
    }
  }
};