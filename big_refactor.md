# <� BetterCallSold - Comprehensive Refactoring Plan

> **Strategic refactoring guide for systematically improving the entire codebase while maintaining excellent CSS architecture**

## <� **Refactoring Goals**

### **Primary Objectives**
1. **Eliminate Code Duplication**: Create reusable patterns for common functionality
2. **Strengthen Type Safety**: Replace `any` types with proper interfaces
3. **Enhance Developer Experience**: Consistent patterns across all pages
4. **Improve Maintainability**: Centralized logic for easier updates
5. **Optimize Performance**: Better state management and data fetching
6. **Leverage Design System**: Maximize usage of existing CSS components

### **Core Principles**
-  **Keep existing CSS architecture** - it's already excellent
-  **Maintain current design patterns** - focus on logic, not UI
-  **Progressive enhancement** - refactor incrementally
-  **Backward compatibility** - don't break existing functionality

---

## =' **Universal Refactoring Patterns**

**UPDATED FOR SVELTE 5 (2025)** - Using proper Svelte 5 architecture with runes + context + services

### **1. Services Layer (Stateless Business Logic)**

**Stateless services** handle pure business logic, API calls, and data transformations:

```typescript
// src/lib/services/OrderService.js
export class OrderService {
  static async getOrders(params = {}) {
    const searchParams = new URLSearchParams();
    
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.status) searchParams.set('status', params.status);
    if (params.search) searchParams.set('q', params.search);
    
    const url = `/api/orders${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  }

  static async getOrder(id) {
    const response = await fetch(`/api/orders/${id}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  }

  static async updateOrder(id, updates) {
    const response = await fetch(`/api/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  }

  static async deleteOrder(id) {
    const response = await fetch(`/api/orders/${id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return true;
  }
}
```

### **2. Global State with Runes (.svelte.js files)**

**Reactive global state** using Svelte 5 runes with universal reactivity:

```javascript
// src/lib/state/orders.svelte.js
import { OrderService } from '../services/OrderService.js';

// IMPORTANT: Use objects for automatic proxy reactivity
export const ordersState = $state({
  // Orders list state
  orders: [],
  loading: false,
  error: '',
  lastFetch: null,
  
  // Single order state
  currentOrder: null,
  orderLoading: false,
  orderError: '',
  
  // UI state
  filters: {
    status: 'all',
    search: '',
    limit: 50
  }
});

// Computed values using $derived
export const filteredOrders = $derived(() => {
  if (!ordersState.orders) return [];
  
  return ordersState.orders.filter(order => {
    const matchesStatus = ordersState.filters.status === 'all' || 
                         order.status === ordersState.filters.status;
    const matchesSearch = !ordersState.filters.search ||
                         order.customer_name.toLowerCase().includes(ordersState.filters.search.toLowerCase()) ||
                         order.customer_email.toLowerCase().includes(ordersState.filters.search.toLowerCase());
    return matchesStatus && matchesSearch;
  });
});

export const orderMetrics = $derived(() => {
  if (!ordersState.orders) return { total: 0, revenue: 0, statusCounts: {} };
  
  const statusCounts = ordersState.orders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {});
  
  const revenue = ordersState.orders.reduce((sum, order) => sum + order.total_amount, 0);
  
  return {
    total: ordersState.orders.length,
    revenue,
    statusCounts
  };
});

// Actions for state management
export const ordersActions = {
  async loadOrders(params) {
    ordersState.loading = true;
    ordersState.error = '';
    
    try {
      const orders = await OrderService.getOrders(params);
      ordersState.orders = orders;
      ordersState.lastFetch = new Date();
    } catch (error) {
      ordersState.error = error.message;
      console.error('Failed to load orders:', error);
    } finally {
      ordersState.loading = false;
    }
  },

  async loadOrder(id) {
    ordersState.orderLoading = true;
    ordersState.orderError = '';
    
    try {
      const order = await OrderService.getOrder(id);
      ordersState.currentOrder = order;
    } catch (error) {
      ordersState.orderError = error.message;
      console.error('Failed to load order:', error);
    } finally {
      ordersState.orderLoading = false;
    }
  },

  async updateOrder(id, updates) {
    try {
      const updatedOrder = await OrderService.updateOrder(id, updates);
      
      // Update current order if it's the one being edited
      if (ordersState.currentOrder?.id === id) {
        ordersState.currentOrder = updatedOrder;
      }
      
      // Update in orders list
      const index = ordersState.orders.findIndex(order => order.id === id);
      if (index !== -1) {
        ordersState.orders[index] = updatedOrder;
      }
      
      return updatedOrder;
    } catch (error) {
      ordersState.orderError = error.message;
      throw error;
    }
  },

  setFilter(key, value) {
    ordersState.filters[key] = value;
  },

  clearCurrentOrder() {
    ordersState.currentOrder = null;
    ordersState.orderError = '';
  },

  retry() {
    if (ordersState.error) {
      return this.loadOrders(ordersState.filters);
    }
    if (ordersState.orderError && ordersState.currentOrder) {
      return this.loadOrder(ordersState.currentOrder.id);
    }
  }
};
```

### **3. Context API for Component-Tree State**

**Component-scoped reactive state** using Svelte's context API:

```javascript
// src/lib/contexts/orders.svelte.js
import { setContext, getContext } from 'svelte';

const ORDERS_CONTEXT = 'orders';

export function createOrdersContext() {
  // Local component-tree state
  const state = $state({
    selectedOrders: [],
    sortBy: 'created_at',
    sortDirection: 'desc',
    showFilters: false,
    bulkActions: {
      processing: false,
      selected: 'none'
    }
  });

  const actions = {
    selectOrder(id) {
      const index = state.selectedOrders.indexOf(id);
      if (index > -1) {
        state.selectedOrders.splice(index, 1);
      } else {
        state.selectedOrders.push(id);
      }
    },

    selectAllOrders(orderIds) {
      state.selectedOrders = [...orderIds];
    },

    clearSelection() {
      state.selectedOrders = [];
    },

    setSorting(field, direction) {
      state.sortBy = field;
      state.sortDirection = direction;
    },

    toggleFilters() {
      state.showFilters = !state.showFilters;
    },

    async performBulkAction(action) {
      state.bulkActions.processing = true;
      try {
        // Implement bulk actions here
        console.log(`Performing ${action} on orders:`, state.selectedOrders);
        // Clear selection after action
        state.selectedOrders = [];
      } catch (error) {
        console.error('Bulk action failed:', error);
        throw error;
      } finally {
        state.bulkActions.processing = false;
      }
    }
  };

  // Derived values for the context
  const derived = {
    hasSelection: $derived(() => state.selectedOrders.length > 0),
    selectionCount: $derived(() => state.selectedOrders.length)
  };

  const context = { state, actions, derived };
  setContext(ORDERS_CONTEXT, context);
  
  return context;
}

export function getOrdersContext() {
  const context = getContext(ORDERS_CONTEXT);
  if (!context) {
    throw new Error('getOrdersContext must be called within a component that has createOrdersContext in its tree');
  }
  return context;
}
```

### **2. Universal State Components**

**Base State Components** - Used across all pages:

```typescript
// src/lib/components/states/LoadingState.svelte
<script lang="ts">
  interface Props {
    message?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    inline?: boolean;
  }
  
  let { message = 'Loading...', size = 'md', inline = false }: Props = $props();
</script>

<div class="loading-state" class:loading-state-inline={inline}>
  <div class="spinner spinner-{size}"></div>
  {#if message}<h3 class="loading-text-lg">{message}</h3>{/if}
</div>

// src/lib/components/states/ErrorState.svelte
<script lang="ts">
  interface Props {
    error: string;
    title?: string;
    onRetry?: () => void;
    onBack?: () => void;
    retryLabel?: string;
    backLabel?: string;
  }
  
  let { 
    error, 
    title = 'Error', 
    onRetry, 
    onBack,
    retryLabel = 'Try Again',
    backLabel = 'Go Back'
  }: Props = $props();
</script>

<div class="error-state">
  <div class="error-icon">�</div>
  <h3 class="error-title">{title}</h3>
  <p class="error-description">{error}</p>
  <div class="error-actions">
    {#if onRetry}
      <button class="btn btn-secondary" onclick={onRetry}>{retryLabel}</button>
    {/if}
    {#if onBack}
      <button class="btn btn-primary" onclick={onBack}>{backLabel}</button>
    {/if}
  </div>
</div>
```

### **3. Universal Utility System**

```typescript
// src/lib/utils/index.ts - Centralized utilities
export * from './formatters.ts';
export * from './status.ts';
export * from './validation.ts';
export * from './navigation.ts';

// src/lib/utils/formatters.ts
export const currency = (amount: number, currency = 'USD') => 
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);

export const date = (dateString: string) => new Date(dateString).toLocaleDateString();
export const dateTime = (dateString: string) => new Date(dateString).toLocaleString();
export const relativeTime = (dateString: string) => {
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const diff = Date.now() - new Date(dateString).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return rtf.format(-days, 'day');
  if (days < 30) return rtf.format(-Math.floor(days / 7), 'week');
  return rtf.format(-Math.floor(days / 30), 'month');
};

// src/lib/utils/status.ts
export const STATUS_COLORS = {
  // Orders
  pending: 'warning',
  paid: 'success', 
  processing: 'accent',
  completed: 'success',
  cancelled: 'error',
  // Customers
  active: 'success',
  inactive: 'error',
  // Products
  draft: 'warning',
  published: 'success',
  archived: 'error',
  // Collections
  visible: 'success',
  hidden: 'warning'
} as const;

export const getStatusColor = (status: string): string => 
  STATUS_COLORS[status as keyof typeof STATUS_COLORS] || 'default';
```

### **4. Comprehensive Type System**

```typescript
// src/lib/types/common.ts
export interface BaseEntity {
  id: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

// src/lib/types/orders.ts
export interface Order extends BaseEntity {
  customer_id: string;
  customer_name: string;
  customer_email: string;
  status: 'pending' | 'paid' | 'processing' | 'completed' | 'cancelled';
  total_amount: number;
  payment_method: string;
  payment_id?: {
    Valid: boolean;
    String: string;
  };
  shipping_address?: ShippingAddress;
  items?: OrderItem[];
}

// Continue for all entities...
```

---

## =� **Page-by-Page Refactoring Plan**

### **✅ Home Page (Dashboard) - COMPLETED**
**Previous Issues:**
- Mixed data fetching patterns
- Hardcoded fallback stats
- Repeated loading states
- Infinite API retry loops for missing endpoints

**Refactoring Completed:**
1. ✅ Created `DashboardService.js` with graceful error handling for missing endpoints
2. ✅ Created `dashboard.svelte.js` with proper Services + Runes + Context architecture
3. ✅ Built reusable dashboard components (DashboardMetrics, RecentOrdersTable, etc.)
4. ✅ Added proper error boundaries and loading states for each section
5. ✅ Fixed infinite retry loops with dependency checks and concurrent load protection

**Components Created:**
- ✅ `src/lib/services/DashboardService.js` - API calls with graceful 404 handling
- ✅ `src/lib/state/dashboard.svelte.js` - Global reactive state management
- ✅ `src/lib/components/dashboard/DashboardMetrics.svelte` - Metrics cards grid
- ✅ `src/lib/components/dashboard/RecentOrdersTable.svelte` - Recent orders display
- ✅ `src/lib/components/dashboard/SalesComparisonTable.svelte` - Sales trends with loading skeletons
- ✅ `src/lib/components/dashboard/SystemStatus.svelte` - Health status indicator
- ✅ `src/lib/types/dashboard.ts` - TypeScript interfaces

**Key Fixes Applied:**
- ✅ **$effect() Loop Prevention**: Added dependency checks to prevent infinite API calls
- ✅ **Concurrent Load Protection**: Prevents multiple simultaneous dashboard loads
- ✅ **Graceful Error Handling**: Missing endpoints return default data instead of erroring
- ✅ **Code Reduction**: Dashboard page reduced from 403 to ~140 lines (65% reduction)

---

### **=� Orders Pages**
**Current Issues:** *(As analyzed)*
- Duplicated data fetching logic
- `any` types throughout
- Repeated utility functions

**Refactoring Steps:**
1.  Create `useOrders()` and `useOrder()` hooks
2.  Extract state components (LoadingState, ErrorState)
3.  Add proper TypeScript interfaces
4.  Create OrderHeader, OrderItems, CustomerInfo components
5.  Centralize utility functions

**Key Components to Create:**
- `src/lib/components/orders/OrdersTable.svelte`
- `src/lib/components/orders/OrderMetrics.svelte`
- `src/lib/components/orders/OrderHeader.svelte`
- `src/lib/components/orders/OrderItems.svelte`

---

### **� Waitlists Pages**
**Anticipated Issues:**
- Similar patterns to orders (list + detail)
- Likely has status management
- Customer assignment logic

**Refactoring Strategy:**
1. Create `useWaitlists()` and `useWaitlist()` hooks
2. Reuse state components from orders refactor
3. Create waitlist-specific status utilities
4. Add customer assignment components
5. Implement bulk actions for waitlist management

**Key Components to Create:**
- `src/lib/components/waitlists/WaitlistTable.svelte`
- `src/lib/components/waitlists/CustomerAssignment.svelte`
- `src/lib/components/waitlists/WaitlistActions.svelte`

---

### **<� Products Pages**
**Anticipated Issues:**
- Complex product variants handling
- Image management
- Inventory integration
- Collection relationships

**Refactoring Strategy:**
1. Create `useProducts()` and `useProduct()` hooks
2. Build variant management components
3. Create image upload/management system
4. Add inventory integration hooks
5. Implement collection tagging system

**Key Components to Create:**
- `src/lib/components/products/ProductsGrid.svelte`
- `src/lib/components/products/ProductForm.svelte`
- `src/lib/components/products/VariantManager.svelte`
- `src/lib/components/products/ImageUploader.svelte`
- `src/lib/components/products/InventoryStatus.svelte`

---

### **=� Collections Pages**
**Anticipated Issues:**
- Product relationship management
- Drag-and-drop sorting
- Nested collection hierarchies

**Refactoring Strategy:**
1. Create `useCollections()` and `useCollection()` hooks
2. Build product selection components
3. Add drag-and-drop functionality
4. Create collection hierarchy management
5. Implement bulk product operations

**Key Components to Create:**
- `src/lib/components/collections/CollectionGrid.svelte`
- `src/lib/components/collections/ProductSelector.svelte`
- `src/lib/components/collections/CollectionTree.svelte`

---

### **=� Inventory Pages**
**Anticipated Issues:**
- Real-time stock tracking
- Bulk updates
- Supplier management
- Location tracking

**Refactoring Strategy:**
1. Create `useInventory()` hooks with real-time updates
2. Build bulk editing components
3. Add supplier management system
4. Create location-based inventory views
5. Implement low-stock alerts

**Key Components to Create:**
- `src/lib/components/inventory/InventoryTable.svelte`
- `src/lib/components/inventory/BulkEditor.svelte`
- `src/lib/components/inventory/StockAlerts.svelte`

---

### **=e Customers Pages**
**Anticipated Issues:**
- Order history integration
- Contact management
- Segmentation logic

**Refactoring Strategy:**
1. Create `useCustomers()` and `useCustomer()` hooks
2. Build customer profile components
3. Add order history integration
4. Create customer segmentation tools
5. Implement communication tracking

**Key Components to Create:**
- `src/lib/components/customers/CustomersTable.svelte`
- `src/lib/components/customers/CustomerProfile.svelte`
- `src/lib/components/customers/OrderHistory.svelte`

---

### **=� Live & Replays Pages**
**Anticipated Issues:**
- Video player integration
- Real-time chat
- Stream management
- Analytics tracking

**Refactoring Strategy:**
1. Create `useLive()` and `useReplays()` hooks
2. Build video player components
3. Add real-time chat integration
4. Create stream analytics dashboard
5. Implement viewer engagement tracking

**Key Components to Create:**
- `src/lib/components/live/StreamPlayer.svelte`
- `src/lib/components/live/ChatInterface.svelte`
- `src/lib/components/live/StreamMetrics.svelte`

---

### **< Web Store & Mobile App Pages**
**Anticipated Issues:**
- Theme management
- Mobile responsiveness
- Store configuration
- App settings synchronization

**Refactoring Strategy:**
1. Create `useStoreConfig()` hooks
2. Build theme management components
3. Add responsive preview functionality
4. Create settings synchronization
5. Implement store analytics

**Key Components to Create:**
- `src/lib/components/store/ThemePreview.svelte`
- `src/lib/components/store/ConfigPanel.svelte`
- `src/lib/components/store/MobilePreview.svelte`

---

## =� **Implementation Strategy**

### **Phase 1: Foundation (Week 1-2)**
1.  Create base hook system (`useApiCall`)
2.  Build universal state components
3.  Establish type system foundation
4.  Set up utility functions

### **Phase 2: Core Pages (Week 3-4)**
1.  Refactor Orders pages (list + detail)
2. = Refactor Waitlists pages
3. = Refactor Products pages
4. = Refactor Collections pages

### **Phase 3: Management Pages (Week 5-6)**
1. = Refactor Inventory pages
2. = Refactor Customers pages
3. = Refactor Dashboard (Home)

### **Phase 4: Advanced Features (Week 7-8)**
1. = Refactor Live & Replays pages
2. = Refactor Store configuration pages
3. = Final testing and optimization

---

## =� **Success Metrics**

### **Code Quality Improvements**
- **Type Coverage**: 0% � 95%+ (eliminate `any` types)
- **Code Duplication**: -60% (shared components and hooks)
- **Bundle Size**: Optimize through better tree-shaking
- **Performance**: Reduce re-renders through better state management

### **Developer Experience**
- **Consistency**: Standardized patterns across all pages
- **Maintainability**: Centralized logic for easier updates
- **Extensibility**: Easy to add new pages following established patterns
- **Documentation**: Self-documenting code through TypeScript

### **User Experience**
- **Loading States**: Consistent loading experiences
- **Error Handling**: Better error messages and recovery options
- **Performance**: Faster page loads and interactions
- **Reliability**: Fewer bugs through better type safety

---

## =' **Refactoring Checklist Template**

**For each page refactor, ensure:**

### **Data & State**
- [ ] Replace `any` types with proper interfaces
- [ ] Use appropriate specialized hooks (`useOrders`, `useProducts`, etc.)
- [ ] Implement proper error boundaries
- [ ] Add loading and empty states

### **Components**
- [ ] Extract reusable UI components
- [ ] Use existing design system classes
- [ ] Implement proper TypeScript props
- [ ] Add responsive design considerations

### **Logic**
- [ ] Move business logic to hooks or utilities
- [ ] Centralize API calls
- [ ] Add proper validation
- [ ] Implement optimistic updates where appropriate

### **Testing**
- [ ] Ensure all existing functionality works
- [ ] Test error scenarios
- [ ] Verify responsive design
- [ ] Check accessibility compliance

---

## =� **Page Status Tracking**

| Page | Status | Components Created | Services Created | Types Added | Notes |
|------|---------|-------------------|------------------|-------------|-------|
| **Home (Dashboard)** | = Pending | - | - | - | Complex multi-data dashboard |
| **Orders List** |  Ready | LoadingState, ErrorState | useApiCall | Order, OrderItem | Template for other list pages |
| **Order Details** |  Ready | OrderHeader, OrderItems | useOrder | - | Template for other detail pages |
| **Waitlists List** | = Pending | - | - | - | Similar pattern to orders |
| **Waitlist Details** | = Pending | - | - | - | Customer assignment logic |
| **Products List** | = Pending | - | - | - | Complex with variants/images |
| **Product Details** | = Pending | - | - | - | Variant management |
| **Collections List** | = Pending | - | - | - | Drag-drop functionality |
| **Collection Details** | = Pending | - | - | - | Product relationship management |
| **Inventory** | = Pending | - | - | - | Real-time stock tracking |
| **Inventory Details** | = Pending | - | - | - | Part of product details |
| **Customers List** | = Pending | - | - | - | Segmentation features |
| **Customer Details** | = Pending | - | - | - | Order history integration |
| **Live** | = Pending | - | - | - | Video streaming features |
| **Replays List** | = Pending | - | - | - | Video management |
| **Replay Details** | = Pending | - | - | - | Analytics and metrics |
| **Web Store** | = Pending | - | - | - | Theme and configuration |
| **Mobile App** | = Pending | - | - | - | Settings synchronization |

---

## <� **Key Principles for Future Refactoring** *(Updated for Svelte 5)*

**UPDATED ARCHITECTURE:** Services + Runes + Context (No Hooks!)

1. **Service first** - Create stateless services for business logic and API calls
2. **State second** - Define reactive state with $state runes in .svelte.js files  
3. **Context third** - Add component-tree state using Svelte's context API when needed
4. **Types throughout** - Use proper TypeScript interfaces (no more `any`)
5. **Components last** - Build reusable UI components that consume reactive state
6. **Test thoroughly** - Each refactor should maintain all existing functionality
7. **Keep CSS intact** - Focus on logic, not visual design
8. **Universal reactivity** - Leverage runes' ability to work everywhere, not just components

**Pattern Template:**
- `/services/` - Stateless business logic (API calls, transformations)
- `/state/` - Reactive global state (.svelte.js files with $state)
- `/contexts/` - Component-tree scoped state (selection, UI state)
- `/components/` - Reusable UI that consumes reactive state

## ⚠️ **Critical Svelte 5 Gotchas**

### **NEVER Destructure Reactive State**
```javascript
// ❌ WRONG - Breaks reactivity!
const { loading, error } = ordersState;

// ✅ CORRECT - Maintains reactivity
// Access properties directly
{#if ordersState.loading}
  <LoadingState />
{/if}
```

### **$derived Cannot Be Exported from Modules**
```javascript
// ❌ WRONG - Cannot export $derived from .svelte.js files
export const filteredOrders = $derived(...);

// ✅ CORRECT - Export functions, use $derived in components
export function getFilteredOrders() { return filtered; }

// In components:
const orders = $derived(getFilteredOrders());
```

### **$derived Must Be Top-Level Variable Declarations**
```javascript
// ❌ WRONG - $derived in object property
const derived = {
  hasSelection: $derived(state.selectedOrders.length > 0)
};

// ✅ CORRECT - Top-level declarations
const hasSelection = $derived(state.selectedOrders.length > 0);
const derived = {
  get hasSelection() { return hasSelection; }
};
```

### **$effect() Can Cause Infinite Loops**
```javascript
// ❌ WRONG - Bare $effect can cause infinite API calls
$effect(() => {
  loadData(); // Runs repeatedly if state changes during load
});

// ✅ CORRECT - Add dependency checks
$effect(() => {
  if (!state.lastFetch || isStale(state.lastFetch)) {
    loadData();
  }
});

// Also add concurrent load protection in services:
if (state.loading) return; // Prevent multiple concurrent loads
```

---

## 📊 **Component Inventory System**

**Track all reusable assets in `COMPONENT_INVENTORY.md` to prevent duplication:**
- **Before creating new components**: Check inventory first
- **After completing refactoring**: Update inventory with new assets
- **Document critical fixes**: Record solutions for future reference
- **Architecture patterns**: Track established Services + Runes + Context patterns

**Current Inventory Status:**
- ✅ Universal state components (LoadingState, ErrorState, EmptyState)
- ✅ Orders domain (OrderService, orders.svelte.js, order types)
- ✅ Dashboard domain (DashboardService, dashboard.svelte.js, dashboard components)
- ✅ Critical Svelte 5 gotchas and fixes documented

---

*This refactoring plan serves as the master guide for systematically improving the entire BetterCallSold codebase while maintaining the excellent CSS architecture and design patterns already in place.*