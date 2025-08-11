/**
 * TypeScript interfaces for waitlist domain
 */

import type { BaseEntity } from './common.js';

/**
 * Order source enum for different platforms
 */
export type OrderSource = 1 | 2 | 3 | 4; // Instagram, Facebook, Website, TikTok

/**
 * Waitlist entry status
 */
export type WaitlistStatus = 'pending' | 'authorized';

/**
 * Core waitlist entry interface
 */
export interface WaitlistEntry extends BaseEntity {
  // User information
  user_id: string;
  user_name: string;
  user_email: string;

  // Product information  
  product_id: string;
  product_name: string;
  product_price?: number;
  product_images?: Array<{
    id: string;
    url: string;
    alt?: string;
  }>;

  // Waitlist specific data
  position: number;
  order_source: OrderSource;
  authorized_at?: number; // Unix timestamp
  
  // Product variants
  color?: string;
  size?: string;
  
  // Additional metadata
  local_pickup?: boolean;
  inventory_quantity?: number;
  comment_id?: string;
  instagram_comment_id?: string;
}

/**
 * Extended waitlist entry with computed properties
 */
export interface WaitlistEntryFormatted extends WaitlistEntry {
  status: WaitlistStatus;
  sourceInfo: {
    label: string;
    color: string;
  };
  formattedPosition: string;
  isAuthorized: boolean;
}

/**
 * Waitlist filtering options
 */
export interface WaitlistFilters {
  status: 'all' | WaitlistStatus;
  source: 'all' | OrderSource;
  search: string;
  limit: number;
  offset?: number;
}

/**
 * Waitlist metrics and statistics
 */
export interface WaitlistMetrics {
  total: number;
  pending: number;
  authorized: number;
  authorizationRate: number; // Percentage
  sourceCounts: Record<string, number>;
  positionRange: {
    min: number;
    max: number;
  };
}

/**
 * Source information mapping
 */
export interface SourceInfo {
  label: string;
  color: 'blue' | 'purple' | 'green' | 'orange' | 'gray';
}

/**
 * Bulk operation request
 */
export interface BulkWaitlistOperation {
  entry_ids: string[];
  action: 'authorize' | 'delete';
}

/**
 * Waitlist search parameters
 */
export interface WaitlistSearchParams {
  q: string;
  limit?: number;
  filters?: Partial<WaitlistFilters>;
}

/**
 * Waitlist update payload
 */
export interface WaitlistUpdatePayload {
  authorized_at?: number;
  position?: number;
  local_pickup?: boolean;
  comment_id?: string;
  instagram_comment_id?: string;
}

/**
 * Waitlist validation result
 */
export interface WaitlistValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * API response for waitlist operations
 */
export interface WaitlistApiResponse<T = WaitlistEntry> {
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

/**
 * Paginated waitlist response
 */
export interface PaginatedWaitlistResponse {
  data: WaitlistEntry[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Waitlist state interface for reactive state management
 */
export interface WaitlistState {
  // Main data
  waitlists: WaitlistEntry[];
  currentWaitlist: WaitlistEntry | null;
  
  // Loading states
  loading: {
    waitlists: boolean;
    current: boolean;
    bulk: boolean;
  };
  
  // Error states
  errors: {
    waitlists: string;
    current: string;
    bulk: string;
  };
  
  // Filters and search
  filters: WaitlistFilters;
  
  // Metadata
  lastFetch: Date | null;
  metrics: WaitlistMetrics | null;
}

/**
 * Waitlist context state for component-tree management
 */
export interface WaitlistContextState {
  // Selection management
  selectedWaitlists: string[];
  selectAll: boolean;
  
  // Sorting and display
  sortBy: 'created_at' | 'position' | 'user_name' | 'product_name';
  sortDirection: 'asc' | 'desc';
  
  // UI state
  showFilters: boolean;
  showBulkActions: boolean;
  
  // Bulk operations
  bulkActions: {
    processing: boolean;
    action: 'authorize' | 'delete' | null;
  };
}