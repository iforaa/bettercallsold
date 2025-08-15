// Constants used across the application

// Default tenant ID for demo (matches Go backend)
export const DEFAULT_TENANT_ID = "11111111-1111-1111-1111-111111111111";

// Default mobile user ID for all mobile app requests
export const DEFAULT_MOBILE_USER_ID = "44444444-4444-4444-4444-444444444444";

// Database table names
export const TABLES = {
  USERS: "users",
  PRODUCTS: "products",
  ORDERS: "orders",
  CUSTOMERS: "customers",
  TENANTS: "tenants",
  COLLECTIONS: "collections",
  INVENTORY: "inventory",
  LIVE_STREAMS: "live_streams",
  POSTS: "posts",
  CART_ITEMS: "cart_items",
  LOCATIONS: "locations",
  PLUGINS: "plugins",
  PLUGIN_EVENTS: "plugin_events",
};

// Plugin event types
export const PLUGIN_EVENTS = {
  // Product events
  PRODUCT_CREATED: "product.created",
  PRODUCT_UPDATED: "product.updated", 
  PRODUCT_DELETED: "product.deleted",
  
  // Order events
  ORDER_CREATED: "order.created",
  ORDER_PAID: "order.paid",
  ORDER_SHIPPED: "order.shipped",
  ORDER_DELIVERED: "order.delivered",
  ORDER_CANCELLED: "order.cancelled",
  
  // Customer events
  CUSTOMER_CREATED: "customer.created",
  CUSTOMER_UPDATED: "customer.updated",
  
  // Inventory events
  INVENTORY_LOW: "inventory.low",
  INVENTORY_OUT: "inventory.out",
  INVENTORY_UPDATED: "inventory.updated",
  
  // Cart events
  CART_ITEM_ADDED: "cart.item_added",
  CART_ITEM_REMOVED: "cart.item_removed",
  CART_ITEM_UPDATED: "cart.item_updated",
  CART_CLEARED: "cart.cleared",
  
  // Waitlist events
  WAITLIST_ITEM_ADDED: "waitlist.item_added",
  WAITLIST_ITEM_REMOVED: "waitlist.item_removed",
  WAITLIST_ITEM_PREAUTHORIZED: "waitlist.item_preauthorized",
  
  // Checkout events
  CHECKOUT_STARTED: "checkout.started",
  CHECKOUT_COMPLETED: "checkout.completed",
  CHECKOUT_FAILED: "checkout.failed",
  
  // Favorites events
  FAVORITE_ADDED: "favorite.added",
  FAVORITE_REMOVED: "favorite.removed",
  
  // Search events
  SEARCH_PERFORMED: "search.performed",
  SEARCH_NO_RESULTS: "search.no_results",
};

// Plugin status values
export const PLUGIN_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive", 
  ERROR: "error",
};

// Plugin event status values
export const EVENT_STATUS = {
  PENDING: "pending",
  SENT: "sent",
  FAILED: "failed",
  RETRY: "retry",
};

// SQL queries for reuse
export const QUERIES = {
  // Health check
  HEALTH_CHECK: "SELECT 1 as healthy",

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
  GET_USERS:
    "SELECT id, name, email, role, tenant_id FROM users WHERE tenant_id = $1",
  GET_TEAM:
    "SELECT id, name, email, role, tenant_id FROM users WHERE tenant_id = $1 AND role != 'customer'",
  GET_CUSTOMERS: `
    SELECT 
      u.id, 
      u.tenant_id, 
      u.name, 
      u.email, 
      u.phone,
      u.created_at, 
      u.updated_at,
      COALESCE(COUNT(o.id), 0) as order_count,
      COALESCE(SUM(CAST(o.total_amount AS DECIMAL(10,2))), 0) as total_spent,
      (
        SELECT COALESCE(o2.shipping_address->>'city', 'No location')
        FROM orders o2 
        WHERE o2.user_id = u.id AND o2.tenant_id = $1
        ORDER BY o2.created_at DESC 
        LIMIT 1
      ) as location
    FROM users u
    LEFT JOIN orders o ON u.id = o.user_id AND o.tenant_id = $1
    WHERE u.tenant_id = $1 AND u.role = 'customer'
    GROUP BY u.id, u.tenant_id, u.name, u.email, u.phone, u.created_at, u.updated_at
    ORDER BY u.created_at DESC
  `,

  // Tenants
  GET_TENANTS:
    "SELECT id, subdomain, name, domain, plan, status, settings, created_at, updated_at FROM tenants",

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
  DELETE_PRODUCT: "DELETE FROM products WHERE id = $1 AND tenant_id = $2",

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

  // Single order with customer info
  GET_ORDER_BY_ID: `
    SELECT
      o.id, o.tenant_id, o.user_id as customer_id, o.status, o.total_amount,
      o.shipping_address, o.payment_method, o.payment_id,
      o.created_at, o.updated_at,
      u.name as customer_name, u.email as customer_email
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    WHERE o.id = $1 AND o.tenant_id = $2
  `,

  // Order items for a specific order
  GET_ORDER_ITEMS: `
    SELECT
      oi.id, oi.order_id, oi.product_id, oi.quantity, oi.price, oi.variant_data,
      p.name as product_name, p.description as product_description, p.images as product_images
    FROM order_items oi
    LEFT JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = $1
    ORDER BY oi.id
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
  `,

  // Locations
  GET_LOCATIONS: `
    SELECT id, tenant_id, name, description, location_type,
           address_line_1, address_line_2, city, state_province,
           postal_code, country, phone, email, status,
           is_default, is_pickup_location, is_fulfillment_center,
           business_hours, metadata, created_at, updated_at
    FROM locations
    WHERE tenant_id = $1
    ORDER BY is_default DESC, name ASC
  `,
  GET_LOCATION_BY_ID: `
    SELECT id, tenant_id, name, description, location_type,
           address_line_1, address_line_2, city, state_province,
           postal_code, country, phone, email, status,
           is_default, is_pickup_location, is_fulfillment_center,
           business_hours, metadata, created_at, updated_at
    FROM locations
    WHERE id = $1 AND tenant_id = $2
  `,
  CREATE_LOCATION: `
    INSERT INTO locations (
      tenant_id, name, description, location_type,
      address_line_1, address_line_2, city, state_province,
      postal_code, country, phone, email, status,
      is_default, is_pickup_location, is_fulfillment_center,
      business_hours, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
    RETURNING id
  `,
  UPDATE_LOCATION: `
    UPDATE locations
    SET name = $3, description = $4, location_type = $5,
        address_line_1 = $6, address_line_2 = $7, city = $8,
        state_province = $9, postal_code = $10, country = $11,
        phone = $12, email = $13, status = $14,
        is_default = $15, is_pickup_location = $16,
        is_fulfillment_center = $17, business_hours = $18::jsonb,
        metadata = $19::jsonb, updated_at = NOW()
    WHERE id = $1 AND tenant_id = $2
  `,
  DELETE_LOCATION: "DELETE FROM locations WHERE id = $1 AND tenant_id = $2",

  // Sales Analysis
  SALES_BY_DATE_RANGE: `
    SELECT COALESCE(SUM(total_amount), 0) as revenue
    FROM orders
    WHERE tenant_id = $1
      AND status = 'paid'
      AND created_at >= $2
      AND created_at <= $3
  `,

  // Plugin Management
  GET_PLUGINS: `
    SELECT id, tenant_id, name, slug, status, api_endpoint, webhook_url,
           events, config, metadata, created_at, updated_at
    FROM plugins
    WHERE tenant_id = $1
    ORDER BY created_at DESC
  `,
  GET_PLUGIN_BY_SLUG: `
    SELECT id, tenant_id, name, slug, status, api_endpoint, webhook_url,
           events, config, metadata, created_at, updated_at
    FROM plugins
    WHERE tenant_id = $1 AND slug = $2
  `,
  CREATE_PLUGIN: `
    INSERT INTO plugins (tenant_id, name, slug, api_endpoint, webhook_url, events, config, metadata)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id, created_at
  `,
  UPDATE_PLUGIN: `
    UPDATE plugins
    SET name = $3, api_endpoint = $4, webhook_url = $5, events = $6,
        config = $7, metadata = $8, status = $9, updated_at = NOW()
    WHERE tenant_id = $1 AND slug = $2
    RETURNING id, updated_at
  `,
  DELETE_PLUGIN: "DELETE FROM plugins WHERE tenant_id = $1 AND slug = $2",
  UPDATE_PLUGIN_STATUS: `
    UPDATE plugins
    SET status = $3, updated_at = NOW()
    WHERE tenant_id = $1 AND slug = $2
  `,

  // Plugin Events
  CREATE_PLUGIN_EVENT: `
    INSERT INTO plugin_events (plugin_id, tenant_id, event_type, payload)
    VALUES ($1, $2, $3, $4)
    RETURNING id, created_at
  `,
  GET_PLUGIN_EVENTS: `
    SELECT pe.*, p.name as plugin_name, p.slug as plugin_slug
    FROM plugin_events pe
    JOIN plugins p ON pe.plugin_id = p.id
    WHERE pe.tenant_id = $1
    ORDER BY pe.created_at DESC
    LIMIT $2
  `,
  UPDATE_EVENT_STATUS: `
    UPDATE plugin_events
    SET status = $2, processed_at = NOW(), response = $3, error_message = $4
    WHERE id = $1
  `,
  GET_PENDING_EVENTS: `
    SELECT pe.*, p.webhook_url, p.name as plugin_name, p.slug as plugin_slug
    FROM plugin_events pe
    JOIN plugins p ON pe.plugin_id = p.id
    WHERE pe.status = 'pending' AND p.status = 'active' AND pe.retry_count < 3
    ORDER BY pe.created_at ASC
    LIMIT $1
  `,
  INCREMENT_EVENT_RETRY: `
    UPDATE plugin_events
    SET retry_count = retry_count + 1, updated_at = NOW()
    WHERE id = $1
  `,
};
