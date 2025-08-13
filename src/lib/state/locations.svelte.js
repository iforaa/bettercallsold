/**
 * Global Locations State - Svelte 5 Runes
 * Universal reactivity for location management across the entire app
 * 
 * Following the Services + Runes + Context architecture pattern
 */

import { LocationService } from '../services/LocationService.js';

// IMPORTANT: Use objects for automatic proxy reactivity
export const locationsState = $state({
  // Locations list state
  locations: [],
  loading: false,
  error: '',
  lastFetch: null,
  
  // Single location state
  currentLocation: null,
  locationLoading: false,
  locationError: '',
  
  // Operation loading states
  operationLoading: {
    creating: false,
    updating: false,
    deleting: false,
    settingDefault: false
  },
  
  // Operation error states
  operationErrors: {
    creating: '',
    updating: '',
    deleting: '',
    settingDefault: ''
  },
  
  // UI state
  filters: {
    status: 'all',
    search: '',
    country: '',
    is_pickup_location: undefined,
    is_fulfillment_center: undefined,
    limit: 50
  },
  
  // Form state
  form: {
    showModal: false,
    isEditing: false,
    editingId: null
  }
});

// Computed values as functions (can't export $derived from modules)
export function getFilteredLocations() {
  if (!locationsState.locations) return [];
  
  return locationsState.locations.filter(location => {
    const matchesStatus = locationsState.filters.status === 'all' || 
                         !locationsState.filters.status ||
                         location.status === locationsState.filters.status;
    
    const matchesSearch = !locationsState.filters.search ||
                         location.name.toLowerCase().includes(locationsState.filters.search.toLowerCase()) ||
                         location.description?.toLowerCase().includes(locationsState.filters.search.toLowerCase());
    
    const matchesPickup = locationsState.filters.is_pickup_location === undefined ||
                         location.is_pickup_location === locationsState.filters.is_pickup_location;
    
    const matchesFulfillment = locationsState.filters.is_fulfillment_center === undefined ||
                              location.is_fulfillment_center === locationsState.filters.is_fulfillment_center;
    
    return matchesStatus && matchesSearch && matchesPickup && matchesFulfillment;
  });
}

export function getLocationMetrics() {
  if (!locationsState.locations) return {
    total: 0,
    active: 0,
    inactive: 0,
    stores: 0,
    warehouses: 0,
    pickupPoints: 0,
    fulfillmentCenters: 0,
    pickupLocations: 0,
    defaultLocation: null
  };
  
  const locations = locationsState.locations;
  const total = locations.length;
  const active = locations.filter(loc => loc.status === 'active').length;
  const inactive = locations.filter(loc => loc.status === 'inactive').length;
  const stores = locations.filter(loc => loc.location_type === 'store').length;
  const warehouses = locations.filter(loc => loc.location_type === 'warehouse').length;
  const pickupPoints = locations.filter(loc => loc.location_type === 'pickup_point').length;
  const fulfillmentCenters = locations.filter(loc => loc.is_fulfillment_center).length;
  const pickupLocations = locations.filter(loc => loc.is_pickup_location).length;
  const defaultLocation = locations.find(loc => loc.is_default) || null;
  
  return {
    total,
    active,
    inactive,
    stores,
    warehouses,
    pickupPoints,
    fulfillmentCenters,
    pickupLocations,
    defaultLocation
  };
}

export function getFormattedLocations() {
  if (!locationsState.locations) return [];
  
  return locationsState.locations.map(location => ({
    ...location,
    fullAddress: LocationService.formatSingleLineAddress(location),
    statusInfo: LocationService.getStatusInfo(location.status),
    typeInfo: LocationService.getLocationTypeInfo(location.location_type),
    capabilities: getLocationCapabilities(location)
  }));
}

function getLocationCapabilities(location) {
  const capabilities = [];
  if (location.is_pickup_location) capabilities.push('Pickup');
  if (location.is_fulfillment_center) capabilities.push('Fulfillment');
  if (location.is_default) capabilities.push('Default');
  return capabilities;
}

// Actions for state management
export const locationsActions = {
  async loadLocations(params) {
    // Prevent concurrent loads
    if (locationsState.loading) return;
    
    locationsState.loading = true;
    locationsState.error = '';
    
    try {
      const locations = await LocationService.getLocations(params || locationsState.filters);
      locationsState.locations = locations;
      locationsState.lastFetch = new Date();
    } catch (error) {
      locationsState.error = error.message;
      console.error('Failed to load locations:', error);
    } finally {
      locationsState.loading = false;
    }
  },

  async loadLocation(id) {
    locationsState.locationLoading = true;
    locationsState.locationError = '';
    
    try {
      const location = await LocationService.getLocation(id);
      locationsState.currentLocation = location;
    } catch (error) {
      locationsState.locationError = error.message;
      console.error('Failed to load location:', error);
    } finally {
      locationsState.locationLoading = false;
    }
  },

  async createLocation(data) {
    locationsState.operationLoading.creating = true;
    locationsState.operationErrors.creating = '';
    
    try {
      const preparedData = LocationService.prepareLocationData(data);
      const newLocation = await LocationService.createLocation(preparedData);
      
      // Add to local state
      locationsState.locations.push(newLocation);
      
      // Hide modal on success
      locationsState.form.showModal = false;
      
      return newLocation;
    } catch (error) {
      locationsState.operationErrors.creating = error.message;
      console.error('Failed to create location:', error);
      throw error;
    } finally {
      locationsState.operationLoading.creating = false;
    }
  },

  async updateLocation(id, updates) {
    locationsState.operationLoading.updating = true;
    locationsState.operationErrors.updating = '';
    
    try {
      // For partial updates (like status changes), send data as-is
      // For full form updates, prepare the data
      const isPartialUpdate = Object.keys(updates).length < 5; // Heuristic for partial vs full update
      const preparedUpdates = isPartialUpdate ? updates : LocationService.prepareLocationData(updates);
      const updatedLocation = await LocationService.updateLocation(id, preparedUpdates);
      
      // Update current location if it's the one being edited
      if (locationsState.currentLocation?.id === id) {
        locationsState.currentLocation = updatedLocation;
      }
      
      // Update in locations list
      const index = locationsState.locations.findIndex(location => location.id === id);
      if (index !== -1) {
        locationsState.locations[index] = updatedLocation;
      }
      
      // Hide modal on success
      locationsState.form.showModal = false;
      locationsState.form.isEditing = false;
      locationsState.form.editingId = null;
      
      return updatedLocation;
    } catch (error) {
      locationsState.operationErrors.updating = error.message;
      console.error('Failed to update location:', error);
      throw error;
    } finally {
      locationsState.operationLoading.updating = false;
    }
  },

  async deleteLocation(id) {
    locationsState.operationLoading.deleting = true;
    locationsState.operationErrors.deleting = '';
    
    try {
      await LocationService.deleteLocation(id);
      
      // Remove from local state
      locationsState.locations = locationsState.locations.filter(location => location.id !== id);
      
      // Clear current location if it was the deleted one
      if (locationsState.currentLocation?.id === id) {
        locationsState.currentLocation = null;
      }
      
      return true;
    } catch (error) {
      locationsState.operationErrors.deleting = error.message;
      console.error('Failed to delete location:', error);
      throw error;
    } finally {
      locationsState.operationLoading.deleting = false;
    }
  },

  async setDefaultLocation(id) {
    locationsState.operationLoading.settingDefault = true;
    locationsState.operationErrors.settingDefault = '';
    
    try {
      const updatedLocation = await LocationService.setDefaultLocation(id);
      
      // Update all locations - remove default from others and set for this one
      locationsState.locations = locationsState.locations.map(location => ({
        ...location,
        is_default: location.id === id
      }));
      
      // Update current location if it's the one being set as default
      if (locationsState.currentLocation?.id === id) {
        locationsState.currentLocation = { ...locationsState.currentLocation, is_default: true };
      }
      
      return updatedLocation;
    } catch (error) {
      locationsState.operationErrors.settingDefault = error.message;
      console.error('Failed to set default location:', error);
      throw error;
    } finally {
      locationsState.operationLoading.settingDefault = false;
    }
  },

  // Filter management
  setFilter(key, value) {
    locationsState.filters[key] = value;
  },

  clearFilters() {
    locationsState.filters = {
      status: 'all',
      search: '',
      country: '',
      is_pickup_location: undefined,
      is_fulfillment_center: undefined,
      limit: 50
    };
  },

  // Modal management
  showModal() {
    locationsState.form.showModal = true;
    locationsState.form.isEditing = false;
    locationsState.form.editingId = null;
    this.clearOperationErrors();
  },

  hideModal() {
    locationsState.form.showModal = false;
    locationsState.form.isEditing = false;
    locationsState.form.editingId = null;
    this.clearOperationErrors();
  },

  startEdit(id) {
    locationsState.form.showModal = true;
    locationsState.form.isEditing = true;
    locationsState.form.editingId = id;
    this.clearOperationErrors();
  },

  cancelEdit() {
    locationsState.form.showModal = false;
    locationsState.form.isEditing = false;
    locationsState.form.editingId = null;
    this.clearOperationErrors();
  },

  // Utility actions
  clearCurrentLocation() {
    locationsState.currentLocation = null;
    locationsState.locationError = '';
  },

  clearOperationErrors() {
    locationsState.operationErrors = {
      creating: '',
      updating: '',
      deleting: '',
      settingDefault: ''
    };
  },

  clearAllErrors() {
    locationsState.error = '';
    locationsState.locationError = '';
    this.clearOperationErrors();
  },

  retry() {
    if (locationsState.error) {
      return this.loadLocations();
    }
    if (locationsState.locationError && locationsState.currentLocation) {
      return this.loadLocation(locationsState.currentLocation.id);
    }
  }
};