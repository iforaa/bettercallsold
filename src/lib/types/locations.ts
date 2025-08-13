/**
 * Location-related type definitions
 */

import type { BaseEntity, ApiResponse } from './common';

export type LocationStatus = 'active' | 'inactive' | 'temporarily_closed';
export type LocationType = 'store' | 'warehouse' | 'pickup_point' | 'office';

export interface BusinessHours {
  monday: { open: string; close: string; closed: boolean };
  tuesday: { open: string; close: string; closed: boolean };
  wednesday: { open: string; close: string; closed: boolean };
  thursday: { open: string; close: string; closed: boolean };
  friday: { open: string; close: string; closed: boolean };
  saturday: { open: string; close: string; closed: boolean };
  sunday: { open: string; close: string; closed: boolean };
}

export interface Location extends BaseEntity {
  name: string;
  description?: string;
  location_type: LocationType;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state_province?: string;
  postal_code?: string;
  country: string;
  phone?: string;
  email?: string;
  status: LocationStatus;
  is_default: boolean;
  is_pickup_location: boolean;
  is_fulfillment_center: boolean;
  business_hours: BusinessHours;
  metadata: Record<string, any>;
}

export interface LocationFormatted extends Location {
  fullAddress: string;
  statusInfo: StatusInfo;
  typeInfo: TypeInfo;
  capabilities: string[];
}

export interface StatusInfo {
  label: string;
  color: 'success' | 'warning' | 'error' | 'default';
  class: string;
}

export interface TypeInfo {
  label: string;
  description: string;
  icon: string;
}

export interface LocationFormData {
  name: string;
  description?: string;
  location_type: LocationType;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state_province?: string;
  postal_code?: string;
  country: string;
  phone?: string;
  email?: string;
  status: LocationStatus;
  is_default: boolean;
  is_pickup_location: boolean;
  is_fulfillment_center: boolean;
  business_hours?: BusinessHours;
  metadata?: Record<string, any>;
}

export interface LocationFilters {
  status?: LocationStatus | 'all';
  search?: string;
  country?: string;
  is_pickup_location?: boolean;
  is_fulfillment_center?: boolean;
  limit?: number;
}

export interface LocationMetrics {
  total: number;
  active: number;
  inactive: number;
  stores: number;
  warehouses: number;
  pickupPoints: number;
  fulfillmentCenters: number;
  pickupLocations: number;
  defaultLocation?: Location;
}

export interface LocationsState {
  // Data state
  locations: Location[];
  currentLocation: Location | null;
  
  // Loading states
  loading: {
    locations: boolean;
    creating: boolean;
    updating: boolean;
    deleting: boolean;
    settingDefault: boolean;
  };
  
  // Error states
  errors: {
    locations: string;
    creating: string;
    updating: string;
    deleting: string;
    settingDefault: string;
  };
  
  // UI state
  filters: LocationFilters;
  lastFetch: Date | null;
  
  // Form state
  form: {
    showModal: boolean;
    isEditing: boolean;
    editingId: string | null;
  };
}

export interface LocationsActions {
  // Data actions
  loadLocations: (params?: LocationFilters) => Promise<void>;
  loadLocation: (id: string) => Promise<void>;
  createLocation: (data: LocationFormData) => Promise<Location>;
  updateLocation: (id: string, data: Partial<LocationFormData>) => Promise<Location>;
  deleteLocation: (id: string) => Promise<void>;
  setDefaultLocation: (id: string) => Promise<Location>;
  
  // Filter actions
  setFilter: (key: keyof LocationFilters, value: any) => void;
  clearFilters: () => void;
  
  // UI actions
  showModal: () => void;
  hideModal: () => void;
  startEdit: (id: string) => void;
  cancelEdit: () => void;
  
  // Utility actions
  retry: () => Promise<void>;
  clearCurrentLocation: () => void;
  clearErrors: () => void;
}

export interface LocationsComputedValues {
  filteredLocations: LocationFormatted[];
  locationMetrics: LocationMetrics;
  hasLocations: boolean;
  defaultLocation: Location | null;
  canCreateLocation: boolean;
}

// Context types for component-tree state
export interface LocationsContextState {
  selectedLocations: string[];
  sortBy: keyof Location;
  sortDirection: 'asc' | 'desc';
  showFilters: boolean;
  viewMode: 'list' | 'grid';
  bulkActions: {
    processing: boolean;
    selectedAction: string;
  };
}

export interface LocationsContextActions {
  // Selection management
  selectLocation: (id: string) => void;
  selectAllLocations: (ids: string[]) => void;
  clearSelection: () => void;
  
  // Sorting
  setSorting: (field: keyof Location, direction?: 'asc' | 'desc') => void;
  
  // UI state
  toggleFilters: () => void;
  setViewMode: (mode: 'list' | 'grid') => void;
  
  // Bulk actions
  performBulkAction: (action: string) => Promise<void>;
}

export interface LocationsContextValue {
  state: LocationsContextState;
  actions: LocationsContextActions;
  derived: {
    hasSelection: boolean;
    selectionCount: number;
    isAllSelected: boolean;
    canPerformBulkActions: boolean;
  };
}

// Component Props types
export interface LocationCardProps {
  location: LocationFormatted;
  selected?: boolean;
  selectable?: boolean;
  onSelect?: (id: string) => void;
  onEdit?: (location: Location) => void;
  onToggleStatus?: (location: Location) => void;
  onSetDefault?: (location: Location) => void;
  compact?: boolean;
  showActions?: boolean;
}

export interface LocationMetricsProps {
  metrics: LocationMetrics;
  loading?: boolean;
  showDetails?: boolean;
  onFilterChange?: (filter: Partial<LocationFilters>) => void;
}

export interface AddLocationModalProps {
  isOpen: boolean;
  editingLocation?: Location | null;
  onClose: () => void;
  onSave: (data: LocationFormData) => Promise<void>;
  loading?: boolean;
}

// Validation types
export interface LocationValidationResult {
  isValid: boolean;
  errors: string[];
  fieldErrors: Record<keyof LocationFormData, string>;
}

// API Response types
export type LocationsApiResponse = ApiResponse<Location[]>;
export type LocationApiResponse = ApiResponse<Location>;