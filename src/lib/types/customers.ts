/**
 * Customer Domain Types - Complete TypeScript Interface System
 * Covers customers, customer management, and all related functionality
 */

import type { BaseEntity, PaginatedResponse, ApiResponse } from './common';

// === CORE CUSTOMER TYPES ===

export interface Customer extends BaseEntity {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  facebook_id?: string;
  instagram_id?: string;
  stats?: CustomerStats;
}

export interface CustomerWithStats extends Customer {
  stats: CustomerStats;
}

export interface CustomerStats {
  order_count: number;
  total_spent: number;
  cart_items_count: number;
  posts_count: number;
  customer_since: string;
}

export interface CustomerFormatted extends CustomerWithStats {
  displayName: string;
  displayEmail: string;
  initials: string;
  formattedCreatedAt: string;
  formattedUpdatedAt: string;
  customerSince: string;
}

// === CUSTOMER CREDIT TYPES ===

export interface CustomerCreditBalance {
  balance: number;
  total_earned: number;
  total_spent: number;
  created_at?: string;
  updated_at?: string;
}

export interface CustomerCreditTransaction {
  id: string;
  user_id: string;
  transaction_type: CreditTransactionType;
  amount: number;
  balance_after: number;
  description: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export type CreditTransactionType = 
  | 'admin_grant' 
  | 'order_deduction' 
  | 'balance_adjustment' 
  | 'credit_expiration'
  | 'refund_credit';

export interface CustomerCreditsData {
  balance: CustomerCreditBalance;
  transactions: CustomerCreditTransaction[];
}

// === CUSTOMER FORM TYPES ===

export interface CustomerFormData {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  facebook_id?: string;
  instagram_id?: string;
}

export interface CustomerCreateRequest extends CustomerFormData {
  role?: 'customer';
}

export interface CustomerUpdateRequest {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  facebook_id?: string;
  instagram_id?: string;
}

export interface AssignCreditsFormData {
  amount: string;
  description: string;
}

export interface AdjustCreditsFormData {
  amount: string;
  description: string;
  type: 'add' | 'deduct';
}

// === CUSTOMER FILTERS & SEARCH ===

export interface CustomerFilters {
  role: 'customer' | 'all';
  status: CustomerStatus | 'all';
  search: string;
  startDate: string | null;
  endDate: string | null;
}

export type CustomerStatus = 'active' | 'inactive' | 'pending' | 'suspended';

export interface CustomerSearchParams {
  page?: number;
  limit?: number;
  role?: string;
  search?: string;
  status?: string;
}

// === SORTING & PAGINATION ===

export interface CustomerSortingState {
  sortBy: CustomerSortField;
  sortDirection: 'asc' | 'desc';
}

export type CustomerSortField = 
  | 'name' | 'email' | 'created_at' | 'updated_at' 
  | 'total_spent' | 'order_count';

export interface CustomerPaginationState {
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
  currentPage: number;
  startItem: number;
  endItem: number;
}

// === CUSTOMER STATE MANAGEMENT ===

export interface CustomerState {
  // Single customer state
  currentCustomer: CustomerFormatted | null;
  customerLoading: boolean;
  customerError: string;
  
  // Customer orders state
  customerOrders: any[];
  ordersLoading: boolean;
  ordersError: string;
  
  // Customer waitlists state
  customerWaitlists: any[];
  waitlistsLoading: boolean;
  waitlistsError: string;
  
  // Customer cart state
  customerCart: any[];
  cartLoading: boolean;
  cartError: string;
  
  // Customer credits state
  customerCredits: CustomerCreditsData | null;
  creditsLoading: boolean;
  creditsError: string;
  
  // UI state
  activeTab: CustomerTab;
  
  // Modal state
  showAssignCreditsModal: boolean;
  showAdjustCreditsModal: boolean;
  showEditCustomerModal: boolean;
  
  // Form state
  assignCreditsForm: AssignCreditsFormData;
  adjustCreditsForm: AdjustCreditsFormData;
  editCustomerForm: CustomerFormData;
  
  // Form loading state
  assigningCredits: boolean;
  adjustingCredits: boolean;
  updatingCustomer: boolean;
}

export type CustomerTab = 
  | 'overview' 
  | 'orders' 
  | 'cart' 
  | 'posts' 
  | 'waitlists' 
  | 'credits';

// === CUSTOMER CONTEXT ===

export interface CustomerContextValue {
  state: CustomerState;
  actions: CustomerActions;
  derived: CustomerDerivedValues;
}

export interface CustomerActions {
  // Data loading
  loadCustomer: (id: string) => Promise<void>;
  loadCustomerOrders: (id: string) => Promise<void>;
  loadCustomerWaitlists: (id: string) => Promise<void>;
  loadCustomerCart: (id: string) => Promise<void>;
  loadCustomerCredits: (id: string) => Promise<void>;
  refreshCustomerData: () => Promise<void>;
  
  // Customer management
  updateCustomer: (id: string, updates: CustomerUpdateRequest) => Promise<boolean>;
  
  // Credits management
  assignCredits: (customerId: string, amount: string, description: string) => Promise<boolean>;
  adjustCredits: (customerId: string, amount: string, description: string, type: 'add' | 'deduct') => Promise<boolean>;
  
  // UI state management
  setActiveTab: (tab: CustomerTab) => void;
  
  // Modal management
  openAssignCreditsModal: () => void;
  closeAssignCreditsModal: () => void;
  openAdjustCreditsModal: () => void;
  closeAdjustCreditsModal: () => void;
  openEditCustomerModal: () => void;
  closeEditCustomerModal: () => void;
  
  // Form management
  updateAssignCreditsForm: (field: keyof AssignCreditsFormData, value: string) => void;
  updateAdjustCreditsForm: (field: keyof AdjustCreditsFormData, value: string) => void;
  updateEditCustomerForm: (field: keyof CustomerFormData, value: string) => void;
  resetForms: () => void;
  
  // Navigation
  navigateBack: (from?: string, orderId?: string, waitlistId?: string) => void;
  goToOrder: (orderId: string) => void;
  goToProduct: (productId: string) => void;
  
  // Error handling
  clearErrors: () => void;
  retry: () => Promise<void>;
}

export interface CustomerDerivedValues {
  hasCustomer: boolean;
  hasOrders: boolean;
  hasWaitlists: boolean;
  hasCartItems: boolean;
  hasCredits: boolean;
  isLoading: boolean;
  hasErrors: boolean;
  canAssignCredits: boolean;
  canAdjustCredits: boolean;
  formattedCreditBalance: string;
  customerSinceFormatted: string;
}

// === CUSTOMERS LIST CONTEXT ===

export interface CustomersListState {
  // Customers list state
  customers: CustomerFormatted[];
  loading: boolean;
  error: string;
  lastFetch: Date | null;
  
  // Pagination state
  pagination: CustomerPaginationState;
  
  // Filtering and sorting
  filters: CustomerFilters;
  sorting: CustomerSortingState;
  
  // Selection state
  selectedCustomers: string[];
  selectAll: boolean;
  
  // UI state
  showFilters: boolean;
  showBulkActions: boolean;
  
  // Bulk actions state
  bulkActions: {
    processing: boolean;
    action: CustomerBulkAction | null;
  };
}

export type CustomerBulkAction = 'delete' | 'activate' | 'deactivate' | 'export';

export interface CustomersListContextValue {
  state: CustomersListState;
  actions: CustomersListActions;
  derived: CustomersListDerivedValues;
}

export interface CustomersListActions {
  // Data loading
  loadCustomers: (params?: CustomerSearchParams) => Promise<void>;
  searchCustomers: (query: string) => Promise<void>;
  refreshCustomers: () => Promise<void>;
  
  // Pagination
  goToPage: (page: number) => Promise<void>;
  nextPage: () => Promise<void>;
  previousPage: () => Promise<void>;
  setPageSize: (size: number) => Promise<void>;
  
  // Filtering and sorting
  setFilter: (key: keyof CustomerFilters, value: any) => void;
  clearFilters: () => void;
  setSorting: (field: CustomerSortField, direction: 'asc' | 'desc') => void;
  toggleSorting: (field: CustomerSortField) => void;
  
  // Selection management
  selectCustomer: (id: string) => void;
  selectAllCustomers: () => void;
  clearSelection: () => void;
  
  // Bulk operations
  performBulkAction: (action: CustomerBulkAction) => Promise<void>;
  
  // UI state
  toggleFilters: () => void;
  showBulkActionsPanel: () => void;
  hideBulkActions: () => void;
  
  // Navigation
  goToCustomer: (customerId: string, from?: string, referenceId?: string) => void;
  
  // Error handling
  clearErrors: () => void;
  retry: () => Promise<void>;
}

export interface CustomersListDerivedValues {
  hasCustomers: boolean;
  hasSelection: boolean;
  selectionCount: number;
  allSelected: boolean;
  canPerformBulkActions: boolean;
  hasActiveFilters: boolean;
  isProcessingBulkAction: boolean;
}

// === API RESPONSE TYPES ===

export interface CustomersResponse extends PaginatedResponse<Customer> {}

export interface CustomerResponse extends ApiResponse<Customer> {}

export interface CustomerStatsResponse extends ApiResponse<CustomerStats> {}

export interface CustomerCreditsResponse extends ApiResponse<CustomerCreditsData> {}

// === COMPONENT PROPS TYPES ===

export interface CustomerHeaderProps {
  customer: CustomerFormatted;
  creditBalance?: CustomerCreditBalance;
  loading?: boolean;
  onBack?: () => void;
  onAssignCredits?: () => void;
  className?: string;
}

export interface CustomerMetricsProps {
  customer?: CustomerFormatted;
  loading?: boolean;
  className?: string;
}

export interface CustomerTabsProps {
  activeTab: CustomerTab;
  customer?: CustomerFormatted;
  waitlistsCount?: number;
  creditBalance?: CustomerCreditBalance;
  onTabChange: (tab: CustomerTab) => void;
  className?: string;
}

export interface CustomerOrdersListProps {
  orders: any[];
  loading?: boolean;
  onOrderClick?: (orderId: string) => void;
  className?: string;
}

export interface CustomerCartProps {
  cartItems: any[];
  loading?: boolean;
  onProductClick?: (productId: string) => void;
  className?: string;
}

export interface CustomerWaitlistsProps {
  waitlists: any[];
  loading?: boolean;
  onWaitlistClick?: (waitlistId: string) => void;
  className?: string;
}

export interface CustomerCreditsProps {
  creditsData?: CustomerCreditsData;
  loading?: boolean;
  onAssignCredits?: () => void;
  onAdjustCredits?: () => void;
  className?: string;
}

export interface AssignCreditsModalProps {
  show: boolean;
  customer?: CustomerFormatted;
  formData: AssignCreditsFormData;
  loading?: boolean;
  onSubmit: (amount: string, description: string) => Promise<void>;
  onCancel: () => void;
  onFieldChange: (field: keyof AssignCreditsFormData, value: string) => void;
  className?: string;
}

export interface AdjustCreditsModalProps {
  show: boolean;
  customer?: CustomerFormatted;
  creditBalance?: CustomerCreditBalance;
  formData: AdjustCreditsFormData;
  loading?: boolean;
  onSubmit: (amount: string, description: string, type: 'add' | 'deduct') => Promise<void>;
  onCancel: () => void;
  onFieldChange: (field: keyof AdjustCreditsFormData, value: string) => void;
  className?: string;
}

export interface CustomerEditModalProps {
  show: boolean;
  customer?: CustomerFormatted;
  formData: CustomerFormData;
  loading?: boolean;
  onSubmit: (updates: CustomerUpdateRequest) => Promise<void>;
  onCancel: () => void;
  onFieldChange: (field: keyof CustomerFormData, value: string) => void;
  className?: string;
}

// === VALIDATION TYPES ===

export interface CustomerValidationResult {
  isValid: boolean;
  errors: string[];
  fieldErrors?: Record<string, string>;
}

export interface CustomerFormValidation extends CustomerValidationResult {}

export interface CreditAmountValidation extends CustomerValidationResult {
  amount?: number;
  maxAmount?: number;
}

// === ERROR TYPES ===

export interface CustomerError extends Error {
  field?: string;
  code?: string;
  statusCode?: number;
}

export interface CustomerValidationError extends CustomerError {
  fieldErrors: Record<string, string[]>;
}

// === UTILITY TYPES ===

export interface CustomerNavigationContext {
  from?: 'order' | 'waitlist' | 'customers';
  orderId?: string;
  waitlistId?: string;
  customerId?: string;
}

export interface CustomerMetricDisplay {
  value: string | number;
  label: string;
  color?: 'primary' | 'success' | 'warning' | 'error';
  icon?: string;
}

export interface CustomerTimelineItem {
  id: string;
  type: 'created' | 'order' | 'credit' | 'update';
  title: string;
  description: string;
  date: string;
  icon?: string;
  color?: string;
}