/**
 * ReplayService - Replay business logic and API management
 * Handles all replay-related data operations and business rules
 */

export class ReplayService {
  /**
   * Get replays list with pagination and filtering
   */
  static async getReplays(params = {}) {
    const searchParams = new URLSearchParams();
    
    // Add pagination parameters
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());
    
    // Add filtering parameters
    if (params.status) searchParams.set('status', params.status);
    if (params.search) searchParams.set('search', params.search);
    
    const url = `/api/replays${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Ensure consistent response format
      return {
        replays: result.replays || [],
        pagination: result.pagination || null,
        total: result.total || 0
      };
    } catch (error) {
      console.error('ReplayService.getReplays failed:', error);
      throw new Error(`Failed to fetch replays: ${error.message}`);
    }
  }

  /**
   * Get single replay by ID
   */
  static async getReplay(id) {
    if (!id) {
      throw new Error('Replay ID is required');
    }

    try {
      const response = await fetch(`/api/replays/${id}`);
      
      if (response.status === 404) {
        throw new Error('Replay not found');
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('ReplayService.getReplay failed:', error);
      throw error; // Re-throw to preserve specific error messages
    }
  }

  /**
   * Search replays
   */
  static async searchReplays(query, filters = {}) {
    const params = {
      search: query,
      ...filters
    };
    
    return await this.getReplays(params);
  }

  /**
   * Get replay metrics and analytics
   */
  static async getReplayMetrics() {
    try {
      const response = await fetch('/api/replays/metrics');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('ReplayService.getReplayMetrics failed:', error);
      throw new Error(`Failed to fetch replay metrics: ${error.message}`);
    }
  }

  /**
   * Sync replays from CommentSold
   */
  static async syncReplays() {
    try {
      const response = await fetch('/api/replays/sync', {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('ReplayService.syncReplays failed:', error);
      throw new Error(`Failed to sync replays: ${error.message}`);
    }
  }

  // === BUSINESS LOGIC METHODS ===

  /**
   * Format duration from minutes to human readable
   */
  static formatDuration(minutes) {
    if (!minutes || minutes <= 0) return 'Unknown';
    if (minutes < 60) return `${minutes}m`;
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }

  /**
   * Format viewer count with abbreviations
   */
  static formatViewers(viewers) {
    if (!viewers || viewers <= 0) return '0';
    if (viewers >= 1000000) {
      return `${(viewers / 1000000).toFixed(1)}M`;
    }
    if (viewers >= 1000) {
      return `${(viewers / 1000).toFixed(1)}k`;
    }
    return viewers.toString();
  }

  /**
   * Get status badge information
   */
  static getStatusInfo(replay) {
    if (replay.is_live) {
      return { text: 'Live', class: 'error', color: 'error' };
    }
    return { text: 'Replay', class: 'success', color: 'success' };
  }

  /**
   * Format replay for display (add computed properties)
   */
  static formatReplay(replay) {
    if (!replay) return null;

    const statusInfo = this.getStatusInfo(replay);
    
    return {
      ...replay,
      // Computed display properties
      formattedDuration: this.formatDuration(replay.duration),
      formattedViewers: this.formatViewers(replay.peak_viewers),
      statusInfo,
      displayName: replay.name || replay.title || `Replay ${replay.external_id}`,
      displayThumbnail: replay.source_thumb || replay.animated_thumb,
      productsCount: replay.products?.length || replay.product_count || 0
    };
  }

  /**
   * Format replays list for display
   */
  static formatReplays(replays) {
    if (!Array.isArray(replays)) return [];
    return replays.map(replay => this.formatReplay(replay));
  }

  /**
   * Calculate replay analytics
   */
  static calculateReplayAnalytics(replays) {
    if (!Array.isArray(replays) || replays.length === 0) {
      return {
        totalReplays: 0,
        totalViewers: 0,
        totalDuration: 0,
        averageViewers: 0,
        averageDuration: 0,
        liveCount: 0,
        replayCount: 0
      };
    }

    const totalViewers = replays.reduce((sum, replay) => sum + (replay.peak_viewers || 0), 0);
    const totalDuration = replays.reduce((sum, replay) => sum + (replay.duration || 0), 0);
    const liveCount = replays.filter(replay => replay.is_live).length;
    const replayCount = replays.length - liveCount;

    return {
      totalReplays: replays.length,
      totalViewers,
      totalDuration,
      averageViewers: Math.round(totalViewers / replays.length),
      averageDuration: Math.round(totalDuration / replays.length),
      formattedTotalDuration: this.formatDuration(totalDuration),
      formattedAverageDuration: this.formatDuration(Math.round(totalDuration / replays.length)),
      liveCount,
      replayCount
    };
  }

  /**
   * Validate replay data
   */
  static validateReplay(replay) {
    const errors = [];

    if (!replay) {
      errors.push('Replay data is required');
      return { valid: false, errors };
    }

    if (!replay.external_id) {
      errors.push('External ID is required');
    }

    if (!replay.name && !replay.title) {
      errors.push('Replay name or title is required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get replay display priorities for sorting
   */
  static getDisplayPriority(replay) {
    // Live replays should appear first
    if (replay.is_live) return 1;
    
    // Recent replays next (within last 24 hours)
    if (replay.started_at) {
      const startedAt = new Date(replay.started_at);
      const now = new Date();
      const hoursDiff = (now - startedAt) / (1000 * 60 * 60);
      if (hoursDiff < 24) return 2;
    }
    
    // Regular replays
    return 3;
  }

  /**
   * Filter replays by various criteria
   */
  static filterReplays(replays, filters = {}) {
    if (!Array.isArray(replays)) return [];

    let filtered = [...replays];

    // Filter by status
    if (filters.status && filters.status !== 'all') {
      if (filters.status === 'live') {
        filtered = filtered.filter(replay => replay.is_live);
      } else if (filters.status === 'replay') {
        filtered = filtered.filter(replay => !replay.is_live);
      }
    }

    // Filter by search query
    if (filters.search) {
      const query = filters.search.toLowerCase();
      filtered = filtered.filter(replay => {
        const name = (replay.name || replay.title || '').toLowerCase();
        const externalId = (replay.external_id || '').toLowerCase();
        return name.includes(query) || externalId.includes(query);
      });
    }

    // Filter by date range
    if (filters.startDate || filters.endDate) {
      filtered = filtered.filter(replay => {
        if (!replay.started_at) return false;
        const startedAt = new Date(replay.started_at);
        
        if (filters.startDate && startedAt < new Date(filters.startDate)) {
          return false;
        }
        if (filters.endDate && startedAt > new Date(filters.endDate)) {
          return false;
        }
        
        return true;
      });
    }

    // Filter by minimum viewer count
    if (filters.minViewers) {
      filtered = filtered.filter(replay => 
        (replay.peak_viewers || 0) >= filters.minViewers
      );
    }

    return filtered;
  }

  /**
   * Sort replays by specified criteria
   */
  static sortReplays(replays, sortBy = 'started_at', sortDirection = 'desc') {
    if (!Array.isArray(replays)) return [];

    const sorted = [...replays].sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'name':
          aValue = (a.name || a.title || '').toLowerCase();
          bValue = (b.name || b.title || '').toLowerCase();
          break;
        case 'started_at':
          aValue = a.started_at ? new Date(a.started_at) : new Date(0);
          bValue = b.started_at ? new Date(b.started_at) : new Date(0);
          break;
        case 'duration':
          aValue = a.duration || 0;
          bValue = b.duration || 0;
          break;
        case 'peak_viewers':
          aValue = a.peak_viewers || 0;
          bValue = b.peak_viewers || 0;
          break;
        case 'product_count':
          aValue = a.products?.length || a.product_count || 0;
          bValue = b.products?.length || b.product_count || 0;
          break;
        case 'priority':
          aValue = this.getDisplayPriority(a);
          bValue = this.getDisplayPriority(b);
          break;
        default:
          aValue = a[sortBy];
          bValue = b[sortBy];
      }

      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortDirection === 'desc' ? 1 : -1;
      if (bValue == null) return sortDirection === 'desc' ? -1 : 1;

      // Compare values
      if (aValue < bValue) return sortDirection === 'desc' ? 1 : -1;
      if (aValue > bValue) return sortDirection === 'desc' ? -1 : 1;
      return 0;
    });

    return sorted;
  }
}