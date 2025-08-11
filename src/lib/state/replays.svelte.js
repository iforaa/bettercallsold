/**
 * Replays Global State - Svelte 5 Runes
 * Universal reactivity for replays across the entire app
 */

import { browser } from '$app/environment';
import { ReplayService } from '../services/ReplayService.js';
import { VideoPlayerService } from '../services/VideoPlayerService.js';
import { toastService } from '../services/ToastService.js';

// IMPORTANT: Use objects for automatic proxy reactivity
export const replaysState = $state({
  // Replays list state
  replays: [],
  loading: false,
  error: '',
  lastFetch: null,
  
  // Single replay state
  currentReplay: null,
  replayLoading: false,
  replayError: '',
  
  // Pagination state
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    hasNext: false,
    hasPrev: false
  },
  
  // Filtering and sorting
  filters: {
    status: 'all', // 'all', 'live', 'replay'
    search: '',
    startDate: null,
    endDate: null,
    minViewers: null
  },
  
  sorting: {
    sortBy: 'started_at',
    sortDirection: 'desc'
  },
  
  // UI state
  selectedReplays: [],
  selectAll: false,
  viewMode: 'table', // 'table', 'grid'
  
  // Analytics and metrics
  analytics: {
    totalReplays: 0,
    totalViewers: 0,
    totalDuration: 0,
    averageViewers: 0,
    averageDuration: 0,
    liveCount: 0,
    replayCount: 0
  },
  
  // Video player state
  videoPlayer: {
    currentVideoUrl: null,
    isPlaying: false,
    duration: 0,
    currentTime: 0,
    hlsInstance: null
  }
});

// Computed values using functions (not $derived since we're in .svelte.js)
export function getFilteredReplays() {
  if (!replaysState.replays.length) return [];
  
  const filtered = ReplayService.filterReplays(replaysState.replays, replaysState.filters);
  return ReplayService.sortReplays(filtered, replaysState.sorting.sortBy, replaysState.sorting.sortDirection);
}

export function getReplayAnalytics() {
  return ReplayService.calculateReplayAnalytics(replaysState.replays);
}

export function getCurrentReplayDisplay() {
  if (!replaysState.currentReplay) return null;
  return ReplayService.formatReplay(replaysState.currentReplay);
}

export function getSelectedReplaysData() {
  if (!replaysState.selectedReplays.length) return [];
  return replaysState.replays.filter(replay => replaysState.selectedReplays.includes(replay.id));
}

export function hasSelection() {
  return replaysState.selectedReplays.length > 0;
}

export function getSelectionCount() {
  return replaysState.selectedReplays.length;
}

export function isAllSelected() {
  if (!replaysState.replays.length) return false;
  return replaysState.selectedReplays.length === replaysState.replays.length;
}

// Actions for state management
export const replaysActions = {
  // === DATA LOADING ACTIONS ===
  
  async loadReplays(params = {}) {
    // Prevent concurrent loads
    if (replaysState.loading) return;
    
    replaysState.loading = true;
    replaysState.error = '';
    
    try {
      // Merge with current filters and pagination
      const searchParams = {
        page: replaysState.pagination.page,
        limit: replaysState.pagination.limit,
        ...replaysState.filters,
        ...params
      };
      
      const result = await ReplayService.getReplays(searchParams);
      
      replaysState.replays = ReplayService.formatReplays(result.replays);
      replaysState.pagination = {
        ...replaysState.pagination,
        ...result.pagination
      };
      replaysState.analytics = ReplayService.calculateReplayAnalytics(replaysState.replays);
      replaysState.lastFetch = new Date();
      
      // Clear selection when loading new data
      replaysState.selectedReplays = [];
      replaysState.selectAll = false;
      
    } catch (error) {
      replaysState.error = error.message;
      console.error('Failed to load replays:', error);
      toastService.error(`Failed to load replays: ${error.message}`);
    } finally {
      replaysState.loading = false;
    }
  },

  async loadReplay(id) {
    if (!id) return;
    
    // Prevent concurrent loads
    if (replaysState.replayLoading) return;
    
    replaysState.replayLoading = true;
    replaysState.replayError = '';
    
    try {
      const replay = await ReplayService.getReplay(id);
      replaysState.currentReplay = ReplayService.formatReplay(replay);
    } catch (error) {
      replaysState.replayError = error.message;
      console.error('Failed to load replay:', error);
      toastService.error(`Failed to load replay: ${error.message}`);
    } finally {
      replaysState.replayLoading = false;
    }
  },

  async searchReplays(query) {
    replaysState.filters.search = query;
    replaysState.pagination.page = 1; // Reset to first page
    await this.loadReplays();
  },

  async syncReplays() {
    try {
      toastService.info('Starting replay sync...');
      const result = await ReplayService.syncReplays();
      toastService.success('Replays synced successfully!');
      
      // Reload replays to show new data
      await this.loadReplays();
      
      return result;
    } catch (error) {
      console.error('Failed to sync replays:', error);
      toastService.error(`Failed to sync replays: ${error.message}`);
      throw error;
    }
  },

  // === FILTERING AND SORTING ACTIONS ===
  
  setFilter(key, value) {
    replaysState.filters[key] = value;
    replaysState.pagination.page = 1; // Reset to first page when filtering
  },

  clearFilters() {
    replaysState.filters = {
      status: 'all',
      search: '',
      startDate: null,
      endDate: null,
      minViewers: null
    };
    replaysState.pagination.page = 1;
  },

  setSorting(sortBy, sortDirection = 'desc') {
    replaysState.sorting.sortBy = sortBy;
    replaysState.sorting.sortDirection = sortDirection;
  },

  // === PAGINATION ACTIONS ===
  
  async goToPage(page) {
    replaysState.pagination.page = page;
    await this.loadReplays();
  },

  async nextPage() {
    if (replaysState.pagination.hasNext) {
      await this.goToPage(replaysState.pagination.page + 1);
    }
  },

  async previousPage() {
    if (replaysState.pagination.hasPrev) {
      await this.goToPage(replaysState.pagination.page - 1);
    }
  },

  setPageSize(limit) {
    replaysState.pagination.limit = limit;
    replaysState.pagination.page = 1; // Reset to first page
  },

  // === SELECTION ACTIONS ===
  
  selectReplay(id) {
    const index = replaysState.selectedReplays.indexOf(id);
    if (index > -1) {
      replaysState.selectedReplays.splice(index, 1);
    } else {
      replaysState.selectedReplays.push(id);
    }
    
    // Update selectAll state
    replaysState.selectAll = replaysState.selectedReplays.length === replaysState.replays.length;
  },

  selectAllReplays() {
    if (replaysState.selectAll) {
      replaysState.selectedReplays = replaysState.replays.map(r => r.id);
    } else {
      replaysState.selectedReplays = [];
    }
  },

  clearSelection() {
    replaysState.selectedReplays = [];
    replaysState.selectAll = false;
  },

  // === VIDEO PLAYER ACTIONS ===
  
  initializeVideoPlayer(videoElement, replay) {
    if (!browser || !videoElement || !replay) return null;
    
    // Clean up existing player
    if (replaysState.videoPlayer.hlsInstance) {
      VideoPlayerService.destroyHLSPlayer(replaysState.videoPlayer.hlsInstance);
      replaysState.videoPlayer.hlsInstance = null;
    }
    
    const videoUrl = VideoPlayerService.getVideoUrl(replay);
    if (!videoUrl) {
      console.warn('No video URL available for replay:', replay.id);
      return null;
    }
    
    replaysState.videoPlayer.currentVideoUrl = videoUrl;
    
    // Initialize HLS player
    const hlsInstance = VideoPlayerService.initializeHLSPlayer(videoElement, videoUrl);
    replaysState.videoPlayer.hlsInstance = hlsInstance;
    
    return hlsInstance;
  },

  destroyVideoPlayer() {
    if (replaysState.videoPlayer.hlsInstance) {
      VideoPlayerService.destroyHLSPlayer(replaysState.videoPlayer.hlsInstance);
    }
    
    // Reset individual properties instead of replacing the entire object
    replaysState.videoPlayer.currentVideoUrl = null;
    replaysState.videoPlayer.isPlaying = false;
    replaysState.videoPlayer.duration = 0;
    replaysState.videoPlayer.currentTime = 0;
    replaysState.videoPlayer.hlsInstance = null;
  },

  // === UI STATE ACTIONS ===
  
  setViewMode(mode) {
    replaysState.viewMode = mode;
  },

  // === UTILITY ACTIONS ===
  
  clearCurrentReplay() {
    replaysState.currentReplay = null;
    replaysState.replayError = '';
    replaysState.replayLoading = false; // Also reset loading state
    this.destroyVideoPlayer();
  },

  retry() {
    if (replaysState.error) {
      return this.loadReplays();
    }
    if (replaysState.replayError && replaysState.currentReplay) {
      return this.loadReplay(replaysState.currentReplay.id);
    }
  },

  refresh() {
    replaysState.lastFetch = null; // Force refresh
    return this.loadReplays();
  },

  // === BULK ACTIONS ===
  
  async performBulkAction(action) {
    if (!replaysState.selectedReplays.length) return;
    
    try {
      switch (action) {
        case 'delete':
          // TODO: Implement bulk delete API
          toastService.info('Bulk delete functionality not implemented yet');
          break;
        case 'export':
          // TODO: Implement bulk export
          toastService.info('Bulk export functionality not implemented yet');
          break;
        default:
          toastService.warning('Unknown bulk action');
      }
    } catch (error) {
      console.error('Bulk action failed:', error);
      toastService.error(`Bulk action failed: ${error.message}`);
    }
  }
};

// Note: Initialization is handled by individual pages to prevent conflicts