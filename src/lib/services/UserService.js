/**
 * User Service - Business Logic and API Operations
 * Handles all user-related operations including staff management
 */

import { toastService } from './ToastService.js';

export class UserService {
  // === API OPERATIONS ===

  static async getUsers(params = {}) {
    const searchParams = new URLSearchParams();
    
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.role) searchParams.set('role', params.role);
    if (params.search) searchParams.set('search', params.search);
    if (params.status) searchParams.set('status', params.status);
    
    const url = `/api/users${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  }

  static async getUser(id) {
    if (!id) throw new Error('User ID is required');
    
    const response = await fetch(`/api/users/${id}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('User not found');
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  }

  static async createUser(userData) {
    if (!userData.name || !userData.email) {
      throw new Error('Name and email are required');
    }

    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  }

  static async updateUser(id, updates) {
    if (!id) throw new Error('User ID is required');
    
    const response = await fetch(`/api/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  }

  static async deleteUser(id) {
    if (!id) throw new Error('User ID is required');
    
    const response = await fetch(`/api/users/${id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    return true;
  }

  // === TEAM/STAFF OPERATIONS ===

  static async getTeamMembers(params = {}) {
    const searchParams = new URLSearchParams();
    
    if (params.search) searchParams.set('search', params.search);
    if (params.role) searchParams.set('role', params.role);
    
    const url = `/api/staff${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  }

  static async addTeamMember(userData) {
    const response = await fetch('/api/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  }

  static async updateTeamMember(id, updates) {
    const response = await fetch(`/api/staff`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userIds: [id], updates })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    return result.updated && result.updated[0] ? result.updated[0] : null;
  }

  static async removeTeamMember(id) {
    const response = await fetch(`/api/staff`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userIds: [id] })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    return true;
  }

  // === SEARCH OPERATIONS ===

  static async searchUsers(query, filters = {}) {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const params = { 
      search: query.trim(),
      ...filters
    };
    
    return await this.getUsers(params);
  }

  static async searchTeamMembers(query, filters = {}) {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const params = { 
      search: query.trim(),
      ...filters
    };
    
    return await this.getTeamMembers(params);
  }

  // === BULK OPERATIONS ===

  static async bulkUpdateUsers(userIds, updates) {
    if (!userIds || !userIds.length) {
      throw new Error('No users selected');
    }

    const response = await fetch('/api/users/bulk', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userIds, updates })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  }

  static async bulkDeleteUsers(userIds) {
    if (!userIds || !userIds.length) {
      throw new Error('No users selected');
    }

    const response = await fetch('/api/users/bulk', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userIds })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    return true;
  }

  // === BUSINESS LOGIC ===

  static formatUser(user) {
    if (!user) return null;

    return {
      ...user,
      displayName: user.name || 'Unknown User',
      displayEmail: user.email || 'No email',
      statusInfo: this.getStatusInfo(user.status || 'active'),
      roleInfo: this.getRoleInfo(user.role || 'customer'),
      formattedCreatedAt: this.formatDate(user.created_at),
      formattedUpdatedAt: this.formatDate(user.updated_at),
      initials: this.getInitials(user.name || ''),
      avatarColor: this.getAvatarColor(user.email || user.name || ''),
      isAdmin: user.role === 'admin',
      isStaff: ['admin', 'staff', 'manager'].includes(user.role),
      canEdit: this.canEditUser(user),
      canDelete: this.canDeleteUser(user)
    };
  }

  static getStatusInfo(status) {
    const statusMap = {
      active: { text: 'Active', color: 'success', class: 'success' },
      inactive: { text: 'Inactive', color: 'warning', class: 'warning' },
      pending: { text: 'Pending', color: 'info', class: 'info' },
      suspended: { text: 'Suspended', color: 'error', class: 'error' },
      invited: { text: 'Invited', color: 'info', class: 'info' }
    };
    
    return statusMap[status] || { text: 'Unknown', color: 'default', class: 'default' };
  }

  static getRoleInfo(role) {
    const roleMap = {
      admin: { text: 'Store Owner', color: 'error', class: 'admin-role', icon: '👨‍💼' },
      staff: { text: 'Staff', color: 'info', class: 'staff-role', icon: '👩‍💼' },
      manager: { text: 'Manager', color: 'warning', class: 'manager-role', icon: '👨‍💻' },
      customer: { text: 'Customer', color: 'success', class: 'customer-role', icon: '👤' },
      guest: { text: 'Guest', color: 'default', class: 'guest-role', icon: '👥' }
    };
    
    return roleMap[role] || { text: 'Unknown', color: 'default', class: 'default', icon: '❓' };
  }

  static getInitials(name) {
    if (!name) return '?';
    
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  static getAvatarColor(seed) {
    const colors = [
      '#1e40af', '#7c3aed', '#059669', '#dc2626', 
      '#ea580c', '#0891b2', '#4338ca', '#be123c'
    ];
    
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  }

  static formatDate(dateString) {
    if (!dateString) return 'Unknown';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid date';
    }
  }

  static formatDateTime(dateString) {
    if (!dateString) return 'Unknown';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid date';
    }
  }

  static canEditUser(user) {
    // Basic permission logic - can be extended
    return user && user.id;
  }

  static canDeleteUser(user) {
    // Prevent deletion of admin users or self
    return user && user.role !== 'admin' && user.id;
  }

  // === FILTERING AND SORTING ===

  static filterUsers(users, filters) {
    if (!users || !Array.isArray(users)) return [];
    
    return users.filter(user => {
      // Role filter
      if (filters.role && filters.role !== 'all' && user.role !== filters.role) {
        return false;
      }
      
      // Status filter
      if (filters.status && filters.status !== 'all' && user.status !== filters.status) {
        return false;
      }
      
      // Search filter
      if (filters.search && filters.search.trim()) {
        const searchTerm = filters.search.toLowerCase();
        const searchableFields = [
          user.name || '',
          user.email || '',
          user.role || ''
        ];
        
        const matches = searchableFields.some(field =>
          field.toLowerCase().includes(searchTerm)
        );
        
        if (!matches) return false;
      }
      
      // Date range filter
      if (filters.startDate && user.created_at) {
        if (new Date(user.created_at) < new Date(filters.startDate)) {
          return false;
        }
      }
      
      if (filters.endDate && user.created_at) {
        if (new Date(user.created_at) > new Date(filters.endDate)) {
          return false;
        }
      }
      
      return true;
    });
  }

  static sortUsers(users, sortBy = 'created_at', sortDirection = 'desc') {
    if (!users || !Array.isArray(users)) return [];
    
    const sortedUsers = [...users].sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;
      
      // Convert to lowercase for string comparison
      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();
      
      // Date comparison
      if (sortBy.includes('_at') || sortBy.includes('date')) {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }
      
      if (aValue < bValue) return -1;
      if (aValue > bValue) return 1;
      return 0;
    });
    
    return sortDirection === 'desc' ? sortedUsers.reverse() : sortedUsers;
  }

  // === ANALYTICS ===

  static calculateUserAnalytics(users) {
    if (!users || !Array.isArray(users)) {
      return {
        totalUsers: 0,
        totalStaff: 0,
        totalCustomers: 0,
        totalActive: 0,
        totalInactive: 0,
        roleBreakdown: {},
        statusBreakdown: {},
        recentUsers: 0
      };
    }

    const roleBreakdown = {};
    const statusBreakdown = {};
    let totalStaff = 0;
    let totalCustomers = 0;
    let totalActive = 0;
    let totalInactive = 0;

    // Calculate recent users (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    let recentUsers = 0;

    users.forEach(user => {
      // Role breakdown
      const role = user.role || 'customer';
      roleBreakdown[role] = (roleBreakdown[role] || 0) + 1;
      
      if (['admin', 'staff', 'manager'].includes(role)) {
        totalStaff++;
      } else {
        totalCustomers++;
      }

      // Status breakdown
      const status = user.status || 'active';
      statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
      
      if (status === 'active') {
        totalActive++;
      } else {
        totalInactive++;
      }

      // Recent users
      if (user.created_at && new Date(user.created_at) > thirtyDaysAgo) {
        recentUsers++;
      }
    });

    return {
      totalUsers: users.length,
      totalStaff,
      totalCustomers,
      totalActive,
      totalInactive,
      roleBreakdown,
      statusBreakdown,
      recentUsers
    };
  }

  // === VALIDATION ===

  static validateUser(userData) {
    const errors = [];

    if (!userData.name || userData.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters long');
    }

    if (!userData.email || !this.isValidEmail(userData.email)) {
      errors.push('Valid email address is required');
    }

    if (userData.role && !['admin', 'staff', 'manager', 'customer', 'guest'].includes(userData.role)) {
      errors.push('Invalid role specified');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}