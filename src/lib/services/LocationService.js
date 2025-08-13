/**
 * LocationService - Stateless business logic for location operations
 * Handles all location-related API calls and data transformations
 * 
 * Following the Services + Runes + Context architecture pattern
 * - Pure business logic and API calls
 * - No state management (handled in locations.svelte.js)
 * - Data validation and transformation utilities
 * - Address parsing and formatting functions
 */

export class LocationService {
  /**
   * Get all locations with optional filtering
   */
  static async getLocations(params = {}) {
    const searchParams = new URLSearchParams();
    
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.status && params.status !== 'all') searchParams.set('status', params.status);
    if (params.search) searchParams.set('q', params.search);
    if (params.country) searchParams.set('country', params.country);
    if (params.is_pickup_location !== undefined) searchParams.set('is_pickup_location', params.is_pickup_location.toString());
    if (params.is_fulfillment_center !== undefined) searchParams.set('is_fulfillment_center', params.is_fulfillment_center.toString());
    
    const url = `/api/locations${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch locations: HTTP ${response.status}`);
    }
    
    return await response.json();
  }

  /**
   * Get single location by ID
   */
  static async getLocation(id) {
    const response = await fetch(`/api/locations/${id}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Location not found');
      }
      throw new Error(`Failed to fetch location: HTTP ${response.status}`);
    }
    
    return await response.json();
  }

  /**
   * Create new location
   */
  static async createLocation(locationData) {
    const response = await fetch('/api/locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(locationData)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create location: HTTP ${response.status}`);
    }
    
    return await response.json();
  }

  /**
   * Update existing location
   */
  static async updateLocation(id, updates) {
    const response = await fetch(`/api/locations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update location: HTTP ${response.status} - ${errorText}`);
    }
    
    return await response.json();
  }

  /**
   * Update only the status of a location
   */
  static async updateLocationStatus(id, status) {
    const response = await fetch(`/api/locations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update location status: HTTP ${response.status} - ${errorText}`);
    }
    
    return await response.json();
  }

  /**
   * Delete location
   */
  static async deleteLocation(id) {
    const response = await fetch(`/api/locations/${id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete location: HTTP ${response.status}`);
    }
    
    return true;
  }

  /**
   * Set location as default (only one can be default)
   */
  static async setDefaultLocation(id) {
    const response = await fetch(`/api/locations/${id}/set-default`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to set default location: HTTP ${response.status}`);
    }
    
    return await response.json();
  }

  // =====================================
  // Business Logic Methods
  // =====================================

  /**
   * Format location data for display
   */
  static formatLocation(location) {
    return {
      ...location,
      fullAddress: this.formatFullAddress(location),
      statusInfo: this.getStatusInfo(location.status),
      typeInfo: this.getLocationTypeInfo(location.location_type),
      businessHoursDisplay: this.formatBusinessHours(location.business_hours),
      isOperatingNow: this.isLocationOperatingNow(location.business_hours)
    };
  }

  /**
   * Format full address for display
   */
  static formatFullAddress(location) {
    const parts = [
      location.address_line_1,
      location.address_line_2,
      location.city,
      location.state_province,
      location.postal_code,
      location.country
    ].filter(Boolean);
    
    return parts.join(', ');
  }

  /**
   * Format address for single line display
   */
  static formatSingleLineAddress(location) {
    const parts = [
      location.address_line_1,
      location.city,
      location.state_province,
      location.country
    ].filter(Boolean);
    
    return parts.join(', ');
  }

  /**
   * Parse address string into components
   * Basic implementation - can be enhanced with geocoding services
   */
  static parseAddress(addressString) {
    // Simple address parsing - in production you'd use a proper address parsing service
    const parts = addressString.split(',').map(part => part.trim());
    
    if (parts.length < 2) {
      throw new Error('Please provide a complete address');
    }
    
    return {
      address_line_1: parts[0] || '',
      city: parts[1] || '',
      state_province: parts[2] || '',
      postal_code: parts[3] || '',
      country: parts[4] || 'United States'
    };
  }

  /**
   * Get location status information
   */
  static getStatusInfo(status) {
    const statusMap = {
      'active': { label: 'Active', color: 'success', class: 'status-active' },
      'inactive': { label: 'Inactive', color: 'error', class: 'status-inactive' },
      'temporarily_closed': { label: 'Temporarily Closed', color: 'warning', class: 'status-temp-closed' }
    };
    
    return statusMap[status] || { label: 'Unknown', color: 'default', class: 'status-unknown' };
  }

  /**
   * Get location type information
   */
  static getLocationTypeInfo(type) {
    const typeMap = {
      'store': { label: 'Store', icon: '🏪', description: 'Physical retail location' },
      'warehouse': { label: 'Warehouse', icon: '📦', description: 'Fulfillment center' },
      'pickup_point': { label: 'Pickup Point', icon: '📍', description: 'Customer pickup location' },
      'office': { label: 'Office', icon: '🏢', description: 'Administrative office' }
    };
    
    return typeMap[type] || { label: 'Location', icon: '📍', description: 'General location' };
  }

  /**
   * Format business hours for display
   */
  static formatBusinessHours(businessHours) {
    if (!businessHours || typeof businessHours !== 'object') {
      return 'Hours not specified';
    }
    
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    const formatted = [];
    
    days.forEach((day, index) => {
      const hours = businessHours[day];
      if (hours && !hours.closed) {
        formatted.push(`${dayLabels[index]}: ${hours.open} - ${hours.close}`);
      } else {
        formatted.push(`${dayLabels[index]}: Closed`);
      }
    });
    
    return formatted;
  }

  /**
   * Check if location is currently operating
   */
  static isLocationOperatingNow(businessHours) {
    if (!businessHours || typeof businessHours !== 'object') {
      return false;
    }
    
    const now = new Date();
    const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    
    const todayHours = businessHours[currentDay];
    if (!todayHours || todayHours.closed) {
      return false;
    }
    
    return currentTime >= todayHours.open && currentTime <= todayHours.close;
  }

  /**
   * Validate location data
   */
  static validateLocation(locationData) {
    const errors = [];
    
    if (!locationData.name || locationData.name.trim().length === 0) {
      errors.push('Location name is required');
    }
    
    if (!locationData.address_line_1 || locationData.address_line_1.trim().length === 0) {
      errors.push('Street address is required');
    }
    
    if (!locationData.city || locationData.city.trim().length === 0) {
      errors.push('City is required');
    }
    
    if (!locationData.country || locationData.country.trim().length === 0) {
      errors.push('Country is required');
    }
    
    if (locationData.phone && !/^[\+]?[\d\s\-\(\)\.]+$/.test(locationData.phone)) {
      errors.push('Please enter a valid phone number');
    }
    
    if (locationData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(locationData.email)) {
      errors.push('Please enter a valid email address');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Prepare location data for API submission
   */
  static prepareLocationData(formData) {
    return {
      name: formData.name?.trim() || '',
      description: formData.description?.trim() || '',
      location_type: formData.location_type || 'store',
      address_line_1: formData.address_line_1?.trim() || '',
      address_line_2: formData.address_line_2?.trim() || '',
      city: formData.city?.trim() || '',
      state_province: formData.state_province?.trim() || '',
      postal_code: formData.postal_code?.trim() || '',
      country: formData.country?.trim() || 'United States',
      phone: formData.phone?.trim() || '',
      email: formData.email?.trim() || '',
      status: formData.status || 'active',
      is_default: Boolean(formData.is_default),
      is_pickup_location: Boolean(formData.is_pickup_location),
      is_fulfillment_center: Boolean(formData.is_fulfillment_center),
      business_hours: formData.business_hours || this.getDefaultBusinessHours(),
      metadata: formData.metadata || {}
    };
  }

  /**
   * Prepare location data for partial updates (only include provided fields)
   */
  static preparePartialLocationData(formData) {
    const prepared = {};
    
    if (formData.name !== undefined) prepared.name = formData.name?.trim() || '';
    if (formData.description !== undefined) prepared.description = formData.description?.trim() || '';
    if (formData.location_type !== undefined) prepared.location_type = formData.location_type || 'store';
    if (formData.address_line_1 !== undefined) prepared.address_line_1 = formData.address_line_1?.trim() || '';
    if (formData.address_line_2 !== undefined) prepared.address_line_2 = formData.address_line_2?.trim() || '';
    if (formData.city !== undefined) prepared.city = formData.city?.trim() || '';
    if (formData.state_province !== undefined) prepared.state_province = formData.state_province?.trim() || '';
    if (formData.postal_code !== undefined) prepared.postal_code = formData.postal_code?.trim() || '';
    if (formData.country !== undefined) prepared.country = formData.country?.trim() || 'United States';
    if (formData.phone !== undefined) prepared.phone = formData.phone?.trim() || '';
    if (formData.email !== undefined) prepared.email = formData.email?.trim() || '';
    if (formData.status !== undefined) prepared.status = formData.status || 'active';
    if (formData.is_default !== undefined) prepared.is_default = Boolean(formData.is_default);
    if (formData.is_pickup_location !== undefined) prepared.is_pickup_location = Boolean(formData.is_pickup_location);
    if (formData.is_fulfillment_center !== undefined) prepared.is_fulfillment_center = Boolean(formData.is_fulfillment_center);
    if (formData.business_hours !== undefined) prepared.business_hours = formData.business_hours || this.getDefaultBusinessHours();
    if (formData.metadata !== undefined) prepared.metadata = formData.metadata || {};
    
    return prepared;
  }

  /**
   * Get default business hours
   */
  static getDefaultBusinessHours() {
    return {
      monday: { open: '09:00', close: '18:00', closed: false },
      tuesday: { open: '09:00', close: '18:00', closed: false },
      wednesday: { open: '09:00', close: '18:00', closed: false },
      thursday: { open: '09:00', close: '18:00', closed: false },
      friday: { open: '09:00', close: '18:00', closed: false },
      saturday: { open: '10:00', close: '16:00', closed: false },
      sunday: { open: '12:00', close: '16:00', closed: false }
    };
  }

  /**
   * Calculate metrics from locations array
   */
  static calculateMetrics(locations) {
    if (!Array.isArray(locations)) {
      return {
        total: 0,
        active: 0,
        inactive: 0,
        stores: 0,
        warehouses: 0,
        pickupPoints: 0
      };
    }

    const metrics = locations.reduce((acc, location) => {
      acc.total++;
      
      // Status counts
      if (location.status === 'active') acc.active++;
      else acc.inactive++;
      
      // Type counts
      if (location.location_type === 'store') acc.stores++;
      else if (location.location_type === 'warehouse') acc.warehouses++;
      else if (location.location_type === 'pickup_point') acc.pickupPoints++;
      
      return acc;
    }, {
      total: 0,
      active: 0,
      inactive: 0,
      stores: 0,
      warehouses: 0,
      pickupPoints: 0
    });

    return metrics;
  }

  /**
   * Get countries list for dropdowns
   */
  static getCountriesList() {
    return [
      'United States',
      'Canada',
      'United Kingdom',
      'Australia',
      'Germany',
      'France',
      'Spain',
      'Italy',
      'Netherlands',
      'Sweden',
      'Norway',
      'Denmark',
      'Finland',
      'Japan',
      'South Korea',
      'Singapore',
      'New Zealand'
    ];
  }

  /**
   * Get US states list for dropdowns
   */
  static getUSStatesList() {
    return [
      'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
      'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
      'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana',
      'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
      'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
      'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
      'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
      'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
      'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
      'West Virginia', 'Wisconsin', 'Wyoming'
    ];
  }

  /**
   * Business logic - validate location status
   */
  static isValidStatus(status) {
    const validStatuses = ['active', 'inactive', 'temporarily_closed'];
    return validStatuses.includes(status);
  }

  /**
   * Business logic - validate location type
   */
  static isValidLocationType(type) {
    const validTypes = ['store', 'warehouse', 'pickup_point', 'office'];
    return validTypes.includes(type);
  }

  /**
   * Business logic - filter locations by criteria
   */
  static filterLocations(locations, filters) {
    if (!Array.isArray(locations)) return [];

    return locations.filter(location => {
      const matchesStatus = !filters.status || filters.status === 'all' || location.status === filters.status;
      const matchesSearch = !filters.search || 
        location.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        location.city.toLowerCase().includes(filters.search.toLowerCase()) ||
        location.address_line_1.toLowerCase().includes(filters.search.toLowerCase());
      const matchesCountry = !filters.country || location.country === filters.country;
      const matchesPickup = filters.is_pickup_location === undefined || location.is_pickup_location === filters.is_pickup_location;
      const matchesFulfillment = filters.is_fulfillment_center === undefined || location.is_fulfillment_center === filters.is_fulfillment_center;

      return matchesStatus && matchesSearch && matchesCountry && matchesPickup && matchesFulfillment;
    });
  }

  /**
   * Business logic - sort locations by field
   */
  static sortLocations(locations, sortBy, direction = 'asc') {
    if (!Array.isArray(locations)) return [];

    return [...locations].sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      // Handle special cases
      if (sortBy === 'created_at' || sortBy === 'updated_at') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      return direction === 'desc' ? -comparison : comparison;
    });
  }

  /**
   * Business logic - search locations by query
   */
  static searchLocations(locations, query) {
    if (!Array.isArray(locations) || !query) return locations;

    const searchTerm = query.toLowerCase().trim();
    return locations.filter(location => 
      location.name.toLowerCase().includes(searchTerm) ||
      location.description?.toLowerCase().includes(searchTerm) ||
      location.city.toLowerCase().includes(searchTerm) ||
      location.address_line_1.toLowerCase().includes(searchTerm) ||
      location.country.toLowerCase().includes(searchTerm)
    );
  }
}