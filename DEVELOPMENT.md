# Development Guidelines

**Development patterns, debugging workflows, and best practices for BetterCallSold**

## 🛠️ Essential Development Tools

### cURL - API Testing (Required) ⚠️

**Always test API endpoints with cURL before UI development.** This approach isolates API issues from UI complexity and ensures proper error handling.

#### Testing Admin Endpoints
```bash
# Orders API
curl -X GET "http://localhost:5173/api/orders?limit=10"
curl -X GET "http://localhost:5173/api/orders/order-id-here"
curl -X PATCH "http://localhost:5173/api/orders/order-id-here" \
  -H "Content-Type: application/json" \
  -d '{"status": "completed"}'

# Products API
curl -X GET "http://localhost:5173/api/products"
curl -X POST "http://localhost:5173/api/products" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Product", "price": 29.99}'

# Dashboard stats
curl -X GET "http://localhost:5173/api/stats"
curl -X GET "http://localhost:5173/api/health"
```

#### Testing Mobile API
```bash
# Product search with filtering
curl -X GET "http://localhost:5173/api/mobile/products/find?limit=20&collection_ids=1,2"

# Cart operations
curl -X POST "http://localhost:5173/api/mobile/cart/add" \
  -H "Content-Type: application/json" \
  -d '{"product_id": "123", "inventory_id": 456}'

curl -X GET "http://localhost:5173/api/mobile/cart"

# Waitlist operations
curl -X GET "http://localhost:5173/api/mobile/waitlist"
curl -X DELETE "http://localhost:5173/api/mobile/waitlist/waitlist-id"
```

#### CommentSold Integration Testing
```bash
# Sync operations
curl -X POST "http://localhost:5173/api/cs-sync/products"
curl -X POST "http://localhost:5173/api/cs-sync/collections"
curl -X GET "http://localhost:5173/api/cs-sync/replays"

# Test external API connectivity
curl -X GET "http://localhost:5173/api/test-cs/connectivity"
curl -X GET "http://localhost:5173/api/test-cs/products"
```

### psql - Database Inspection (Required) ⚠️

**Direct database access is essential for development.** Use psql to understand schema, inspect data, and debug queries.

#### Connection & Basic Commands
```bash
# Connect to Neon database
psql $DATABASE_URL

# Essential inspection commands
\dt                              # List all tables
\d orders                        # Describe orders table structure
\di                              # List all indexes
\df                              # List functions
\l                               # List databases (if applicable)
\q                               # Exit psql
```

#### Schema Discovery
```sql
-- Multi-tenant data inspection
SELECT DISTINCT tenant_id FROM orders;
SELECT COUNT(*) FROM products WHERE tenant_id = 'your-tenant-id';

-- Table structure and relationships
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'products';

-- Sample data inspection
SELECT id, name, price, created_at FROM products LIMIT 10;
SELECT id, status, total_amount, customer_name FROM orders LIMIT 10;
SELECT * FROM waitlists WHERE tenant_id = 'your-tenant-id' LIMIT 5;

-- JSONB data inspection
SELECT id, name, variants->'variants' as variants FROM products 
WHERE variants IS NOT NULL LIMIT 5;

SELECT id, images->'images' as images FROM products 
WHERE images IS NOT NULL LIMIT 5;
```

#### Database Debugging
```sql
-- Performance analysis
EXPLAIN ANALYZE SELECT * FROM orders WHERE tenant_id = 'tenant-id' ORDER BY created_at DESC LIMIT 50;

-- Index usage
SELECT schemaname, tablename, indexname, idx_tup_read, idx_tup_fetch 
FROM pg_stat_user_indexes 
WHERE schemaname = 'public';

-- Connection and activity
SELECT * FROM pg_stat_activity WHERE state = 'active';

-- Table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Interactive Testing Pages

#### /test-cs-api - Comprehensive API Testing
**Use this page for interactive endpoint testing with real-time logs:**

1. Navigate to `http://localhost:5173/test-cs-api`
2. Test CommentSold connectivity and endpoints
3. View real-time logs with expandable JSON data
4. Debug CORS issues and API responses
5. Test authentication and error scenarios

#### Browser Developer Tools
- **Network tab**: Monitor API calls and responses
- **Console**: View client-side errors and logs
- **Svelte DevTools**: Inspect component state and reactivity
- **Application tab**: Check localStorage and session data

## 🏗️ Development Workflow

### 1. API-First Development
**Always start with the API layer before building UI:**

```bash
# Step 1: Test API endpoint exists and returns expected data
curl -X GET "http://localhost:5173/api/orders"

# Step 2: Verify database schema and data
psql $DATABASE_URL
\d orders
SELECT * FROM orders LIMIT 5;

# Step 3: Test error scenarios
curl -X GET "http://localhost:5173/api/orders/nonexistent-id"

# Step 4: Build UI components only after API is verified
```

### 2. Service Development
**Create stateless services with comprehensive error handling:**

```javascript
export class NewDomainService {
  static async getData(params = {}) {
    // Always include timeout for database queries
    const queryPromise = query(SQL_QUERY, [params]);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Query timeout')), 5000)
    );
    
    try {
      const result = await Promise.race([queryPromise, timeoutPromise]);
      return result.rows;
    } catch (error) {
      console.error('Service error:', error);
      
      // Graceful degradation for missing endpoints
      if (error.message === 'Query timeout') {
        return []; // Return empty array instead of error
      }
      
      throw error;
    }
  }
  
  // Business logic methods
  static validateData(data) { /* validation */ }
  static formatData(data) { /* formatting */ }
}
```

### 3. State Management with Runes
**Follow Services + Runes + Context pattern:**

```javascript
// Global state (.svelte.js)
export const domainState = $state({
  items: [],
  loading: false,
  error: '',
  lastFetch: null,
  filters: {}
});

// Actions with concurrent load protection
export const domainActions = {
  async loadData(params) {
    // Prevent multiple concurrent loads
    if (domainState.loading) return;
    
    domainState.loading = true;
    domainState.error = '';
    
    try {
      const data = await DomainService.getData(params);
      domainState.items = data;
      domainState.lastFetch = new Date();
    } catch (error) {
      domainState.error = error.message;
    } finally {
      domainState.loading = false;
    }
  }
};

// Computed functions (not exported $derived)
export function getFilteredItems() {
  return domainState.items.filter(/* filtering logic */);
}
```

### 4. Component Development
**Build components that consume reactive state:**

```svelte
<script>
  import { domainState, domainActions } from '$lib/state/domain.svelte.js';
  import LoadingState from '$lib/components/states/LoadingState.svelte';
  import ErrorState from '$lib/components/states/ErrorState.svelte';
  
  // ⚠️ CRITICAL: Never destructure runes!
  // Access state properties directly to maintain reactivity
  
  // Load data on component mount
  $effect(() => {
    if (!domainState.lastFetch) {
      domainActions.loadData();
    }
  });
</script>

{#if domainState.loading}
  <LoadingState message="Loading data..." />
{:else if domainState.error}
  <ErrorState 
    error={domainState.error} 
    onRetry={() => domainActions.loadData()} 
  />
{:else}
  <!-- Component content -->
  {#each domainState.items as item}
    <!-- Item display -->
  {/each}
{/if}
```

### 5. Component Context (When Needed)
**Use contexts for UI-specific state:**

```javascript
// Component-tree context
export function createDomainContext() {
  const state = $state({
    selectedItems: [],
    sortBy: 'created_at',
    sortDirection: 'desc'
  });
  
  const actions = {
    selectItem(id) {
      const index = state.selectedItems.indexOf(id);
      if (index > -1) {
        state.selectedItems.splice(index, 1);
      } else {
        state.selectedItems.push(id);
      }
    }
  };
  
  const derived = {
    hasSelection: $derived(state.selectedItems.length > 0)
  };
  
  return { state, actions, derived };
}
```

## 🐛 Debugging Workflows

### API Issues
1. **Test with cURL first** to isolate the problem
2. **Check server logs** for detailed error messages
3. **Inspect database** with psql to verify data
4. **Use interactive test pages** for comprehensive debugging
5. **Verify environment variables** in `.env` file

### Database Issues
```bash
# Check connection
psql $DATABASE_URL -c "SELECT NOW();"

# Verify multi-tenant isolation
psql $DATABASE_URL -c "SELECT DISTINCT tenant_id FROM orders;"

# Check for missing tables or columns
psql $DATABASE_URL -c "\dt"
psql $DATABASE_URL -c "\d table_name"

# Sample data verification
psql $DATABASE_URL -c "SELECT * FROM products LIMIT 3;"
```

### State Management Issues
1. **Check for destructuring**: Ensure you're not destructuring runes
2. **Verify $effect dependencies**: Add proper dependency checks
3. **Use Svelte DevTools**: Inspect component state and reactivity
4. **Add console logging**: Log state changes for debugging
5. **Check concurrent load protection**: Prevent multiple simultaneous loads

### CORS and External API Issues
1. **Use server-side proxy endpoints** (`/api/test-cs/`) instead of direct calls
2. **Check CommentSold API connectivity** via test pages
3. **Verify API keys and authentication** in environment variables
4. **Test with cURL from server** to isolate client-side issues

### Mobile App Issues
```bash
# Test mobile API endpoints
curl -X GET "http://localhost:5173/api/mobile/debug"

# Check mobile database setup
curl -X POST "http://localhost:5173/api/mobile/setup"

# Verify cart/waitlist functionality
curl -X GET "http://localhost:5173/api/mobile/cart"
curl -X GET "http://localhost:5173/api/mobile/waitlist"
```

## 🎨 CSS Development Guidelines

### Use Design System Classes
**Always use existing design system classes before creating custom styles:**

```svelte
<!-- Use design system classes -->
<button class="btn btn-primary">Primary Action</button>
<div class="metric-card">
  <div class="metric-card-value">{value}</div>
  <div class="metric-card-label">{label}</div>
</div>

<!-- Status badges -->
<span class="status-badge status-{order.status}">{order.status}</span>

<!-- Data tables -->
<table class="data-table">
  <thead class="table-header">
    <!-- Header content -->
  </thead>
</table>
```

### Component-Scoped Styles
**Use Svelte's scoped styling for component-specific needs:**

```svelte
<style>
  .component-specific {
    /* Component-specific styles */
    background: var(--color-surface);
    border-radius: var(--radius-md);
    padding: var(--space-4);
  }
  
  /* Use design tokens */
  .custom-element {
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
    margin: var(--space-2);
  }
</style>
```

### Responsive Design Patterns
```css
/* Mobile-first responsive design */
.responsive-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-4);
}

@media (min-width: 768px) {
  .responsive-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .responsive-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

## 🚨 Common Pitfalls & Solutions

### Svelte 5 Reactivity Issues

#### Problem: Destructuring Breaks Reactivity
```javascript
// ❌ WRONG - Breaks reactivity
const { loading, error } = ordersState;
if (loading) { /* Won't update */ }

// ✅ CORRECT - Maintains reactivity  
if (ordersState.loading) { /* Reactive */ }
```

#### Problem: Infinite $effect Loops
```javascript
// ❌ WRONG - Infinite loop
$effect(() => {
  loadData(); // Triggers on every state change
});

// ✅ CORRECT - Dependency check
$effect(() => {
  if (!state.lastFetch || Date.now() - state.lastFetch > 5000) {
    loadData();
  }
});
```

#### Problem: Arrow Functions in $derived
```javascript
// ❌ WRONG - Shows function signature
const computed = $derived(() => someValue);

// ✅ CORRECT - Direct expression
const computed = $derived(someValue);
```

### Database Connection Issues
1. **Check environment variables**: Verify `DATABASE_URL` is correct
2. **Test connection directly**: Use `psql $DATABASE_URL` to verify
3. **Check SSL requirements**: Neon requires `sslmode=require`
4. **Verify network access**: Ensure no firewall blocking connections

### API Timeout Issues
```javascript
// Add timeouts to prevent hanging requests
const timeoutPromise = new Promise((_, reject) => 
  setTimeout(() => reject(new Error('Request timeout')), 10000)
);

const result = await Promise.race([
  fetch('/api/endpoint'),
  timeoutPromise
]);
```

### Mobile API Compatibility
- **Use CommentSold format**: Ensure responses match expected mobile app structure
- **Handle cart/waitlist switching**: Automatically add to waitlist when out of stock
- **Maintain pagination patterns**: Use `last_post_id` for cursor-based pagination
- **Format timestamps**: Use Unix timestamps for mobile compatibility

## 🔧 Performance Optimization

### Database Query Optimization
```sql
-- Use proper indexes for multi-tenant queries
CREATE INDEX idx_orders_tenant_created ON orders(tenant_id, created_at DESC);
CREATE INDEX idx_products_tenant_status ON products(tenant_id, status);

-- Optimize JSONB queries
CREATE INDEX idx_products_variants ON products USING GIN (variants);
CREATE INDEX idx_products_images ON products USING GIN (images);
```

### State Management Performance
```javascript
// Prevent unnecessary re-renders
export function getFilteredItems() {
  // Cache filtered results to prevent recalculation
  const cacheKey = `${domainState.filters.status}_${domainState.filters.search}`;
  if (filterCache[cacheKey]) {
    return filterCache[cacheKey];
  }
  
  const filtered = domainState.items.filter(/* filtering logic */);
  filterCache[cacheKey] = filtered;
  return filtered;
}
```

### Component Performance
- **Use keyed each blocks**: `{#each items as item (item.id)}`
- **Lazy load heavy components**: Use dynamic imports for large components
- **Optimize image loading**: Use proper sizing and lazy loading
- **Debounce user input**: Prevent excessive API calls from search inputs

## 📱 Mobile Development

### React Native/Expo Patterns
```typescript
// Service layer pattern
export class MobileProductService {
  static async getProducts(params: ProductSearchParams) {
    const response = await api.get('/api/mobile/products/find', { params });
    return response.data;
  }
}

// Context for cart management
export const CartContext = React.createContext<CartContextValue | null>(null);

// Custom hooks for data fetching
export function useProducts(params: ProductSearchParams) {
  const [data, setData] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      try {
        const products = await MobileProductService.getProducts(params);
        setData(products);
      } catch (error) {
        console.error('Failed to load products:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadProducts();
  }, [JSON.stringify(params)]);
  
  return { data, loading };
}
```

### Mobile API Testing
```bash
# Test mobile-specific endpoints
curl -X GET "http://localhost:5173/api/mobile/products/find?collection_ids=1&limit=10"
curl -X POST "http://localhost:5173/api/mobile/cart/add" \
  -H "Content-Type: application/json" \
  -d '{"product_id": "123", "inventory_id": 456}'

# Test real-time features
curl -X POST "http://localhost:5173/api/pusher/send-message" \
  -H "Content-Type: application/json" \
  -d '{"channel": "cart-updates", "event": "item-added", "data": {}}'
```

## 📋 Code Quality Standards

### TypeScript Standards
- **Use proper interfaces**: Define comprehensive props and state interfaces
- **Avoid `any` types**: Use proper typing throughout the codebase
- **Export types**: Make interfaces available for reuse across components
- **Use union types**: For status fields and enumerated values

### Error Handling Standards
```javascript
// Service layer error handling
export class ServiceName {
  static async operation() {
    try {
      const result = await api.call();
      return result;
    } catch (error) {
      console.error('Operation failed:', error);
      
      // Provide user-friendly error messages
      if (error.status === 404) {
        throw new Error('Resource not found');
      } else if (error.status === 500) {
        throw new Error('Server error. Please try again later.');
      }
      
      throw error;
    }
  }
}

// Component error boundaries
{#if state.error}
  <ErrorState 
    error={state.error} 
    onRetry={() => actions.retry()} 
  />
{/if}
```

### Testing Standards
1. **cURL test all endpoints** before UI development
2. **Database verification** with psql queries
3. **Interactive testing** via test pages
4. **Error scenario testing** for proper error handling
5. **Mobile API compatibility** testing

---

**Following these development guidelines ensures consistent, maintainable, and high-quality code while leveraging the full power of the Services + Runes + Context architecture.**