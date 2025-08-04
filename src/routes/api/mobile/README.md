# Mobile API Documentation

This mobile API provides CommentSold-compatible endpoints for mobile applications. The API mimics the structure and functionality of CommentSold's API while serving data from your local database.

## Base URL
```
http://localhost:5173/api/mobile
```

## Endpoints

### Products

#### Get Products with Filtering
```
GET /api/mobile/products/find
```

**Query Parameters:**
- `last_post_id` (string) - For pagination, get products after this ID
- `collection_ids` (string) - Comma-separated collection IDs to filter by
- `colors` (string) - Comma-separated colors to filter by
- `sizes` (string) - Comma-separated sizes to filter by
- `limit` (number, default: 20) - Number of products to return
- `page` (number, default: 1) - Page number for pagination
- `search` (string) - Search query for products
- `status` (string, default: 'active') - Product status filter
- `sort_by` (string, default: 'created_at') - Sort field (created_at, updated_at, name, price, inventory_count)
- `sort_order` (string, default: 'desc') - Sort order (asc, desc)

**Response Format:**
```json
{
  "products": [
    {
      "product_id": 123,
      "post_id": 123,
      "created_at": 1640995200,
      "product_name": "Sample Product",
      "description": "Product description",
      "quantity": 10,
      "price": 29.99,
      "price_label": "$29.99",
      "brand": "Brand Name",
      "sku": "SKU123",
      "thumbnail": "https://example.com/image.jpg",
      "filename": "https://example.com/image.jpg",
      "extra_media": [...],
      "inventory": [...],
      "tags": ["tag1", "tag2"],
      "collections": [...],
      "is_available": true,
      "formatted_price": "$29.99"
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 20,
  "has_more": true,
  "last_post_id": "456",
  "filters": {
    "collection_ids": "1,2",
    "colors": "red,blue",
    "sizes": "M,L",
    "search": "shirt",
    "status": "active"
  }
}
```

#### Get Product Details
```
GET /api/mobile/products/{id}
```

**Response Format:**
```json
[
  {
    "product_id": 123,
    "product_name": "Sample Product",
    "description": "Full product description",
    "extra_media": [...],
    "inventory": [...],
    "options": [
      {
        "name": "Size",
        "values": ["S", "M", "L", "XL"]
      },
      {
        "name": "Color", 
        "values": ["Red", "Blue", "Green"]
      }
    ],
    "all_images": [...],
    "seo_title": "Product SEO Title",
    "seo_description": "Product SEO Description"
  }
]
```

### Collections

#### Get Collections
```
GET /api/mobile/collections
```

**Query Parameters:**
- `include_product_count` (boolean, default: false) - Include product counts
- `status` (string, default: 'active') - Collection status filter
- `limit` (number, default: 50) - Number of collections to return
- `search` (string) - Search query for collections

**Response Format:**
```json
{
  "collections": [
    {
      "id": 1,
      "name": "Collection Name",
      "description": "Collection description",
      "slug": "collection-slug",
      "product_count": 25,
      "image": "https://example.com/collection.jpg",
      "sample_products": [...],
      "is_active": true
    }
  ],
  "total": 10,
  "has_more": false
}
```

### Search

#### Search Products
```
GET /api/mobile/search
```

**Query Parameters:**
- `q` or `query` (string, required) - Search term
- `limit` (number, default: 20) - Number of results
- `page` (number, default: 1) - Page number
- `collection_id` (number) - Filter by collection
- `sort_by` (string, default: 'relevance') - Sort method (relevance, price_asc, price_desc, name_asc, name_desc, newest, oldest)
- `min_price` (number) - Minimum price filter
- `max_price` (number) - Maximum price filter

**Response Format:**
```json
{
  "query": "search term",
  "products": [...],
  "total": 45,
  "page": 1,
  "limit": 20,
  "total_pages": 3,
  "has_more": true,
  "search_time": "2024-01-01T12:00:00Z",
  "suggestions": ["suggested term 1", "suggested term 2"],
  "filters": {
    "collection_id": 1,
    "min_price": 10,
    "max_price": 100,
    "sort_by": "relevance"
  }
}
```

### Filters

#### Get Available Filters
```
GET /api/mobile/filters
```

**Query Parameters:**
- `collection_id` (number) - Get filters for specific collection
- `include_colors` (boolean, default: true) - Include color filters
- `include_sizes` (boolean, default: true) - Include size filters
- `include_brands` (boolean, default: true) - Include brand filters
- `include_price_ranges` (boolean, default: true) - Include price range filters

**Response Format:**
```json
{
  "filters": {
    "colors": [
      {
        "name": "Red",
        "value": "red",
        "count": 15,
        "hex_color": "#FF0000"
      }
    ],
    "sizes": [
      {
        "name": "M",
        "value": "m",
        "count": 25,
        "sort_order": 2
      }
    ],
    "brands": [
      {
        "name": "Brand Name",
        "value": "brand-name",
        "count": 30
      }
    ],
    "price_ranges": [
      {
        "name": "Under $25",
        "min_price": 0,
        "max_price": 25,
        "count": 12,
        "value": "0-25"
      }
    ]
  },
  "total_products": 150,
  "collection_id": null
}
```

## Data Transformation

The API transforms your database products into CommentSold-compatible format:

### Key Field Mappings:
- `id` → `product_id` and `post_id`
- `name` → `product_name`
- `created_at` → Unix timestamp
- `images` → `thumbnail`, `filename`, `extra_media`
- `variants` → `inventory` array
- `tags` → `tags` array
- `collections` → `collections` array with names and IDs

### Mobile-Specific Enhancements:
- `is_available` - Calculated availability status
- `formatted_price` - Human-readable price formatting
- `short_description` - Truncated description for mobile UI
- `primary_image` - Primary product image URL
- `image_urls` - Array of all image URLs
- `variant_count` - Number of product variants
- `collection_names` - Array of collection names

## Usage Examples

### Get Products from Collection
```javascript
fetch('/api/mobile/products/find?collection_ids=1,2&limit=10')
  .then(response => response.json())
  .then(data => console.log(data.products));
```

### Search Products
```javascript
fetch('/api/mobile/search?q=shirt&sort_by=price_asc&limit=20')
  .then(response => response.json())
  .then(data => console.log(data.products));
```

### Get Product Details
```javascript
fetch('/api/mobile/products/123')
  .then(response => response.json())
  .then(data => console.log(data[0])); // Returns array with single product
```

### Get Available Filters
```javascript
fetch('/api/mobile/filters?collection_id=1')
  .then(response => response.json())
  .then(data => console.log(data.filters));
```

## Error Handling

All endpoints return standard HTTP status codes:
- `200` - Success
- `400` - Bad Request (missing required parameters)
- `404` - Not Found (product/collection not found)
- `500` - Internal Server Error

Error responses include:
```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## Performance Notes

- Products are paginated with configurable limits
- Database queries are optimized with proper indexing
- JSON fields are parsed efficiently
- Search uses relevance scoring for better results
- Filters are generated dynamically from product data

## CommentSold Compatibility

This API maintains compatibility with CommentSold's structure:
- Same field names and data types
- Similar pagination using `last_post_id`
- Compatible response formats
- Similar filtering capabilities
- Matching timestamp formats (Unix timestamps)

You can use this API as a drop-in replacement for CommentSold's products API in mobile applications.

## Cart Management

### Get Cart
```
GET /api/mobile/cart
```

**Query Parameters:**
- `purchaseProtectionSupported` (boolean) - Purchase protection support flag
- `redoReturnCoverageSupported` (boolean) - Return coverage support flag  
- `payment_type` (string) - Payment method preference (e.g., "apple-pay")

**Response Format:**
```json
{
  "included_gifts": [],
  "earliest_order_expiration": 1640995200,
  "checkout_message": "Complete your purchase",
  "store_credit_applied": null,
  "tax": {
    "title": "Tax",
    "amount": 2.40,
    "amount_label": "$2.40"
  },
  "subtotal": {
    "title": "Subtotal", 
    "amount": 29.99,
    "amount_label": "$29.99"
  },
  "shipping_total": {
    "title": "Shipping",
    "amount": 0,
    "amount_label": "FREE"
  },
  "total": {
    "title": "Total",
    "amount": 32.39,
    "amount_label": "$32.39"
  },
  "is_local_pickup_selected": false,
  "apple_pay_option": {...},
  "coupon": null,
  "customer": {...},
  "shipments": [
    {
      "shipment_id": 1,
      "shipping_title": "Standard Shipping",
      "shipping_details": "5-7 business days",
      "shipping_fee_label": "FREE",
      "has_shipment_options": false,
      "free_shipping_timer_end": null,
      "cart_products": [...]
    }
  ],
  "purchase_protection_fees": []
}
```

### Get Cart Count
```
GET /api/mobile/cart/count
```

**Response Format:**
```json
{
  "count": 3
}
```

### Add to Cart
```
POST /api/mobile/cart/add
```

**Request Body:**
```json
{
  "product_id": "123",
  "inventory_id": 456
}
```

**Response Format (Added to Cart):**
```json
{
  "message": "Added to Cart",
  "cart_id": "cart-uuid",
  "available_quantity": 5
}
```

**Response Format (Added to Waitlist):**
```json
{
  "message": "Added to Waitlist", 
  "waitlist_id": "waitlist-uuid",
  "available_quantity": 0
}
```

## Waitlist Management

### Get Waitlist
```
GET /api/mobile/waitlist
```

**Response Format:**
```json
[
  {
    "waitlist_id": 123,
    "product_id": 456,
    "product_name": "Sample Product",
    "price": 29.99,
    "price_label": "$29.99",
    "thumbnail": "https://example.com/image.jpg",
    "filename": "https://example.com/image.jpg",
    "size": "M",
    "color": "Red",
    "created_at": 1640995200,
    "allow_waitlist": true,
    "badge_label": "Available",
    "has_video": false,
    "image_height": 400,
    "image_width": 400,
    "is_favorite": 0,
    "preauthorized": false,
    "preauthorized_card_id": null,
    "preauthorized_coupon_id": null,
    "preauthorized_local_pickup": false,
    "preauthorized_location_id": null,
    "strikethrough_label": null
  }
]
```

### Remove from Waitlist
```
DELETE /api/mobile/waitlist/{waitlist_id}
```

**Response Format:**
```json
{
  "message": "Waitlist item removed successfully",
  "waitlist_id": 123
}
```

### Preauthorize Waitlist Item
```
POST /api/mobile/waitlist/{waitlist_id}/preauth
```

**Request Body (Optional):**
```json
{
  "card_id": "card-123",
  "coupon_id": "coupon-456", 
  "local_pickup": false,
  "location_id": "location-789"
}
```

**Response Format:**
```json
{
  "message": "Waitlist item preauthorized successfully",
  "waitlist_id": 123,
  "authorized_at": 1640995200
}
```

## Database Setup

### Initialize Mobile API Tables
```
POST /api/mobile/setup
```

Creates required database tables (`cart`, `users`, `waitlist`) and indexes if they don't exist.

**Response Format:**
```json
{
  "message": "Mobile API database setup completed successfully",
  "tables_created": ["cart", "users", "waitlist"],
  "indexes_created": ["idx_cart_tenant_id", "idx_cart_product_inventory", ...]
}
```

## Cart and Waitlist Flow

The mobile API implements the following user flow:

1. **Add to Cart Request**: Mobile app calls `POST /api/mobile/cart/add`
2. **Inventory Check**: API checks if the requested variant has available quantity
3. **Available**: If quantity > 0, item is added to cart
4. **Unavailable**: If quantity <= 0, item is automatically added to waitlist instead
5. **Response**: API returns appropriate message indicating cart or waitlist addition

This seamlessly handles the "try to add to cart, fallback to waitlist" pattern used by the mobile application.

## Usage Examples

### Add Product to Cart/Waitlist
```javascript
const response = await fetch('/api/mobile/cart/add', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    product_id: '123',
    inventory_id: 456
  })
});

const result = await response.json();

if (result.message === 'Added to Cart') {
  // Item added to cart successfully
  console.log('Cart ID:', result.cart_id);
} else if (result.message === 'Added to Waitlist') {
  // Item added to waitlist (out of stock)
  console.log('Waitlist ID:', result.waitlist_id);
}
```

### Get Current Cart
```javascript
const cartResponse = await fetch('/api/mobile/cart');
const cart = await cartResponse.json();

console.log('Cart items:', cart.shipments[0].cart_products);
console.log('Total:', cart.total.amount_label);
```

### Manage Waitlist
```javascript
// Get waitlist
const waitlistResponse = await fetch('/api/mobile/waitlist');
const waitlist = await waitlistResponse.json();

// Remove item from waitlist
await fetch(`/api/mobile/waitlist/${waitlist[0].waitlist_id}`, {
  method: 'DELETE'
});

// Preauthorize payment for waitlist item
await fetch(`/api/mobile/waitlist/${waitlist[0].waitlist_id}/preauth`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    card_id: 'card-123'
  })
});
```