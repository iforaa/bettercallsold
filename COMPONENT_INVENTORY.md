# 📋 BetterCallSold - Component & Asset Inventory

> **Purpose**: Track all reusable components, services, types, and utilities to prevent duplication and ensure consistency across the application.

## 🧩 **Reusable Components**

### **Universal State Components**
- ✅ `LoadingState.svelte` - Universal loading spinner with message and size options
- ✅ `ErrorState.svelte` - Error display with retry/back actions
- ✅ `EmptyState.svelte` - Empty state display with icon, title, description, actions

### **Domain Components**
- ✅ `ProductForm.svelte` - Reusable product form component with image upload, variant management, and collections
- ✅ `QuantityAdjustModal.svelte` - Reusable inventory quantity adjustment modal with validation and business logic
- ✅ `ColorPresetSelector.svelte` - Reusable color preset selection component with gradient previews
- ✅ `ColorConfigPanel.svelte` - Custom color configuration with live preview and dual input (picker + text)
- ✅ `TabConfiguration.svelte` - Mobile app tab management with toggle switches and validation
- ✅ `MobileAppPreview.svelte` - Interactive mobile app preview modal with phone simulation
- ✅ `StreamConfiguration.svelte` - Stream settings management with token validation and form handling
- ✅ `StreamStatusDisplay.svelte` - Status indicator with compact and full view modes, real-time connection status
- ✅ `LiveStreamControls.svelte` - Live selling session management with form validation and start/stop controls
- ✅ `StreamMetrics.svelte` - Stream analytics display with optional detailed view and performance metrics
- ✅ `ReplayCard.svelte` - Reusable replay item display with thumbnail, metrics, selection, and clickable/selectable modes
- ✅ `VideoPlayer.svelte` - Complete HLS video player with error handling, fallback, and custom controls
- ✅ `ReplayMetrics.svelte` - Statistics display for single replays or analytics overview with detailed breakdowns
- ✅ `ProductGrid.svelte` - Product listing with show more/less functionality and responsive grid layout
- ✅ `UserCard.svelte` - Reusable user display with avatar, role badges, status indicators, selection, and actions
- ✅ `UserTable.svelte` - Data table with sorting, selection, pagination, loading states, and responsive design
- ✅ `UserMetrics.svelte` - User analytics display with role/status breakdowns and activity insights

### **UI Components**
*(Track any reusable UI components here)*

---

## 🔧 **Services** (Stateless Business Logic)

### **Data Services**
- ✅ `OrderService.js` - Complete CRUD operations for orders
  - `getOrders(params)` - List orders with filtering
  - `getOrder(id)` - Single order details
  - `updateOrder(id, updates)` - Update order
  - `deleteOrder(id)` - Delete order
  - `searchOrders(query)` - Search orders
  - **Business Logic**: `isValidStatus()`, `calculateOrderTotal()`, `getNextValidStatuses()`

- ✅ `ReplayService.js` - Complete replay management operations
  - `getReplays(params)` - List replays with filtering and pagination
  - `getReplay(id)` - Single replay details with video metadata
  - `searchReplays(query)` - Search replays by title/description
  - `syncReplays()` - Sync replays from CommentSold API
  - **Business Logic**: `formatReplay()`, `formatDuration()`, `formatViewers()`, `getStatusInfo()`, `calculateReplayAnalytics()`, `filterReplays()`, `sortReplays()`

- ✅ `WaitlistService.js` - Complete CRUD operations for waitlists
  - `getWaitlists(params)` - List waitlists with filtering
  - `getWaitlist(id)` - Single waitlist entry details
  - `updateWaitlistEntry(id, updates)` - Update waitlist entry
  - `authorizeWaitlistEntry(id)` - Authorize entry
  - `bulkAuthorizeEntries(entryIds)` - Bulk authorize operations
  - `bulkDeleteEntries(entryIds)` - Bulk delete operations
  - **Business Logic**: `isAuthorized()`, `getStatus()`, `getSourceInfo()`, `calculateMetrics()`

- ✅ `ProductService.js` - Complete CRUD operations for products
  - `getProducts(params)` - List products with filtering
  - `getProduct(id)` - Single product details
  - `createProduct(data, images)` - Create new product
  - `updateProduct(id, updates, images)` - Update product
  - `deleteProduct(id)` - Delete product
  - `uploadImages(files)` - Upload product images
  - **Business Logic**: `isValidPrice()`, `getStatusInfo()`, `formatProduct()`

- ✅ `CollectionService.js` - Complete CRUD operations for collections
  - `getCollections(params)` - List collections with filtering
  - `getCollection(id)` - Single collection details
  - `createCollection(data, images)` - Create new collection
  - `updateCollection(id, updates, images)` - Update collection
  - `deleteCollection(id)` - Delete collection
  - `addProductsToCollection(collectionId, productIds)` - Add products to collection
  - `removeProductsFromCollection(collectionId, productIds)` - Remove products from collection
  - `uploadImage(file)` - Upload collection image
  - **Business Logic**: `isValidName()`, `getStatusInfo()`, `formatCollection()`

- ✅ `InventoryService.js` - Complete inventory management operations
  - `getInventoryItems(params)` - List inventory with filtering
  - `updateInventoryQuantity(id, quantity, reason)` - Update single item quantity
  - `bulkUpdateQuantities(updates)` - Bulk quantity updates
  - `getInventoryMetrics(threshold)` - Analytics and low stock alerts
  - `searchInventory(query, filters)` - Search functionality
  - **Business Logic**: `formatInventoryItem()`, `getStockStatus()`, `isLowStock()`, `validateQuantityAdjustment()`, `calculateAdjustment()`, `formatCurrency()`, `calculateTotalValue()`

- ✅ `MobileAppService.js` - Complete mobile app configuration operations
  - `getAppConfig()` - Load app configuration
  - `saveAppConfig(config)` - Save app configuration
  - `getDefaultConfig()` - Default configuration template
  - `getColorPresets()` - Predefined color schemes
  - `getAvailableIcons()` - Available tab icons
  - **Business Logic**: `validateConfig()`, `isValidHexColor()`, `applyColorPreset()`, `toggleTab()`, `updateTab()`, `getEnabledTabs()`, `getConfigSummary()`

- ✅ `LiveStreamService.js` - Live streaming orchestration service
  - `initializeServices()` - Initialize all streaming services
  - `initializeAgora()` - Setup Agora with callbacks
  - `joinChannel()`, `leaveChannel()` - Channel management
  - `startLiveSelling()`, `stopLiveSelling()` - Live selling lifecycle
  - `updateAgoraSettings()` - Settings management with reconnection
  - `handleTokenSubmit()` - Token validation and reconnection
  - **Business Logic**: `getStreamStatus()`, `validateLiveSellingForm()`, `isTokenError()`, `getStreamMetrics()`, `setupVideoEventHandlers()`

- ✅ `UserService.js` - Complete user and team management operations
  - `getUsers(params)` - List users with filtering and pagination
  - `getUser(id)` - Single user details
  - `createUser(data)`, `updateUser(id, updates)`, `deleteUser(id)` - User CRUD
  - `getTeamMembers(params)` - List team members with filtering
  - `addTeamMember(data)`, `removeTeamMember(id)` - Team management
  - **Business Logic**: `formatUser()`, `getStatusInfo()`, `getRoleInfo()`, `getInitials()`, `getAvatarColor()`, `filterUsers()`, `sortUsers()`, `calculateUserAnalytics()`, `validateUser()`, `isValidEmail()`

### **Integration Services**
- ✅ `ToastService.js` - Global notification system
- ✅ `AgoraService.js` - Video streaming integration
- ✅ `AgoraSettingsService.js` - Agora configuration
- ✅ `LiveSellingService.js` - Live selling orchestration
- ✅ `PusherService.js` - Real-time communication

---

## 📊 **Global State** (.svelte.js files)

### **Domain State**
- ✅ `orders.svelte.js` - Complete orders state management
  - **State**: `orders[]`, `currentOrder`, loading states, errors, filters
  - **Actions**: `loadOrders()`, `loadOrder()`, `updateOrder()`, `deleteOrder()`, filtering
  - **Computed**: `getFilteredOrders()`, `getOrderMetrics()`

- ✅ `waitlists.svelte.js` - Complete waitlists state management
  - **State**: `waitlists[]`, `currentWaitlist`, loading states, errors, filters, metrics
  - **Actions**: `loadWaitlists()`, `loadWaitlist()`, `updateWaitlist()`, `authorizeWaitlist()`, bulk operations
  - **Computed**: `getFilteredWaitlists()`, `getWaitlistMetrics()`, `getCurrentWaitlistDisplay()`

- ✅ `products.svelte.js` - Complete products state management
  - **State**: `products[]`, `currentProduct`, `collections[]`, loading states, errors, filters, form state
  - **Actions**: `loadProducts()`, `loadProduct()`, `createProduct()`, `updateProduct()`, `deleteProduct()`, `loadCollections()`
  - **Computed**: `getFilteredProducts()`, `getProductMetrics()`, `getCurrentProductDisplay()`

- ✅ `collections.svelte.js` - Complete collections state management
  - **State**: `collections[]`, `currentCollection`, loading states, errors, filters, form state, metrics
  - **Actions**: `loadCollections()`, `loadCollection()`, `createCollection()`, `updateCollection()`, `deleteCollection()`, `addProductsToCollection()`, `removeProductsFromCollection()`
  - **Computed**: `getFilteredCollections()`, `getCollectionMetrics()`, `getCurrentCollectionDisplay()`

- ✅ `inventory.svelte.js` - Complete inventory state management
  - **State**: `items[]`, loading states, errors, filters, metrics, selection, modal state
  - **Actions**: `loadInventory()`, `loadMetrics()`, `updateQuantity()`, `bulkUpdateQuantities()`, selection management, modal management
  - **Computed**: `getFilteredInventory()`, `getInventoryMetrics()`, `getSelectedItems()`, `getAdjustmentModalData()`

- ✅ `mobile-app.svelte.js` - Complete mobile app configuration state management
  - **State**: `config`, loading states, errors, UI state, form state, options, metadata
  - **Actions**: `loadConfig()`, `saveConfig()`, color/tab/message management, validation, preview management
  - **Computed**: `getConfigSummary()`, `getEnabledTabs()`, `hasUnsavedChanges()`, `getValidationStatus()`

- ✅ `live-stream.svelte.js` - Complete live streaming state management
  - **State**: service instances, connection state, settings, UI state, loading states, errors, stream data
  - **Actions**: `initializeServices()`, `initializeAgora()`, channel management, live selling lifecycle, settings management, event handling
  - **Computed**: `getStreamStatus()`, `getStreamMetrics()`, `canStartLiveSelling()`, `canStopLiveSelling()`, `getLiveSellingFormValidation()`

- ✅ `replays.svelte.js` - Complete replay state management
  - **State**: `replays[]`, `currentReplay`, pagination, filters, sorting, selection, analytics, videoPlayer state
  - **Actions**: `loadReplays()`, `loadReplay()`, `searchReplays()`, `syncReplays()`, selection management, video player control
  - **Computed**: `getFilteredReplays()`, `getReplayAnalytics()`, `getCurrentReplayDisplay()`, `hasSelection()`, `getSelectionCount()`, `isAllSelected()`

- ✅ `users.svelte.js` - Complete user and team management state
  - **State**: `users[]`, `teamMembers[]`, `currentUser`, loading states, errors, pagination, filters, selection, form state, modal state
  - **Actions**: `loadUsers()`, `loadTeamMembers()`, `createUser()`, `updateUser()`, `deleteUser()`, selection management, modal management, bulk operations
  - **Computed**: `getFilteredUsers()`, `getFilteredTeamMembers()`, `getUserAnalytics()`, `hasSelection()`, `getSelectionCount()`, `getCurrentUserDisplay()`

---

## 🎯 **Context APIs** (Component-tree state)

### **Domain Contexts**
- ✅ `orders.svelte.js` - Orders component-tree state
  - **State**: `selectedOrders[]`, sorting, bulk actions, UI state
  - **Actions**: Selection management, bulk operations, sorting
  - **Derived**: `hasSelection`, `selectionCount`, `allSelected()`

- ✅ `waitlists.svelte.js` - Waitlists component-tree state
  - **State**: `selectedWaitlists[]`, sorting, bulk actions, filter UI state
  - **Actions**: Selection management, bulk operations (authorize/delete), filter management
  - **Derived**: `hasSelection`, `selectionCount`, `canPerformBulkActions`, `isProcessingBulkAction`

---

## 📝 **TypeScript Interfaces**

### **Common Types**
- ✅ `common.ts`
  - `BaseEntity` - Standard fields for all entities
  - `PaginatedResponse<T>` - Standard pagination wrapper
  - `ApiResponse<T>` - Standard API response wrapper

### **Domain Types**
- ✅ `orders.ts`
  - `Order` - Complete order interface
  - `OrderItem` - Order item interface
  - `OrderStatus` - Order status union type
  - `ShippingAddress` - Shipping address interface

- ✅ `waitlists.ts`
  - `WaitlistEntry` - Complete waitlist entry interface
  - `WaitlistEntryFormatted` - Extended entry with computed properties
  - `WaitlistStatus` - Waitlist status union type ('pending' | 'authorized')
  - `OrderSource` - Source platform type (1-4: Instagram, Facebook, Website, TikTok)
  - `WaitlistFilters` - Filtering options interface
  - `WaitlistMetrics` - Metrics and statistics interface

- ✅ `products.ts`
  - `Product` - Complete product interface
  - `ProductFormData` - Product form data for creation/editing
  - `ProductStatus` - Product status union type
  - `Collection` - Collection interface
  - `CollectionFormData` - Collection form data for creation/editing
  - `ProductVariant` - Product variant interface
  - `ProductImage` - Product image interface

- ✅ `inventory.ts`
  - `InventoryItem` - Complete inventory item interface
  - `InventoryItemFormatted` - Extended item with computed properties
  - `InventoryStockStatus` - Stock status union type ('in_stock' | 'low_stock' | 'out_of_stock')
  - `InventoryFilters` - Filtering options interface
  - `InventoryMetrics` - Analytics and metrics interface
  - `QuantityAdjustment` - Adjustment operation data
  - `BulkUpdateOperation` - Bulk operation data
  - `InventoryAdjustmentModal` - Modal state interface

- ✅ `mobile-app.ts`
  - `MobileAppConfig` - Complete mobile app configuration interface
  - `AppColors` - Color scheme configuration
  - `AppMessages` - Promo messages configuration
  - `AppTab` - Tab configuration interface
  - `ColorPreset` - Predefined color scheme
  - `ConfigValidationResult` - Validation result with errors
  - `ConfigSummary` - Configuration summary for display
  - `MobileAppState` - Complete state interface
  - `TabUpdate`, `ColorUpdate`, `MessagesUpdate` - Update operation data

- ✅ `live-stream.ts` - Complete live streaming domain interfaces (50+ types)
  - `LiveStreamState` - Complete state management interface
  - `ConnectionState`, `StreamStatusInfo` - Connection and status interfaces
  - `AgoraCallbacks`, `LiveSellingFormData` - Service integration interfaces
  - `StreamConfigurationProps`, `StreamStatusDisplayProps` - Component props interfaces
  - `LiveStreamControlsProps`, `StreamMetricsProps` - Control and metrics interfaces
  - `StreamStatus`, `StreamMetrics` - Core streaming data interfaces
  - `ValidationResult`, `FormValidation` - Validation system interfaces

- ✅ `replays.ts` - Complete replay domain interfaces (50+ types)
  - `Replay`, `ReplayFormatted` - Core replay interfaces with computed properties
  - `ReplayProduct`, `StatusInfo`, `VideoMetadata` - Related data interfaces
  - `ReplaysState`, `PaginationState`, `ReplayFilters` - State management interfaces
  - `SortingState`, `VideoPlayerState`, `SelectionState` - UI state interfaces
  - `ReplayCardProps`, `VideoPlayerProps` - Component props interfaces
  - `ReplayMetricsProps`, `ProductGridProps` - Component props interfaces
  - `ReplayAnalytics`, `VideoSource` - Analytics and video interfaces

- ✅ `users.ts` - Complete user domain interfaces (100+ types)
  - `User`, `UserFormatted`, `TeamMember` - Core user interfaces with computed properties
  - `UserRole`, `UserStatus`, `Permission` - Type unions and permission system
  - `StatusInfo`, `RoleInfo`, `UserAnalytics` - Display and analytics interfaces
  - `UsersState`, `PaginationState`, `UserFilters` - State management interfaces
  - `SortingState`, `UserFormData`, `BulkAction` - Form and operation interfaces
  - `UserCardProps`, `UserTableProps`, `UserMetricsProps` - Component props interfaces
  - `UsersContextValue`, `UsersActions`, `UsersComputedValues` - Context system interfaces

---

## 🛠️ **Utility Functions**

### **Formatters**
- ✅ `formatters.ts`
  - `currency(amount, currency?)` - Format currency values
  - `date(dateString)` - Format dates
  - `dateTime(dateString)` - Format date and time
  - `relativeTime(dateString)` - Relative time formatting

### **Status Utilities**
- ✅ `status.ts`
  - `STATUS_COLORS` - Mapping of statuses to color classes
  - `getStatusColor(status)` - Get color class for status

### **Validation Utilities**
*(None created yet)*

### **Navigation Utilities**
*(None created yet)*

---

## 📱 **Page Templates & Patterns**

### **Established Patterns**
- ✅ **List Page Pattern** - Orders list page (can be reused)
  - Services + Global State + Context
  - LoadingState/ErrorState/EmptyState handling
  - Metrics grid with derived computations
  - Data table with pagination
  - Search and filtering

- ✅ **Detail Page Pattern** - Order detail page (can be reused)
  - Services + Global State for data fetching
  - LoadingState/ErrorState handling
  - Header card with key info and actions
  - Info cards grid
  - Related items sections

### **CSS Design System Classes**
*(Already documented - using existing CSS classes)*
- `metric-card`, `status-badge`, `data-table`, `btn-primary`, etc.

---

## 🚫 **DUPLICATION PREVENTION RULES**

### **Before Creating New Components:**
1. ✅ Check this inventory first
2. ✅ Search existing components directory
3. ✅ Consider if existing component can be extended
4. ✅ Update this inventory when creating new items

### **Before Creating New Services:**
1. ✅ Check if similar business logic exists
2. ✅ Consider extending existing services
3. ✅ Follow naming pattern: `{Domain}Service.js`

### **Before Creating New State:**
1. ✅ Check if data can be managed in existing state
2. ✅ Consider if it's truly global vs component-local
3. ✅ Follow pattern: `{domain}.svelte.js`

### **Before Creating New Types:**
1. ✅ Check existing interfaces in types directory
2. ✅ Extend BaseEntity when possible
3. ✅ Use composition over duplication

---

## 🚨 Critical Gotchas & Fixes

### Svelte 5 Runes Reactivity Issues
- **NEVER destructure runes**: `const { loading } = ordersState` ❌ 
- **Always access directly**: `ordersState.loading` ✅
- **Reason**: Destructuring breaks Svelte 5's Proxy-based reactivity system
- **Symptoms**: Loading states don't update, data doesn't refresh, components appear broken

### Svelte 5 $effect() Best Practices
- **Problem**: Bare `$effect(() => { loadData(); })` can cause infinite loops
- **Solution**: Add dependency checks: `$effect(() => { if (!state.lastFetch) loadData(); })`
- **Prevention**: Add concurrent load protection in services
- **Symptoms**: Continuous API calls, performance issues, "trying and trying" messages

### Svelte 5 $derived() Arrow Function Issues
- **Problem**: `$derived(() => someValue)` displays as "() => someValue" instead of the actual value
- **Solution**: Use direct expressions: `$derived(someValue)` instead of `$derived(() => someValue)`
- **Fixed in**: waitlists context (lines 161-170) - removed arrow functions from $derived()
- **Symptoms**: UI displays function signature instead of computed values, selection counts broken

---

## 📋 **DASHBOARD COMPONENTS** (✅ COMPLETED)

### **Services:**
- ✅ `DashboardService.js` - Dashboard-specific API calls with graceful error handling
  - `getDashboardStats()` - Core metrics (orders, customers, revenue, products)
  - `getRecentOrders(limit)` - Latest orders for dashboard
  - `getHealthStatus()` - System health check
  - `getSalesComparison()` - Sales trends (gracefully handles missing endpoint)
  - `loadDashboardData()` - Parallel loading with proper error boundaries

### **Global State:**
- ✅ `dashboard.svelte.js` - Dashboard reactive state management
  - **State**: metrics, orders, health, sales data, loading states, errors
  - **Actions**: `loadDashboard()` with concurrent load protection
  - **Computed**: metrics formatting, error aggregation, loading states

### **Components:**
- ✅ `DashboardMetrics.svelte` - Reusable metrics cards with loading states
- ✅ `RecentOrdersTable.svelte` - Recent orders with proper navigation
- ✅ `SalesComparisonTable.svelte` - Sales trends with loading skeletons
- ✅ `SystemStatus.svelte` - Health status indicator

### **Types:**
- ✅ `dashboard.ts` - Complete dashboard interfaces

### **Refactored Page:**
- ✅ `/routes/+page.svelte` - Dashboard reduced from 403 to ~140 lines (65% reduction)

---

## 📋 **MOBILE APP COMPONENTS** (✅ COMPLETED)

### **Services:**
- ✅ `MobileAppService.js` - Mobile app configuration business logic
  - `getAppConfig()` - Load configuration from API
  - `saveAppConfig(config)` - Save configuration with validation
  - `getDefaultConfig()` - Default configuration template
  - `getColorPresets()` - Predefined color schemes with gradients
  - `getAvailableIcons()` - Tab icon options
  - **Business Logic**: `validateConfig()`, `isValidHexColor()`, `applyColorPreset()`, `toggleTab()`, `updateTab()`, `getEnabledTabs()`, `getConfigSummary()`

### **Global State:**
- ✅ `mobile-app.svelte.js` - Mobile app reactive state management
  - **State**: config, loading states, errors, UI state, form state, options, metadata
  - **Actions**: `loadConfig()`, `saveConfig()` with validation, color/tab/message management, preview management
  - **Computed**: `getConfigSummary()`, `getEnabledTabs()`, `hasUnsavedChanges()`, `getValidationStatus()`

### **Components:**
- ✅ `ColorPresetSelector.svelte` - Color preset selection with gradient previews
- ✅ `ColorConfigPanel.svelte` - Custom color configuration with live preview
- ✅ `TabConfiguration.svelte` - Tab management with toggle switches and summary stats
- ✅ `MobileAppPreview.svelte` - Interactive mobile app preview with phone simulation

### **Types:**
- ✅ `mobile-app.ts` - Complete mobile app configuration interfaces

### **Refactored Page:**
- ✅ `/routes/sales-channels/mobile-app/+page.svelte` - Mobile app config reduced from 854 to ~460 lines (46% reduction)
  - Converted from legacy Svelte 4 patterns to Services + Runes + Context architecture
  - Replaced `onMount` with `$effect`, manual state with Svelte 5 runes
  - Integrated universal state components (LoadingState, ErrorState)
  - Added proper validation, unsaved changes tracking, and error handling
  - Extracted 4 reusable components, eliminating code duplication

---

## 📋 **LIVE STREAMING COMPONENTS** (✅ COMPLETED)

### **Services:**
- ✅ `LiveStreamService.js` - Live streaming orchestration service
  - `initializeServices()` - Initialize all streaming services (AgoraService, LiveSellingService, AgoraSettingsService)
  - `initializeAgora()` - Setup Agora with callbacks and event handling
  - `joinChannel()`, `leaveChannel()` - Channel management with connection state tracking
  - `startLiveSelling()`, `stopLiveSelling()` - Live selling lifecycle management
  - `updateAgoraSettings()` - Settings management with automatic reconnection
  - `handleTokenSubmit()` - Token validation and reconnection handling
  - **Business Logic**: `getStreamStatus()`, `validateLiveSellingForm()`, `isTokenError()`, `getStreamMetrics()`, `setupVideoEventHandlers()`

### **Global State:**
- ✅ `live-stream.svelte.js` - Live streaming reactive state management
  - **State**: service instances, connection state, settings, UI state, loading states, errors, stream data
  - **Actions**: `initializeServices()`, `initializeAgora()`, channel management, live selling lifecycle, settings management, event handling
  - **Computed**: `getStreamStatus()`, `getStreamMetrics()`, `canStartLiveSelling()`, `canStopLiveSelling()`, `getLiveSellingFormValidation()`

### **Components:**
- ✅ `StreamConfiguration.svelte` - Stream settings management with token validation
- ✅ `StreamStatusDisplay.svelte` - Status indicator with compact/full modes and live badges  
- ✅ `LiveStreamControls.svelte` - Live selling session management with form validation
- ✅ `StreamMetrics.svelte` - Stream analytics with detailed view and performance metrics

### **Types:**
- ✅ `live-stream.ts` - Complete live streaming domain interfaces (50+ types)

### **Refactored Page:**
- ✅ `/routes/live/+page.svelte` - Live streaming reduced from 613 to ~360 lines (41% reduction)
  - Converted from mixed architectural patterns to Services + Runes + Context architecture
  - Replaced legacy `onMount`/`onDestroy` with Svelte 5 `$effect` and proper cleanup
  - Integrated universal state components (LoadingState, ErrorState)
  - Added comprehensive error handling with specific error types and recovery
  - Extracted 4 reusable components, eliminating code duplication
  - Implemented proper service orchestration for complex multi-service coordination

---

## 📋 **REPLAY COMPONENTS** (✅ COMPLETED)

### **Services:**
- ✅ `ReplayService.js` - Replay business logic and API operations
  - `getReplays(params)` - List replays with filtering and pagination
  - `getReplay(id)` - Single replay details with video metadata
  - `searchReplays(query)` - Search replays by title/description
  - `syncReplays()` - Sync replays from CommentSold API
  - **Business Logic**: `formatReplay()`, `formatDuration()`, `formatViewers()`, `getStatusInfo()`, `calculateReplayAnalytics()`, `filterReplays()`, `sortReplays()`

- ✅ `VideoPlayerService.js` - HLS video player management and URL generation
  - `getVideoUrl()` - Generate video URL from replay data
  - `getVideoSources()` - Get all available video sources (HLS, MP4)
  - `getPosterImage()` - Get thumbnail/poster image
  - `initializeHLSPlayer()` - HLS player lifecycle management
  - `destroyHLSPlayer()` - Cleanup HLS resources
  - `handleHLSError()` - Error handling and fallback
  - **Business Logic**: `getVideoMetadata()`, `hasVideo()`, `hasThumbnail()`, `formatVideoDuration()`

### **Global State:**
- ✅ `replays.svelte.js` - Replay reactive state management
  - **State**: replays[], currentReplay, pagination, filters, sorting, selection, analytics, videoPlayer state
  - **Actions**: `loadReplays()`, `loadReplay()`, `searchReplays()`, `syncReplays()`, selection management, video player control
  - **Computed**: `getFilteredReplays()`, `getReplayAnalytics()`, `getCurrentReplayDisplay()`, `hasSelection()`, `getSelectionCount()`, `isAllSelected()`

### **Components:**
- ✅ `ReplayCard.svelte` - Reusable replay item display with thumbnail, metrics, and selection
- ✅ `VideoPlayer.svelte` - Complete HLS video player with error handling and fallback
- ✅ `ReplayMetrics.svelte` - Statistics display for single replays or analytics overview
- ✅ `ProductGrid.svelte` - Product listing with show more/less functionality

### **Types:**
- ✅ `replays.ts` - Complete replay domain interfaces (50+ types)
  - Core types: `Replay`, `ReplayFormatted`, `ReplayProduct`, `StatusInfo`, `VideoMetadata`
  - State types: `ReplaysState`, `PaginationState`, `ReplayFilters`, `SortingState`, `VideoPlayerState`
  - Component props: `ReplayCardProps`, `VideoPlayerProps`, `ReplayMetricsProps`, `ProductGridProps`

### **Refactored Pages:**
- ✅ `/routes/replays/+page.svelte` - Replays list reduced from 290 to ~103 lines (65% reduction)
  - Converted from legacy onMount/manual state management to Services + Runes + Context architecture
  - Integrated universal state components (LoadingState, ErrorState, EmptyState)
  - Added grid/table view modes with selection functionality
  - Implemented analytics overview and bulk operations
  - Extracted reusable ReplayCard component

- ✅ `/routes/replays/[id]/+page.svelte` - Replay detail reduced from 723 to ~270 lines (63% reduction)
  - Replaced embedded video logic with VideoPlayer component
  - Converted to Services + Runes + Context architecture with proper $effect lifecycle
  - Integrated VideoPlayer, ProductGrid, and ReplayMetrics components
  - Added comprehensive error handling and loading states
  - Eliminated code duplication in video player initialization and cleanup

---

## 📋 **USER MANAGEMENT COMPONENTS** (✅ COMPLETED)

### **Services:**
- ✅ `UserService.js` - Complete user and team management business logic
  - `getUsers(params)`, `getTeamMembers(params)` - List users and team members with filtering
  - `getUser(id)` - Single user details with computed properties
  - `createUser(data)`, `updateUser(id, updates)`, `deleteUser(id)` - User CRUD operations
  - `addTeamMember(data)`, `removeTeamMember(id)` - Team management operations
  - **Business Logic**: `formatUser()`, `getStatusInfo()`, `getRoleInfo()`, `getInitials()`, `getAvatarColor()`, `filterUsers()`, `sortUsers()`, `calculateUserAnalytics()`, `validateUser()`, `isValidEmail()`

### **Global State:**
- ✅ `users.svelte.js` - Complete user reactive state management
  - **State**: users[], teamMembers[], currentUser, loading states, errors, pagination, filters, selection, form state, modal state
  - **Actions**: `loadUsers()`, `loadTeamMembers()`, `createUser()`, `updateUser()`, `deleteUser()`, selection management, modal management, bulk operations
  - **Computed**: `getFilteredUsers()`, `getFilteredTeamMembers()`, `getUserAnalytics()`, `hasSelection()`, `getSelectionCount()`, `getCurrentUserDisplay()`

### **Components:**
- ✅ `UserCard.svelte` - Reusable user display with avatar, role badges, status indicators, selection, and actions
- ✅ `UserTable.svelte` - Data table with sorting, selection, pagination, loading skeleton states, and responsive design
- ✅ `UserMetrics.svelte` - User analytics display with role/status breakdowns, activity insights, and export functionality

### **Types:**
- ✅ `users.ts` - Complete user domain interfaces (100+ types)
  - Core types: `User`, `UserFormatted`, `TeamMember`, role/status unions, permission system
  - State types: `UsersState`, filters, sorting, form data, analytics interfaces
  - Component props: `UserCardProps`, `UserTableProps`, `UserMetricsProps`
  - Context system: `UsersContextValue`, `UsersActions`, `UsersComputedValues`

### **Refactored Page:**
- ✅ `/routes/settings/users/+page.svelte` - Settings users page reduced from 305 to ~217 lines (29% reduction)
  - Converted from legacy manual state management to Services + Runes + Context architecture
  - Replaced onMount with $effect, manual API calls with reactive state management
  - Integrated universal state components (LoadingState, ErrorState, EmptyState)
  - Added comprehensive user analytics with UserMetrics component
  - Implemented selection functionality with bulk operations support
  - Extracted reusable UserCard component for consistent user display
  - Added proper role-based permission foundation for future extension

---

*This inventory should be updated every time new reusable assets are created.*