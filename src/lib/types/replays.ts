/**
 * Replays Domain TypeScript Interfaces
 * Complete type definitions for replay system
 */

import type { BaseEntity, PaginatedResponse } from './common';

// === CORE REPLAY INTERFACES ===

export interface Replay extends BaseEntity {
  external_id: string;
  name?: string;
  title?: string;
  description?: string;
  label?: string;
  status: string;
  is_live: boolean;
  is_wide_cell: boolean;
  
  // Timing information
  started_at?: string;
  ended_at?: string;
  started_at_formatted?: string;
  ended_at_formatted?: string;
  duration?: number; // in minutes
  
  // Media URLs
  source_url?: string;
  source_thumb?: string;
  animated_thumb?: string;
  
  // Statistics
  peak_viewers?: number;
  product_count?: number;
  products?: ReplayProduct[];
  
  // Metadata
  metadata?: Record<string, any>;
}

export interface ReplayFormatted extends Replay {
  // Computed display properties
  formattedDuration: string;
  formattedViewers: string;
  statusInfo: StatusInfo;
  displayName: string;
  displayThumbnail?: string;
  productsCount: number;
}

export interface ReplayProduct {
  id: string;
  product_name: string;
  brand?: string;
  price?: number;
  price_label?: string;
  quantity?: number;
  thumbnail?: string;
  badge_label?: string;
  shown_at?: string;
  shown_at_formatted?: string;
}

// === STATUS AND METADATA INTERFACES ===

export interface StatusInfo {
  text: string;
  class: string;
  color: string;
}

export interface VideoMetadata {
  hasVideo: boolean;
  hasThumbnail: boolean;
  primaryUrl?: string;
  allSources: VideoSource[];
  posterImage?: string;
  isHLS: boolean;
  isMP4: boolean;
  displayName: string;
}

export interface VideoSource {
  src: string;
  type: string;
}

// === STATE INTERFACES ===

export interface ReplaysState {
  // Data state
  replays: Replay[];
  loading: boolean;
  error: string;
  lastFetch: Date | null;
  
  // Single replay state
  currentReplay: Replay | null;
  replayLoading: boolean;
  replayError: string;
  
  // Pagination state
  pagination: PaginationState;
  
  // Filtering and sorting
  filters: ReplayFilters;
  sorting: SortingState;
  
  // UI state
  selectedReplays: string[];
  selectAll: boolean;
  viewMode: 'table' | 'grid';
  
  // Analytics
  analytics: ReplayAnalytics;
  
  // Video player state
  videoPlayer: VideoPlayerState;
}

export interface PaginationState {
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ReplayFilters {
  status: 'all' | 'live' | 'replay';
  search: string;
  startDate: string | null;
  endDate: string | null;
  minViewers: number | null;
}

export interface SortingState {
  sortBy: ReplaySortField;
  sortDirection: 'asc' | 'desc';
}

export type ReplaySortField = 
  | 'name'
  | 'started_at'
  | 'duration'
  | 'peak_viewers'
  | 'product_count'
  | 'priority';

export interface VideoPlayerState {
  currentVideoUrl: string | null;
  isPlaying: boolean;
  duration: number;
  currentTime: number;
  hlsInstance: any;
}

// === ANALYTICS INTERFACES ===

export interface ReplayAnalytics {
  totalReplays: number;
  totalViewers: number;
  totalDuration: number;
  averageViewers: number;
  averageDuration: number;
  formattedTotalDuration?: string;
  formattedAverageDuration?: string;
  liveCount: number;
  replayCount: number;
}

// === API INTERFACES ===

export interface ReplaysResponse {
  replays: Replay[];
  pagination: PaginationState | null;
  total: number;
}

export interface ReplayMetricsResponse {
  totalReplays: number;
  totalViewers: number;
  totalDuration: number;
  averageViewers: number;
  averageDuration: number;
  liveCount: number;
  replayCount: number;
}

export interface SyncReplaysResponse {
  success: boolean;
  synced: number;
  errors: string[];
  message: string;
}

// === COMPONENT PROP INTERFACES ===

export interface ReplayCardProps {
  replay: Replay;
  selected?: boolean;
  onSelect?: (id: string) => void;
  onClick?: (replay: Replay) => void;
  showThumbnail?: boolean;
  showMetrics?: boolean;
}

export interface ReplayTableProps {
  replays: Replay[];
  selectedReplays?: string[];
  selectAll?: boolean;
  loading?: boolean;
  onSelectReplay?: (id: string) => void;
  onSelectAll?: () => void;
  onReplayClick?: (replay: Replay) => void;
  onSort?: (field: ReplaySortField, direction: 'asc' | 'desc') => void;
  sortBy?: ReplaySortField;
  sortDirection?: 'asc' | 'desc';
}

export interface VideoPlayerProps {
  replay: Replay;
  autoplay?: boolean;
  muted?: boolean;
  controls?: boolean;
  poster?: string;
  className?: string;
  onLoad?: () => void;
  onError?: (error: string) => void;
  onPlay?: () => void;
  onPause?: () => void;
}

export interface ReplayMetricsProps {
  replay?: Replay;
  analytics?: ReplayAnalytics;
  showDetailed?: boolean;
  className?: string;
}

export interface ProductGridProps {
  products: ReplayProduct[];
  maxItems?: number;
  showMore?: boolean;
  onProductClick?: (product: ReplayProduct) => void;
  className?: string;
}

export interface ReplayFiltersProps {
  filters: ReplayFilters;
  onFilterChange: (key: keyof ReplayFilters, value: any) => void;
  onClearFilters: () => void;
  loading?: boolean;
}

export interface PaginationControlsProps {
  pagination: PaginationState;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  loading?: boolean;
}

// === VALIDATION INTERFACES ===

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface ReplayValidation extends ValidationResult {
  fieldErrors?: Record<string, string>;
}

// === SEARCH AND FILTER INTERFACES ===

export interface SearchOptions {
  query: string;
  filters?: Partial<ReplayFilters>;
  sortBy?: ReplaySortField;
  sortDirection?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface FilterOptions {
  status?: 'all' | 'live' | 'replay';
  dateRange?: {
    start: string;
    end: string;
  };
  viewerRange?: {
    min: number;
    max?: number;
  };
  durationRange?: {
    min: number; // minutes
    max?: number; // minutes
  };
}

// === BULK ACTIONS INTERFACES ===

export interface BulkActionOptions {
  action: 'delete' | 'export' | 'archive' | 'unarchive';
  replayIds: string[];
  options?: Record<string, any>;
}

export interface BulkActionResult {
  success: boolean;
  processed: number;
  failed: number;
  errors: string[];
  message: string;
}

// === VIDEO PLAYER SERVICE INTERFACES ===

export interface HLSOptions {
  enableWorker?: boolean;
  lowLatencyMode?: boolean;
  backBufferLength?: number;
  maxBufferLength?: number;
  maxMaxBufferLength?: number;
}

export interface VideoPlayerOptions extends HLSOptions {
  autoplay?: boolean;
  muted?: boolean;
  controls?: boolean;
  preload?: 'none' | 'metadata' | 'auto';
  crossOrigin?: 'anonymous' | 'use-credentials' | '';
}

export interface HLSError {
  type: string;
  details: string;
  fatal: boolean;
  url?: string;
  response?: {
    code: number;
    text: string;
  };
}

// === CONTEXT INTERFACES ===

export interface ReplaysContextState {
  selectedReplays: string[];
  sortBy: ReplaySortField;
  sortDirection: 'asc' | 'desc';
  viewMode: 'table' | 'grid';
  showFilters: boolean;
  bulkActions: {
    processing: boolean;
    selected: string;
  };
}

export interface ReplaysContextActions {
  selectReplay: (id: string) => void;
  selectAllReplays: (replayIds: string[]) => void;
  clearSelection: () => void;
  setSorting: (field: ReplaySortField, direction: 'asc' | 'desc') => void;
  toggleFilters: () => void;
  setViewMode: (mode: 'table' | 'grid') => void;
  performBulkAction: (action: string) => Promise<void>;
}

export interface ReplaysContextDerived {
  hasSelection: boolean;
  selectionCount: number;
  allSelected: boolean;
}

export interface ReplaysContext {
  state: ReplaysContextState;
  actions: ReplaysContextActions;
  derived: ReplaysContextDerived;
}

// === UTILITY TYPE ALIASES ===

export type ReplayStatus = 'live' | 'replay' | 'archived';
export type ViewMode = 'table' | 'grid';
export type SortDirection = 'asc' | 'desc';
export type VideoQuality = 'low' | 'medium' | 'high' | 'auto';

// === EXPORT HELPERS ===

export interface ExportOptions {
  format: 'csv' | 'json' | 'xlsx';
  fields?: (keyof Replay)[];
  includeProducts?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface ExportResult {
  success: boolean;
  downloadUrl?: string;
  filename?: string;
  error?: string;
}