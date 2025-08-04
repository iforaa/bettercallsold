// Constants used across the application

// Default tenant ID for demo (matches Go backend)
export const DEFAULT_TENANT_ID = '11111111-1111-1111-1111-111111111111';

// Default mobile user ID for all mobile app requests
export const DEFAULT_MOBILE_USER_ID = '33333333-3333-3333-3333-333333333333';

// Database table names
export const TABLES = {
  USERS: 'users',
  PRODUCTS: 'products',
  ORDERS: 'orders',
  CUSTOMERS: 'customers',
  TENANTS: 'tenants',
  COLLECTIONS: 'collections',
  INVENTORY: 'inventory',
  LIVE_STREAMS: 'live_streams',
  POSTS: 'posts',
  CART_ITEMS: 'cart_items'
};

// SQL queries for reuse
export const QUERIES = {
  // Health check
  HEALTH_CHECK: 'SELECT 1 as healthy',
  
  // Stats
  STATS_QUERY: `
    SELECT 
      (SELECT COUNT(*) FROM products WHERE tenant_id = $1) as total_products,
      (SELECT COUNT(*) FROM users WHERE tenant_id = $1 AND role = 'customer') as total_customers,
      (SELECT COUNT(*) FROM orders WHERE tenant_id = $1) as total_orders,
      (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE tenant_id = $1) as total_revenue,
      0 as active_streams
  `,
  
  // Users
  GET_USERS: 'SELECT id, name, email, role, tenant_id FROM users WHERE tenant_id = $1',
  GET_TEAM: 'SELECT id, name, email, role, tenant_id FROM users WHERE tenant_id = $1 AND role != \'customer\'',
  GET_CUSTOMERS: `
    SELECT id, tenant_id, name, email, phone, created_at, updated_at 
    FROM users 
    WHERE tenant_id = $1 AND role = 'customer'
  `,
  
  // Tenants
  GET_TENANTS: 'SELECT id, subdomain, name, domain, plan, status, settings, created_at, updated_at FROM tenants',
  
  // Products
  GET_PRODUCTS: `
    SELECT id, tenant_id, name, description, price, inventory_count, 
           images, variants, tags, status, created_at, updated_at
    FROM products 
    WHERE tenant_id = $1
  `,
  GET_PRODUCT_BY_ID: `
    SELECT id, tenant_id, name, description, price, inventory_count, 
           images, variants, tags, status, created_at, updated_at
    FROM products 
    WHERE id = $1 AND tenant_id = $2
  `,
  CREATE_PRODUCT: `
    INSERT INTO products (id, tenant_id, name, description, price, inventory_count, images, variants, tags, status)
    VALUES (uuid_generate_v4(), $1, $2, $3, $4, 0, $5::jsonb, '[]', $6, $7)
    RETURNING id
  `,
  UPDATE_PRODUCT: `
    UPDATE products 
    SET name = $3, description = $4, price = $5, images = $6::jsonb, tags = $7, 
        status = $8, updated_at = NOW()
    WHERE id = $1 AND tenant_id = $2
  `,
  DELETE_PRODUCT: 'DELETE FROM products WHERE id = $1 AND tenant_id = $2',
  
  // Orders with customer info
  GET_ORDERS_WITH_CUSTOMERS: `
    SELECT 
      o.id, o.tenant_id, o.user_id, o.status, o.total_amount, 
      o.shipping_address, o.payment_method, o.payment_id, 
      o.created_at, o.updated_at,
      u.name as customer_name, u.email as customer_email
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    WHERE o.tenant_id = $1
    ORDER BY o.created_at DESC
  `,
  
  // Collections
  GET_COLLECTIONS: `
    SELECT c.*, 
           COALESCE(pc.product_count, 0) as product_count
    FROM collections c
    LEFT JOIN (
      SELECT collection_id, COUNT(*) as product_count
      FROM product_collections
      GROUP BY collection_id
    ) pc ON c.id = pc.collection_id
    WHERE c.tenant_id = $1
    ORDER BY c.sort_order, c.created_at
  `
};