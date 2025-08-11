/**
 * Users Global State - Svelte 5 Runes
 * Universal reactivity for user management across the entire app
 */

import { browser } from '$app/environment';
import { UserService } from '../services/UserService.js';
import { toastService } from '../services/ToastService.js';

// IMPORTANT: Use objects for automatic proxy reactivity
export const usersState = $state({
  // Users list state
  users: [],
  loading: false,
  error: '',
  lastFetch: null,
  
  // Team members state (staff-specific)
  teamMembers: [],
  teamLoading: false,
  teamError: '',
  teamLastFetch: null,
  
  // Single user state
  currentUser: null,
  userLoading: false,
  userError: '',
  
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
    role: 'all', // 'all', 'admin', 'staff', 'customer'
    status: 'all', // 'all', 'active', 'inactive', 'pending'
    search: '',
    startDate: null,
    endDate: null
  },
  
  sorting: {
    sortBy: 'created_at',
    sortDirection: 'desc'
  },
  
  // UI state
  selectedUsers: [],
  selectAll: false,
  viewMode: 'table', // 'table', 'grid'
  showFilters: false,
  
  // Form state
  isCreating: false,
  isEditing: false,
  formData: {
    name: '',
    email: '',
    role: 'customer',
    status: 'active'
  },
  formErrors: [],
  
  // Modal state
  showUserModal: false,
  showDeleteModal: false,
  showBulkModal: false,
  bulkAction: null,
  
  // Analytics state
  analytics: null,
  analyticsLoading: false
});

// === COMPUTED VALUES ===
// Using functions since $derived cannot be exported from .svelte.js files

export function getFilteredUsers() {
  if (!usersState.users.length) return [];
  
  const filtered = UserService.filterUsers(usersState.users, usersState.filters);
  return UserService.sortUsers(filtered, usersState.sorting.sortBy, usersState.sorting.sortDirection);
}

export function getFilteredTeamMembers() {
  if (!usersState.teamMembers.length) return [];
  
  const filtered = UserService.filterUsers(usersState.teamMembers, usersState.filters);
  return UserService.sortUsers(filtered, usersState.sorting.sortBy, usersState.sorting.sortDirection);
}

export function getUserAnalytics() {
  return UserService.calculateUserAnalytics(usersState.users);
}

export function getCurrentUserDisplay() {
  if (!usersState.currentUser) return null;
  return UserService.formatUser(usersState.currentUser);
}

export function getSelectedUsersData() {
  if (!usersState.selectedUsers.length) return [];
  return usersState.users.filter(user => usersState.selectedUsers.includes(user.id));
}

export function hasSelection() {
  return usersState.selectedUsers.length > 0;
}

export function getSelectionCount() {
  return usersState.selectedUsers.length;
}

export function isAllSelected() {
  const filteredUsers = getFilteredUsers();
  if (!filteredUsers.length) return false;
  return filteredUsers.every(user => usersState.selectedUsers.includes(user.id));
}

export function canPerformBulkActions() {
  return hasSelection() && !usersState.loading;
}

// === ACTIONS ===

export const usersActions = {
  // === DATA LOADING ===
  
  async loadUsers(params = {}) {
    // Prevent concurrent loads
    if (usersState.loading) return;
    
    usersState.loading = true;
    usersState.error = '';
    
    try {
      const mergedParams = { 
        ...usersState.filters,
        ...usersState.pagination,
        ...params 
      };
      
      const result = await UserService.getUsers(mergedParams);
      
      // Handle both simple array and paginated response
      if (Array.isArray(result)) {
        usersState.users = result.map(UserService.formatUser);
      } else {
        usersState.users = result.data ? result.data.map(UserService.formatUser) : [];
        if (result.pagination) {
          usersState.pagination = { ...usersState.pagination, ...result.pagination };
        }
      }
      
      usersState.lastFetch = new Date();
      
    } catch (error) {
      usersState.error = error.message;
      console.error('Failed to load users:', error);
      toastService.error(`Failed to load users: ${error.message}`);
    } finally {
      usersState.loading = false;
    }
  },

  async loadTeamMembers(params = {}) {
    // Prevent concurrent loads
    if (usersState.teamLoading) return;
    
    usersState.teamLoading = true;
    usersState.teamError = '';
    
    try {
      const mergedParams = { 
        ...usersState.filters,
        ...params 
      };
      
      const result = await UserService.getTeamMembers(mergedParams);
      usersState.teamMembers = result.map(UserService.formatUser);
      usersState.teamLastFetch = new Date();
      
    } catch (error) {
      usersState.teamError = error.message;
      console.error('Failed to load team members:', error);
      toastService.error(`Failed to load team members: ${error.message}`);
    } finally {
      usersState.teamLoading = false;
    }
  },

  async loadUser(id) {
    if (!id) return;
    
    // Prevent concurrent loads
    if (usersState.userLoading) return;
    
    usersState.userLoading = true;
    usersState.userError = '';
    
    try {
      const user = await UserService.getUser(id);
      usersState.currentUser = UserService.formatUser(user);
    } catch (error) {
      usersState.userError = error.message;
      console.error('Failed to load user:', error);
      toastService.error(`Failed to load user: ${error.message}`);
    } finally {
      usersState.userLoading = false;
    }
  },

  // === USER MANAGEMENT ===

  async createUser(userData) {
    usersState.isCreating = true;
    usersState.formErrors = [];
    
    try {
      // Validate data
      const validation = UserService.validateUser(userData);
      if (!validation.isValid) {
        usersState.formErrors = validation.errors;
        return false;
      }
      
      const newUser = await UserService.createUser(userData);
      const formattedUser = UserService.formatUser(newUser);
      
      // Add to users list
      usersState.users = [formattedUser, ...usersState.users];
      
      // Reset form
      this.resetForm();
      this.closeUserModal();
      
      toastService.success('User created successfully');
      return true;
      
    } catch (error) {
      usersState.formErrors = [error.message];
      console.error('Failed to create user:', error);
      toastService.error(`Failed to create user: ${error.message}`);
      return false;
    } finally {
      usersState.isCreating = false;
    }
  },

  async updateUser(id, updates) {
    if (!id) return false;
    
    usersState.isEditing = true;
    usersState.formErrors = [];
    
    try {
      const updatedUser = await UserService.updateUser(id, updates);
      const formattedUser = UserService.formatUser(updatedUser);
      
      // Update current user if it's the one being edited
      if (usersState.currentUser?.id === id) {
        usersState.currentUser = formattedUser;
      }
      
      // Update in users list
      const index = usersState.users.findIndex(user => user.id === id);
      if (index !== -1) {
        usersState.users[index] = formattedUser;
      }
      
      // Update in team members if it exists there
      const teamIndex = usersState.teamMembers.findIndex(user => user.id === id);
      if (teamIndex !== -1) {
        usersState.teamMembers[teamIndex] = formattedUser;
      }
      
      this.closeUserModal();
      toastService.success('User updated successfully');
      return true;
      
    } catch (error) {
      usersState.formErrors = [error.message];
      console.error('Failed to update user:', error);
      toastService.error(`Failed to update user: ${error.message}`);
      return false;
    } finally {
      usersState.isEditing = false;
    }
  },

  async deleteUser(id) {
    if (!id) return false;
    
    try {
      await UserService.deleteUser(id);
      
      // Remove from users list
      usersState.users = usersState.users.filter(user => user.id !== id);
      
      // Remove from team members
      usersState.teamMembers = usersState.teamMembers.filter(user => user.id !== id);
      
      // Clear current user if it was deleted
      if (usersState.currentUser?.id === id) {
        usersState.currentUser = null;
      }
      
      // Remove from selection
      usersState.selectedUsers = usersState.selectedUsers.filter(userId => userId !== id);
      
      this.closeDeleteModal();
      toastService.success('User deleted successfully');
      return true;
      
    } catch (error) {
      console.error('Failed to delete user:', error);
      toastService.error(`Failed to delete user: ${error.message}`);
      return false;
    }
  },

  // === TEAM MANAGEMENT ===

  async addTeamMember(userData) {
    try {
      const newMember = await UserService.addTeamMember(userData);
      const formattedMember = UserService.formatUser(newMember);
      
      usersState.teamMembers = [formattedMember, ...usersState.teamMembers];
      toastService.success('Team member added successfully');
      return true;
      
    } catch (error) {
      console.error('Failed to add team member:', error);
      toastService.error(`Failed to add team member: ${error.message}`);
      return false;
    }
  },

  async removeTeamMember(id) {
    try {
      await UserService.removeTeamMember(id);
      
      usersState.teamMembers = usersState.teamMembers.filter(member => member.id !== id);
      toastService.success('Team member removed successfully');
      return true;
      
    } catch (error) {
      console.error('Failed to remove team member:', error);
      toastService.error(`Failed to remove team member: ${error.message}`);
      return false;
    }
  },

  // === SEARCH OPERATIONS ===

  async searchUsers(query) {
    usersState.filters.search = query;
    usersState.pagination.page = 1; // Reset to first page
    await this.loadUsers();
  },

  async searchTeamMembers(query) {
    usersState.filters.search = query;
    await this.loadTeamMembers();
  },

  // === FILTERING AND SORTING ===

  setFilter(key, value) {
    usersState.filters[key] = value;
    usersState.pagination.page = 1; // Reset to first page
  },

  setSorting(sortBy, sortDirection) {
    usersState.sorting.sortBy = sortBy;
    usersState.sorting.sortDirection = sortDirection;
  },

  toggleSorting(sortBy) {
    if (usersState.sorting.sortBy === sortBy) {
      usersState.sorting.sortDirection = usersState.sorting.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      usersState.sorting.sortBy = sortBy;
      usersState.sorting.sortDirection = 'asc';
    }
  },

  clearFilters() {
    usersState.filters = {
      role: 'all',
      status: 'all',
      search: '',
      startDate: null,
      endDate: null
    };
    usersState.pagination.page = 1;
  },

  // === SELECTION MANAGEMENT ===

  selectUser(id) {
    const index = usersState.selectedUsers.indexOf(id);
    if (index > -1) {
      usersState.selectedUsers.splice(index, 1);
    } else {
      usersState.selectedUsers.push(id);
    }
    
    // Update selectAll state
    this.updateSelectAllState();
  },

  selectAllUsers() {
    const filteredUsers = getFilteredUsers();
    if (isAllSelected()) {
      usersState.selectedUsers = [];
      usersState.selectAll = false;
    } else {
      usersState.selectedUsers = filteredUsers.map(user => user.id);
      usersState.selectAll = true;
    }
  },

  clearSelection() {
    usersState.selectedUsers = [];
    usersState.selectAll = false;
  },

  updateSelectAllState() {
    const filteredUsers = getFilteredUsers();
    usersState.selectAll = filteredUsers.length > 0 && 
      filteredUsers.every(user => usersState.selectedUsers.includes(user.id));
  },

  // === BULK OPERATIONS ===

  async performBulkAction(action) {
    if (!hasSelection()) return;
    
    usersState.loading = true;
    
    try {
      switch (action) {
        case 'delete':
          await UserService.bulkDeleteUsers(usersState.selectedUsers);
          
          // Remove deleted users from state
          usersState.users = usersState.users.filter(
            user => !usersState.selectedUsers.includes(user.id)
          );
          usersState.teamMembers = usersState.teamMembers.filter(
            user => !usersState.selectedUsers.includes(user.id)
          );
          
          toastService.success(`${usersState.selectedUsers.length} users deleted successfully`);
          break;
          
        case 'activate':
          await UserService.bulkUpdateUsers(usersState.selectedUsers, { status: 'active' });
          
          // Update user statuses in state
          usersState.users = usersState.users.map(user => 
            usersState.selectedUsers.includes(user.id) 
              ? { ...user, status: 'active', statusInfo: UserService.getStatusInfo('active') }
              : user
          );
          
          toastService.success(`${usersState.selectedUsers.length} users activated successfully`);
          break;
          
        case 'deactivate':
          await UserService.bulkUpdateUsers(usersState.selectedUsers, { status: 'inactive' });
          
          // Update user statuses in state
          usersState.users = usersState.users.map(user => 
            usersState.selectedUsers.includes(user.id) 
              ? { ...user, status: 'inactive', statusInfo: UserService.getStatusInfo('inactive') }
              : user
          );
          
          toastService.success(`${usersState.selectedUsers.length} users deactivated successfully`);
          break;
          
        default:
          toastService.warning('Unknown bulk action');
      }
      
      // Clear selection after action
      this.clearSelection();
      this.closeBulkModal();
      
    } catch (error) {
      console.error('Bulk action failed:', error);
      toastService.error(`Bulk action failed: ${error.message}`);
    } finally {
      usersState.loading = false;
    }
  },

  // === PAGINATION ===

  async goToPage(page) {
    if (page < 1 || page === usersState.pagination.page) return;
    
    usersState.pagination.page = page;
    await this.loadUsers();
  },

  async nextPage() {
    if (usersState.pagination.hasNext) {
      await this.goToPage(usersState.pagination.page + 1);
    }
  },

  async previousPage() {
    if (usersState.pagination.hasPrev) {
      await this.goToPage(usersState.pagination.page - 1);
    }
  },

  // === MODAL MANAGEMENT ===

  openUserModal(user = null) {
    if (user) {
      // Edit mode
      usersState.formData = {
        name: user.name || '',
        email: user.email || '',
        role: user.role || 'customer',
        status: user.status || 'active'
      };
      usersState.currentUser = user;
    } else {
      // Create mode
      this.resetForm();
    }
    
    usersState.showUserModal = true;
    usersState.formErrors = [];
  },

  closeUserModal() {
    usersState.showUserModal = false;
    usersState.isCreating = false;
    usersState.isEditing = false;
    usersState.formErrors = [];
    this.resetForm();
  },

  openDeleteModal(user) {
    usersState.currentUser = user;
    usersState.showDeleteModal = true;
  },

  closeDeleteModal() {
    usersState.showDeleteModal = false;
    usersState.currentUser = null;
  },

  openBulkModal(action) {
    usersState.bulkAction = action;
    usersState.showBulkModal = true;
  },

  closeBulkModal() {
    usersState.showBulkModal = false;
    usersState.bulkAction = null;
  },

  // === FORM MANAGEMENT ===

  resetForm() {
    usersState.formData = {
      name: '',
      email: '',
      role: 'customer',
      status: 'active'
    };
    usersState.currentUser = null;
  },

  updateFormData(key, value) {
    usersState.formData[key] = value;
  },

  // === UI STATE ACTIONS ===
  
  setViewMode(mode) {
    usersState.viewMode = mode;
  },

  toggleFilters() {
    usersState.showFilters = !usersState.showFilters;
  },

  // === UTILITY ACTIONS ===
  
  clearCurrentUser() {
    usersState.currentUser = null;
    usersState.userError = '';
  },

  retry() {
    if (usersState.error) {
      return this.loadUsers();
    }
    if (usersState.teamError) {
      return this.loadTeamMembers();
    }
    if (usersState.userError && usersState.currentUser) {
      return this.loadUser(usersState.currentUser.id);
    }
  },

  refresh() {
    usersState.lastFetch = null; // Force refresh
    usersState.teamLastFetch = null;
    return this.loadUsers();
  },

  refreshTeam() {
    usersState.teamLastFetch = null; // Force refresh
    return this.loadTeamMembers();
  }
};

// Note: Initialization is handled by individual pages to prevent conflicts