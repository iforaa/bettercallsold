# BetterCallSold Architecture
**Status**: ✅ **ACTIVE** | **Phase**: Production Ready  
**Last Updated**: September 2025

**Technical deep-dive into the Services + Runes + Context architecture**

## 🏗️ Core Architecture Pattern

BetterCallSold follows a **Services + Runes + Context** architecture pattern that separates concerns and maximizes Svelte 5's reactive capabilities:

### 1. Services Layer (Stateless Business Logic)
**18+ specialized services** handle API calls, data transformations, and business logic:

```javascript
// Example: OrderService.js
export class OrderService {
  static async getOrders(params = {}) { /* API call */ }
  static async updateOrder(id, updates) { /* API call */ }
  
  // Business logic methods
  static isValidStatus(status) { /* validation */ }
  static calculateOrderTotal(items) { /* calculations */ }
  static getNextValidStatuses(currentStatus) { /* business rules */ }
}
```

### 2. Global State (Reactive .svelte.js files)
**Svelte 5 runes** provide app-wide reactive state:

```javascript
// Example: orders.svelte.js
export const ordersState = $state({
  orders: [],
  loading: false,
  error: '',
  filters: { status: 'all', search: '', limit: 50 }
});

// Computed values as functions (can't export $derived from modules)
export function getFilteredOrders() {
  return ordersState.orders.filter(order => {
    // Filtering logic using reactive state
  });
}

export const ordersActions = {
  async loadOrders(params) {
    // State mutations with service calls
  }
};
```

### 3. Context APIs (Component-Tree State)
**Svelte contexts** handle UI-specific state:

```javascript
// Example: orders context for component-tree state
export function createOrdersContext() {
  const state = $state({
    selectedOrders: [],
    sortBy: 'created_at',
    showFilters: false
  });
  
  const actions = { /* UI actions */ };
  const derived = { /* computed UI state */ };
  
  return { state, actions, derived };
}
```

### 4. Components (Reactive UI)
**Reusable components** consume reactive state without managing it:

```svelte
<script>
  import { ordersState, ordersActions } from '$lib/state/orders.svelte.js';
  
  // ⚠️ CRITICAL: Never destructure runes!
  // ❌ const { loading } = ordersState; // Breaks reactivity
  // ✅ Access directly: ordersState.loading
</script>

{#if ordersState.loading}
  <LoadingState />
{:else}
  <!-- Component content -->
{/if}
```

## 📊 Services Catalog

### Core Data Services
- **`OrderService.js`** - Complete CRUD operations for orders with business logic
- **`ProductService.js`** - Product management with image upload and validation
- **`CustomerService.js`** - Customer management with order history integration
- **`WaitlistService.js`** - Waitlist management with authorization and bulk operations
- **`CollectionService.js`** - Product collections with relationship management
- **`InventoryService.js`** - Inventory tracking with low stock alerts and bulk updates
- **`UserService.js`** - User and team management with role-based permissions

### Domain-Specific Services
- **`DashboardService.js`** - Dashboard metrics with graceful error handling
- **`MobileAppService.js`** - Mobile app configuration with validation
- **`LocationService.js`** - Multi-location management
- **`ReplayService.js`** - Video replay management with analytics

### Integration Services
- **`LiveStreamService.js`** - Live streaming orchestration (coordinates multiple services)
- **`AgoraService.js`** - Video streaming integration
- **`AgoraSettingsService.js`** - Agora configuration management
- **`LiveSellingService.js`** - Live selling session management
- **`PusherService.js`** - Real-time communication
- **`ToastService.js`** - Global notification system
- **`VideoPlayerService.js`** - HLS video player management

## 📱 Global State Management

### Domain State Files (.svelte.js)
Each domain has dedicated reactive state:

- **`orders.svelte.js`** - Orders list, current order, filters, loading states
- **`products.svelte.js`** - Products, collections, form state, metrics
- **`customers.svelte.js`** - Customer data, order history, communication
- **`waitlists.svelte.js`** - Waitlist entries, metrics, bulk operations
- **`inventory.svelte.js`** - Inventory items, metrics, adjustment modal state
- **`dashboard.svelte.js`** - Dashboard metrics, health status, concurrent load protection
- **`mobile-app.svelte.js`** - App configuration, validation, preview state
- **`live-stream.svelte.js`** - Streaming state, connection management, form validation
- **`replays.svelte.js`** - Replay data, video player state, analytics
- **`users.svelte.js`** - User management, team members, permissions
- **`locations.svelte.js`** - Multi-location data and settings

### State Structure Pattern
```javascript
export const domainState = $state({
  // Core data
  items: [],
  currentItem: null,
  
  // Loading states
  loading: false,
  itemLoading: false,
  
  // Error states
  error: '',
  itemError: '',
  
  // UI state
  filters: {},
  pagination: {},
  
  // Feature-specific state
  // ... domain-specific fields
});
```

## 🎭 Context APIs

### Component-Tree Contexts
Contexts handle UI-specific state that doesn't need global scope:

- **`orders.svelte.js`** - Selection state, sorting, bulk actions
- **`products.svelte.js`** - Product selection, filtering UI state
- **`waitlists.svelte.js`** - Waitlist selection, bulk operations, filter UI

### Context Pattern
```javascript
export function createDomainContext() {
  const state = $state({
    // Component-tree specific state
    selectedItems: [],
    sortBy: 'created_at',
    sortDirection: 'desc',
    showFilters: false
  });
  
  const actions = {
    // UI actions
    selectItem(id) { /* selection logic */ },
    setSorting(field, direction) { /* sorting */ }
  };
  
  const derived = {
    // Computed UI values
    hasSelection: $derived(state.selectedItems.length > 0),
    selectionCount: $derived(state.selectedItems.length)
  };
  
  return { state, actions, derived };
}
```

## 🧩 Component Organization

### Universal State Components
**Reusable across all domains:**
- **`LoadingState.svelte`** - Universal loading spinner with message options
- **`ErrorState.svelte`** - Error display with retry/back actions
- **`EmptyState.svelte`** - Empty state with icon, title, description, actions

### Domain Components
**Organized by business domain:**

#### Dashboard Components
- **`DashboardMetrics.svelte`** - Metrics cards with loading skeletons
- **`RecentOrdersTable.svelte`** - Recent orders with navigation
- **`SalesComparisonTable.svelte`** - Sales trends with graceful error handling
- **`SystemStatus.svelte`** - Health status indicators

#### Inventory Components
- **`QuantityAdjustModal.svelte`** - Inventory adjustment with validation

#### Mobile App Components
- **`ColorPresetSelector.svelte`** - Color scheme selection with gradients
- **`ColorConfigPanel.svelte`** - Custom color configuration with live preview
- **`TabConfiguration.svelte`** - Mobile tab management with toggles
- **`MobileAppPreview.svelte`** - Interactive phone simulation

#### Live Stream Components
- **`StreamConfiguration.svelte`** - Stream settings with token validation
- **`StreamStatusDisplay.svelte`** - Connection status with live badges
- **`LiveStreamControls.svelte`** - Session management with form validation
- **`StreamMetrics.svelte`** - Analytics with detailed performance view

#### Replay Components
- **`ReplayCard.svelte`** - Replay display with thumbnails and metrics
- **`VideoPlayer.svelte`** - HLS video player with error handling and fallback
- **`ReplayMetrics.svelte`** - Statistics for individual replays or overview
- **`ProductGrid.svelte`** - Product listing with show more/less functionality

#### User Management Components
- **`UserCard.svelte`** - User display with avatars, badges, status, selection
- **`UserTable.svelte`** - Data table with sorting, pagination, responsive design
- **`UserMetrics.svelte`** - User analytics with role/status breakdowns

#### Waitlist Components
- **`CustomerSection.svelte`** - Customer information display
- **`ProductSection.svelte`** - Product details in waitlist context
- **`WaitlistHeader.svelte`** - Waitlist page header with actions
- **`WaitlistMetrics.svelte`** - Waitlist analytics and insights
- **`WaitlistsTable.svelte`** - Data table with bulk operations

### Component Patterns
- **Props interfaces** with comprehensive TypeScript
- **Consistent styling** using design system classes
- **Event handling** with proper callback patterns
- **Loading states** and error boundaries
- **Responsive design** with mobile considerations

## 🎨 CSS Design System

### Design Tokens (`tokens.css`)
**Complete design token system** with Shopify-exact values:

```css
:root {
  /* Colors - Shopify-inspired */
  --color-primary: #202223;
  --color-accent: #005bd3;
  --color-success: #00a96e;
  
  /* Typography */
  --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-size-sm: 0.875rem;
  
  /* Spacing Scale */
  --space-2: 0.5rem;
  --space-4: 1rem;
  
  /* Layout */
  --header-height: 48px;
  --sidebar-width: 232px;
}
```

### Component CSS Architecture
**Modular component styles** organized by purpose:

#### Core Components (`components/`)
- **`buttons.css`** - Complete button system with variants, sizes, states
- **`cards.css`** - Card layouts with shadows and borders
- **`badges.css`** - Status badges with color variants
- **`forms.css`** - Form elements with focus states
- **`tables.css`** - Data tables with sorting and selection
- **`modals.css`** - Modal overlays and content
- **`loading.css`** - Loading spinners and skeleton screens
- **`notifications.css`** - Toast notifications and alerts

#### Layout Styles (`layouts/`)
- **`page.css`** - Page-level layout patterns
- **`content.css`** - Content area layouts

### Design System Classes
```css
/* Button System */
.btn-primary { /* Primary actions */ }
.btn-secondary { /* Secondary actions */ }
.btn-accent { /* Accent actions */ }

/* Card System */
.metric-card { /* Dashboard metrics */ }
.status-card { /* Status displays */ }
.info-card { /* Information cards */ }

/* Status System */
.status-badge { /* Base status badge */ }
.status-pending { /* Pending status */ }
.status-completed { /* Completed status */ }

/* Table System */
.data-table { /* Data table base */ }
.table-header { /* Table headers */ }
.table-row { /* Table rows */ }
```

## 🗄️ Database Architecture

### Neon PostgreSQL Setup
**Serverless PostgreSQL** with multi-tenant architecture:

```sql
-- Multi-tenant pattern
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  status VARCHAR(50) NOT NULL,
  total_amount DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- JSONB for complex data
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  variants JSONB,  -- Complex product variants
  images JSONB,    -- Image metadata
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Database Discovery
**Use psql for current schema inspection:**

```bash
# Connect to Neon database
psql $DATABASE_URL

# Essential commands
\dt                              # List all tables
\d table_name                    # Describe table structure
SELECT * FROM products LIMIT 5;  # Sample data
\di                              # List indexes
\df                              # List functions

# Multi-tenant queries
SELECT DISTINCT tenant_id FROM orders;
SELECT COUNT(*) FROM products WHERE tenant_id = 'your-tenant-id';
```

### Key Database Patterns
- **Multi-tenant isolation**: All queries include `tenant_id` WHERE clauses
- **UUID primary keys**: Using PostgreSQL's `uuid_generate_v4()` function
- **JSONB storage**: Complex data like product variants, images, metadata
- **Timestamp tracking**: `created_at` and `updated_at` for audit trails
- **Proper indexing**: Multi-column indexes on `(tenant_id, created_at)` patterns

## 🔗 API Architecture

### Admin API Endpoints (60+)
**RESTful API** organized by domain:

#### Core Resource APIs
- **`/api/orders`** - Order CRUD with status management
- **`/api/products`** - Product management with variants and images
- **`/api/customers`** - Customer management with order history
- **`/api/collections`** - Product collections with relationships
- **`/api/inventory`** - Inventory tracking with adjustments
- **`/api/waitlists`** - Waitlist management with authorization

#### Integration APIs
- **`/api/cs-sync/`** - CommentSold synchronization endpoints
  - `/products` - Product sync from CommentSold
  - `/collections` - Collection sync
  - `/replays` - Replay sync
- **`/api/live-selling/`** - Live streaming management
- **`/api/pusher/`** - Real-time communication endpoints
- **`/api/agora/`** - Video streaming configuration

#### Utility APIs
- **`/api/health`** - System health checks
- **`/api/stats`** - Dashboard statistics
- **`/api/debug/`** - Development debugging endpoints
- **`/api/migrations/`** - Database migration endpoints

### Mobile API (`/api/mobile/`)
**CommentSold-compatible endpoints** for React Native app:

```javascript
// Product endpoints
GET  /api/mobile/products/find    // Product search with filtering
GET  /api/mobile/products/{id}    // Product details
GET  /api/mobile/collections      // Collections with product counts
GET  /api/mobile/search           // Product search with relevance

// Cart management
GET  /api/mobile/cart            // Current cart state
POST /api/mobile/cart/add        // Add to cart (or waitlist if unavailable)
GET  /api/mobile/cart/count      // Cart item count

// Waitlist management
GET  /api/mobile/waitlist        // User's waitlist
DELETE /api/mobile/waitlist/{id} // Remove from waitlist
POST /api/mobile/waitlist/{id}/preauth // Preauthorize payment

// Configuration
GET  /api/mobile/filters         // Available product filters
POST /api/mobile/setup           // Initialize mobile database tables
```

### API Patterns
- **Multi-tenant**: All endpoints validate `tenant_id`
- **Error handling**: Consistent error responses with HTTP status codes
- **Pagination**: Cursor-based pagination with `last_post_id`
- **Filtering**: Comprehensive filtering with query parameters
- **CORS handling**: Server-side proxy endpoints for external APIs

## 📱 Mobile App Integration

### React Native/Expo Application
**Full-featured mobile application** with professional architecture:

#### Mobile Architecture
```typescript
// Services layer
services/
├── api.ts              // API client configuration
├── cartService.ts      // Cart management
├── productService.ts   // Product operations
├── liveSaleService.ts  // Live streaming
└── pusherManager.ts    // Real-time communication

// React contexts
contexts/
├── CartContext.tsx     // Cart state management
├── FavoritesContext.tsx // Favorites management
└── LiveSalesContext.tsx // Live streaming state

// Custom hooks
hooks/
├── useAsyncData.ts     // Async data fetching
├── useCheckout.ts      // Checkout process
└── useLiveSaleScreen.ts // Live sale functionality
```

#### Key Mobile Features
- **Product Catalog** - Search, filtering, collections
- **Live Sales** - Real-time video streaming with Agora SDK
- **Cart Management** - Smart cart/waitlist switching
- **Favorites** - Product bookmarking with sync
- **User Account** - Profile and order management
- **Push Notifications** - Order updates and live sale notifications

### Mobile API Compatibility
**CommentSold-compatible responses** ensure seamless integration:

```javascript
// Transform internal data to CommentSold format
const mobileProduct = {
  product_id: product.id,
  post_id: product.id,
  product_name: product.name,
  created_at: Math.floor(new Date(product.created_at).getTime() / 1000),
  price: product.price,
  price_label: `$${product.price}`,
  thumbnail: product.images?.[0]?.url || null,
  inventory: product.variants?.map(variant => ({
    inventory_id: variant.id,
    size: variant.size,
    color: variant.color,
    quantity: variant.quantity
  })) || []
};
```

## 🚨 Critical Svelte 5 Patterns & Gotchas

### ⚠️ Never Destructure Runes
**Destructuring breaks Svelte 5's Proxy-based reactivity:**

```javascript
// ❌ WRONG - Breaks reactivity!
const { loading, error } = ordersState;
if (loading) { /* Won't update */ }

// ✅ CORRECT - Maintains reactivity
if (ordersState.loading) { /* Reactive */ }
{#if ordersState.loading} <!-- Reactive in templates --> {/if}
```

### ⚠️ $derived Cannot Be Exported from Modules
**Use functions instead of exported $derived:**

```javascript
// ❌ WRONG - Cannot export $derived from .svelte.js files
export const filteredOrders = $derived(/* ... */);

// ✅ CORRECT - Export functions, use $derived in components
export function getFilteredOrders() {
  return ordersState.orders.filter(/* filtering logic */);
}

// In components:
const filteredOrders = $derived(getFilteredOrders());
```

### ⚠️ $derived Must Be Top-Level Declarations
**Cannot use $derived in object properties:**

```javascript
// ❌ WRONG - $derived in object property
const context = {
  hasSelection: $derived(state.selectedItems.length > 0)
};

// ✅ CORRECT - Top-level declarations
const hasSelection = $derived(state.selectedItems.length > 0);
const context = {
  get hasSelection() { return hasSelection; }
};
```

### ⚠️ $effect() Loop Prevention
**Add dependency checks to prevent infinite loops:**

```javascript
// ❌ WRONG - Can cause infinite API calls
$effect(() => {
  loadData(); // Runs on every state change
});

// ✅ CORRECT - Add dependency checks
$effect(() => {
  if (!state.lastFetch || isStale(state.lastFetch)) {
    loadData();
  }
});

// Also add concurrent load protection in services
if (state.loading) return; // Prevent multiple concurrent loads
```

### ⚠️ Arrow Function Issues in $derived
**Don't use arrow functions in $derived:**

```javascript
// ❌ WRONG - Displays "() => someValue" instead of actual value
const computed = $derived(() => someValue);

// ✅ CORRECT - Use direct expressions
const computed = $derived(someValue);
```

## 📋 TypeScript Architecture

### Type Organization
**100+ TypeScript interfaces** organized by domain:

#### Common Types (`common.ts`)
```typescript
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
}
```

#### Domain-Specific Types
- **`orders.ts`** - Order, OrderItem, OrderStatus, ShippingAddress
- **`products.ts`** - Product, ProductVariant, ProductImage, Collection
- **`customers.ts`** - Customer, CustomerAddress, CustomerMetrics
- **`inventory.ts`** - InventoryItem, StockStatus, QuantityAdjustment
- **`waitlists.ts`** - WaitlistEntry, WaitlistStatus, WaitlistMetrics
- **`users.ts`** - User, UserRole, Permission, TeamMember
- **`live-stream.ts`** - StreamStatus, ConnectionState, StreamMetrics
- **`replays.ts`** - Replay, VideoMetadata, ReplayAnalytics
- **`mobile-app.ts`** - MobileAppConfig, ColorPreset, TabConfiguration

### Component Props Interfaces
**Comprehensive prop typing** for all components:

```typescript
// Example: UserCard component props
interface UserCardProps {
  user: UserFormatted;
  selectable?: boolean;
  selected?: boolean;
  showActions?: boolean;
  onSelect?: (id: string) => void;
  onEdit?: (user: User) => void;
  onDelete?: (id: string) => void;
}
```

## 🔧 Development Patterns

### Service Development Pattern
1. **Create stateless service class** with static methods
2. **Implement API calls** with proper error handling
3. **Add business logic methods** for validation and calculations
4. **Export TypeScript interfaces** for data structures

### State Management Pattern
1. **Create reactive state** with `$state()` in .svelte.js files
2. **Export computed functions** (not $derived) for calculations
3. **Implement actions object** for state mutations
4. **Add loading and error states** for all async operations

### Component Development Pattern
1. **Define TypeScript props interface** with comprehensive typing
2. **Import reactive state** and access properties directly (never destructure)
3. **Use universal state components** for loading/error/empty states
4. **Follow design system classes** for consistent styling

### Testing & Debugging Workflow
1. **Test APIs with cURL** before building any UI
2. **Inspect database** with psql to verify data structure
3. **Use interactive test pages** (`/test-cs-api`) for comprehensive testing
4. **Build components** only after data flow is verified

---

**This architecture provides a scalable, maintainable foundation for complex e-commerce management while leveraging modern web technologies and patterns.**