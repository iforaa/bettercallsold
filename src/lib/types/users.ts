/**
 * User Domain Types - Complete TypeScript Interface System
 * Covers users, team members, roles, permissions, and all related functionality
 */

import type { BaseEntity } from './common';

// === CORE USER TYPES ===

export interface User extends BaseEntity {
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  tenant_id: string;
  password_hash?: string;
  last_login_at?: string;
  email_verified_at?: string;
  avatar_url?: string;
  phone?: string;
  timezone?: string;
  locale?: string;
  metadata?: Record<string, any>;
}

export interface UserFormatted extends User {
  displayName: string;
  displayEmail: string;
  statusInfo: StatusInfo;
  roleInfo: RoleInfo;
  formattedCreatedAt: string;
  formattedUpdatedAt: string;
  formattedLastLoginAt?: string;
  initials: string;
  avatarColor: string;
  isAdmin: boolean;
  isStaff: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface TeamMember extends User {
  permissions?: Permission[];
  department?: string;
  position?: string;
  hire_date?: string;
  manager_id?: string;
}

// === TYPE UNIONS ===

export type UserRole = 'admin' | 'staff' | 'manager' | 'customer' | 'guest';

export type UserStatus = 'active' | 'inactive' | 'pending' | 'suspended' | 'invited';

export type Permission = 
  | 'users.view' | 'users.create' | 'users.update' | 'users.delete'
  | 'products.view' | 'products.create' | 'products.update' | 'products.delete'
  | 'orders.view' | 'orders.create' | 'orders.update' | 'orders.delete'
  | 'customers.view' | 'customers.create' | 'customers.update' | 'customers.delete'
  | 'inventory.view' | 'inventory.create' | 'inventory.update' | 'inventory.delete'
  | 'settings.view' | 'settings.update'
  | 'reports.view' | 'reports.export'
  | 'live.manage' | 'live.broadcast'
  | 'team.manage' | 'permissions.manage';

// === INFO TYPES ===

export interface StatusInfo {
  text: string;
  color: string;
  class: string;
}

export interface RoleInfo {
  text: string;
  color: string;
  class: string;
  icon: string;
}

// === STATE MANAGEMENT TYPES ===

export interface UsersState {
  // Users list state
  users: UserFormatted[];
  loading: boolean;
  error: string;
  lastFetch: Date | null;
  
  // Team members state
  teamMembers: UserFormatted[];
  teamLoading: boolean;
  teamError: string;
  teamLastFetch: Date | null;
  
  // Single user state
  currentUser: UserFormatted | null;
  userLoading: boolean;
  userError: string;
  
  // Pagination state
  pagination: PaginationState;
  
  // Filtering and sorting
  filters: UserFilters;
  sorting: SortingState;
  
  // UI state
  selectedUsers: string[];
  selectAll: boolean;
  viewMode: ViewMode;
  showFilters: boolean;
  
  // Form state
  isCreating: boolean;
  isEditing: boolean;
  formData: UserFormData;
  formErrors: string[];
  
  // Modal state
  showUserModal: boolean;
  showDeleteModal: boolean;
  showBulkModal: boolean;
  bulkAction: BulkAction | null;
  
  // Analytics state
  analytics: UserAnalytics | null;
  analyticsLoading: boolean;
}

export interface PaginationState {
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface UserFilters {
  role: UserRole | 'all';
  status: UserStatus | 'all';
  search: string;
  startDate: string | null;
  endDate: string | null;
}

export interface SortingState {
  sortBy: UserSortField;
  sortDirection: 'asc' | 'desc';
}

export type ViewMode = 'table' | 'grid';

export type UserSortField = 
  | 'name' | 'email' | 'role' | 'status' 
  | 'created_at' | 'updated_at' | 'last_login_at';

export type BulkAction = 'delete' | 'activate' | 'deactivate' | 'change_role';

// === FORM TYPES ===

export interface UserFormData {
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  password?: string;
  phone?: string;
  department?: string;
  position?: string;
}

export interface TeamMemberFormData extends UserFormData {
  permissions: Permission[];
  department: string;
  position: string;
  manager_id?: string;
}

export interface UserCreateRequest {
  name: string;
  email: string;
  role?: UserRole;
  status?: UserStatus;
  password?: string;
  phone?: string;
  timezone?: string;
  locale?: string;
}

export interface UserUpdateRequest {
  name?: string;
  email?: string;
  role?: UserRole;
  status?: UserStatus;
  phone?: string;
  timezone?: string;
  locale?: string;
  avatar_url?: string;
}

export interface BulkUpdateRequest {
  userIds: string[];
  updates: UserUpdateRequest;
}

// === ANALYTICS TYPES ===

export interface UserAnalytics {
  totalUsers: number;
  totalStaff: number;
  totalCustomers: number;
  totalActive: number;
  totalInactive: number;
  recentUsers: number;
  roleBreakdown: Record<UserRole, number>;
  statusBreakdown: Record<UserStatus, number>;
}

export interface UserActivityLog {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// === API RESPONSE TYPES ===

export interface UsersResponse {
  data: User[];
  pagination?: PaginationInfo;
}

export interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface UserResponse {
  data: User;
}

export interface BulkOperationResponse {
  success: boolean;
  affectedCount: number;
  errors?: string[];
}

// === VALIDATION TYPES ===

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface UserValidation extends ValidationResult {
  fieldErrors?: Record<string, string>;
}

// === COMPONENT PROPS TYPES ===

export interface UserCardProps {
  user: UserFormatted;
  selected?: boolean;
  showActions?: boolean;
  showMetrics?: boolean;
  compact?: boolean;
  onClick?: (user: UserFormatted) => void;
  onSelect?: (userId: string) => void;
  onEdit?: (user: UserFormatted) => void;
  onDelete?: (user: UserFormatted) => void;
  className?: string;
}

export interface UserTableProps {
  users: UserFormatted[];
  selectedUsers?: string[];
  sortBy?: UserSortField;
  sortDirection?: 'asc' | 'desc';
  loading?: boolean;
  onUserClick?: (user: UserFormatted) => void;
  onUserSelect?: (userId: string) => void;
  onSort?: (field: UserSortField, direction: 'asc' | 'desc') => void;
  onSelectAll?: () => void;
  showActions?: boolean;
  showSelection?: boolean;
  className?: string;
}

export interface UserFormProps {
  user?: UserFormatted | null;
  formData: UserFormData;
  errors?: string[];
  loading?: boolean;
  isEditing?: boolean;
  onSubmit: (data: UserFormData) => Promise<boolean>;
  onCancel: () => void;
  onFieldChange: (field: keyof UserFormData, value: any) => void;
  className?: string;
}

export interface UserMetricsProps {
  analytics?: UserAnalytics | null;
  users?: UserFormatted[];
  showDetailed?: boolean;
  loading?: boolean;
  className?: string;
}

export interface RoleSelectorProps {
  value: UserRole;
  onChange: (role: UserRole) => void;
  disabled?: boolean;
  showAllRoles?: boolean;
  className?: string;
}

export interface UserFiltersProps {
  filters: UserFilters;
  onFilterChange: (key: keyof UserFilters, value: any) => void;
  onClearFilters: () => void;
  userCount?: number;
  loading?: boolean;
  className?: string;
}

export interface BulkActionsProps {
  selectedCount: number;
  onAction: (action: BulkAction) => void;
  disabled?: boolean;
  className?: string;
}

// === CONTEXT TYPES ===

export interface UsersContextValue {
  state: UsersState;
  actions: UsersActions;
  computed: UsersComputedValues;
}

export interface UsersActions {
  // Data loading
  loadUsers: (params?: Record<string, any>) => Promise<void>;
  loadTeamMembers: (params?: Record<string, any>) => Promise<void>;
  loadUser: (id: string) => Promise<void>;
  
  // User management
  createUser: (userData: UserFormData) => Promise<boolean>;
  updateUser: (id: string, updates: UserUpdateRequest) => Promise<boolean>;
  deleteUser: (id: string) => Promise<boolean>;
  
  // Team management
  addTeamMember: (userData: TeamMemberFormData) => Promise<boolean>;
  removeTeamMember: (id: string) => Promise<boolean>;
  
  // Search and filtering
  searchUsers: (query: string) => Promise<void>;
  searchTeamMembers: (query: string) => Promise<void>;
  setFilter: (key: keyof UserFilters, value: any) => void;
  clearFilters: () => void;
  setSorting: (sortBy: UserSortField, direction: 'asc' | 'desc') => void;
  toggleSorting: (sortBy: UserSortField) => void;
  
  // Selection management
  selectUser: (id: string) => void;
  selectAllUsers: () => void;
  clearSelection: () => void;
  
  // Bulk operations
  performBulkAction: (action: BulkAction) => Promise<void>;
  
  // Pagination
  goToPage: (page: number) => Promise<void>;
  nextPage: () => Promise<void>;
  previousPage: () => Promise<void>;
  
  // Modal management
  openUserModal: (user?: UserFormatted | null) => void;
  closeUserModal: () => void;
  openDeleteModal: (user: UserFormatted) => void;
  closeDeleteModal: () => void;
  openBulkModal: (action: BulkAction) => void;
  closeBulkModal: () => void;
  
  // Form management
  resetForm: () => void;
  updateFormData: (key: keyof UserFormData, value: any) => void;
  
  // UI state
  setViewMode: (mode: ViewMode) => void;
  toggleFilters: () => void;
  
  // Utility
  clearCurrentUser: () => void;
  retry: () => Promise<void>;
  refresh: () => Promise<void>;
  refreshTeam: () => Promise<void>;
}

export interface UsersComputedValues {
  filteredUsers: UserFormatted[];
  filteredTeamMembers: UserFormatted[];
  userAnalytics: UserAnalytics;
  currentUserDisplay: UserFormatted | null;
  selectedUsersData: UserFormatted[];
  hasSelection: boolean;
  selectionCount: number;
  isAllSelected: boolean;
  canPerformBulkActions: boolean;
}

// === ERROR TYPES ===

export interface UserError extends Error {
  field?: string;
  code?: string;
  statusCode?: number;
}

export interface ValidationError extends UserError {
  fieldErrors: Record<string, string[]>;
}

// === PERMISSION TYPES ===

export interface RolePermissions {
  role: UserRole;
  permissions: Permission[];
  description: string;
}

export interface PermissionGroup {
  name: string;
  permissions: Permission[];
  description?: string;
}

export interface UserPermissionCheck {
  userId: string;
  permission: Permission;
  hasPermission: boolean;
  reason?: string;
}