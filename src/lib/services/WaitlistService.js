/**
 * WaitlistService - Stateless business logic for waitlist operations
 * Handles all waitlist-related API calls and data transformations
 */

export class WaitlistService {
  /**
   * Get all waitlist entries with optional filtering
   */
  static async getWaitlists(params = {}) {
    const searchParams = new URLSearchParams();
    
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.offset) searchParams.set('offset', params.offset.toString());
    if (params.user_id) searchParams.set('user_id', params.user_id);
    if (params.status && params.status !== 'all') searchParams.set('status', params.status);
    if (params.source && params.source !== 'all') searchParams.set('source', params.source.toString());
    if (params.search) searchParams.set('q', params.search);
    
    const url = `/api/waitlists${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch waitlists: HTTP ${response.status}`);
    }
    
    return await response.json();
  }

  /**
   * Get waitlist entries for a specific user
   */
  static async getUserWaitlists(userId, params = {}) {
    if (!userId) throw new Error('User ID is required');
    
    return this.getWaitlists({
      ...params,
      user_id: userId
    });
  }

  /**
   * Get single waitlist entry by ID
   */
  static async getWaitlist(id) {
    const response = await fetch(`/api/waitlists/${id}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Waitlist entry not found');
      }
      throw new Error(`Failed to fetch waitlist entry: HTTP ${response.status}`);
    }
    
    return await response.json();
  }

  /**
   * Update waitlist entry (authorization, position, etc.)
   */
  static async updateWaitlistEntry(id, updates) {
    const response = await fetch(`/api/waitlists/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update waitlist entry: HTTP ${response.status}`);
    }
    
    return await response.json();
  }

  /**
   * Remove waitlist entry
   */
  static async deleteWaitlistEntry(id) {
    const response = await fetch(`/api/waitlists/${id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete waitlist entry: HTTP ${response.status}`);
    }
    
    return true;
  }

  /**
   * Authorize waitlist entry (change status to authorized)
   */
  static async authorizeWaitlistEntry(id) {
    return this.updateWaitlistEntry(id, { 
      authorized_at: Math.floor(Date.now() / 1000) 
    });
  }

  /**
   * Bulk authorize multiple waitlist entries
   */
  static async bulkAuthorizeEntries(entryIds) {
    const response = await fetch('/api/waitlists/bulk/authorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entry_ids: entryIds })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to bulk authorize entries: HTTP ${response.status}`);
    }
    
    return await response.json();
  }

  /**
   * Bulk delete multiple waitlist entries
   */
  static async bulkDeleteEntries(entryIds) {
    const response = await fetch('/api/waitlists/bulk/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entry_ids: entryIds })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to bulk delete entries: HTTP ${response.status}`);
    }
    
    return true;
  }

  /**
   * Search waitlists by customer name, email, or product name
   */
  static async searchWaitlists(query) {
    const searchParams = new URLSearchParams({ q: query });
    const response = await fetch(`/api/waitlists/search?${searchParams}`);
    
    if (!response.ok) {
      throw new Error(`Failed to search waitlists: HTTP ${response.status}`);
    }
    
    return await response.json();
  }

  // =====================================
  // Business Logic Methods
  // =====================================

  /**
   * Check if waitlist entry is authorized
   */
  static isAuthorized(waitlistEntry) {
    return Boolean(waitlistEntry.authorized_at);
  }

  /**
   * Get waitlist entry status
   */
  static getStatus(waitlistEntry) {
    return this.isAuthorized(waitlistEntry) ? 'authorized' : 'pending';
  }

  /**
   * Get order source information
   */
  static getSourceInfo(sourceId) {
    const sources = {
      1: { label: 'Instagram', color: 'blue' },
      2: { label: 'Facebook', color: 'purple' },
      3: { label: 'Website', color: 'green' },
      4: { label: 'TikTok', color: 'orange' }
    };
    
    return sources[sourceId] || { label: 'Other', color: 'gray' };
  }

  /**
   * Get status color class
   */
  static getStatusColor(status) {
    const statusColors = {
      'pending': 'warning',
      'authorized': 'success'
    };
    
    return statusColors[status] || 'default';
  }

  /**
   * Calculate waitlist metrics from entries array
   */
  static calculateMetrics(waitlists) {
    if (!Array.isArray(waitlists)) {
      return {
        total: 0,
        pending: 0,
        authorized: 0,
        authorizationRate: 0,
        sourceCounts: {},
        positionRange: { min: 0, max: 0 }
      };
    }

    const pending = waitlists.filter(w => !this.isAuthorized(w)).length;
    const authorized = waitlists.filter(w => this.isAuthorized(w)).length;
    const total = waitlists.length;
    
    // Count by source
    const sourceCounts = waitlists.reduce((acc, waitlist) => {
      const source = this.getSourceInfo(waitlist.order_source).label;
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {});

    // Position range
    const positions = waitlists
      .map(w => w.position)
      .filter(p => typeof p === 'number')
      .sort((a, b) => a - b);

    return {
      total,
      pending,
      authorized,
      authorizationRate: total > 0 ? Math.round((authorized / total) * 100) : 0,
      sourceCounts,
      positionRange: {
        min: positions.length > 0 ? positions[0] : 0,
        max: positions.length > 0 ? positions[positions.length - 1] : 0
      }
    };
  }

  /**
   * Validate waitlist entry data
   */
  static validateWaitlistEntry(data) {
    const errors = [];
    
    if (!data.user_id) errors.push('User ID is required');
    if (!data.product_id) errors.push('Product ID is required');
    if (!data.user_name) errors.push('User name is required');
    if (!data.user_email) errors.push('User email is required');
    if (data.position !== undefined && (typeof data.position !== 'number' || data.position < 1)) {
      errors.push('Position must be a positive number');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Format waitlist entry for display
   */
  static formatWaitlistEntry(entry) {
    return {
      ...entry,
      status: this.getStatus(entry),
      sourceInfo: this.getSourceInfo(entry.order_source),
      formattedPosition: entry.position ? `#${entry.position}` : 'N/A',
      isAuthorized: this.isAuthorized(entry)
    };
  }
}