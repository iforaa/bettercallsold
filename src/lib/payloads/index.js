/**
 * Simple Event Payload Builders
 *
 * Standardized, easy-to-use functions for building consistent event payloads.
 * No complex types or classes - just pure functions that return standardized objects.
 */

// ============================================================================
// CHECKOUT EVENTS
// ============================================================================

/**
 * Build checkout.completed event payload
 */
export function buildCheckoutCompletedPayload({
  orderId,
  userId,
  payment,
  customer,
  items,
  pricing,
  metrics,
}) {
  return {
    // Core order info
    order_id: orderId,
    user_id: userId,
    status: "processing",

    // Financial data
    total_amount: pricing.total,
    subtotal_amount: pricing.subtotal,
    tax_amount: pricing.tax || 0,
    shipping_amount: pricing.shipping || 0,

    // Payment info
    payment_provider: payment.provider,
    payment_id: payment.payment_id,
    payment_method: payment.method,

    // Customer info
    customer_name: customer.name || "Guest Customer",
    email: customer.email || "",
    customer_phone: customer.phone || "",

    // Items summary
    item_count: items.length,

    // Metadata
    processing_time_ms: metrics.processingTime,
    completed_at: new Date().toISOString(),
  };
}

/**
 * Build checkout.failed event payload
 */
export function buildCheckoutFailedPayload({
  orderId,
  userId,
  error,
  paymentMethod,
  customer,
  metrics,
}) {
  return {
    order_id: orderId,
    user_id: userId,
    payment_method: paymentMethod,
    error_message: error.message,
    error_type: error.constructor.name,
    customer_email: customer?.email || "",
    processing_time_ms: metrics.processingTime,
    failed_at: new Date().toISOString(),
  };
}

// ============================================================================
// CART EVENTS
// ============================================================================

/**
 * Build cart.item_added event payload
 */
export function buildCartItemAddedPayload({
  cartId,
  productId,
  productName,
  inventoryId,
  userId,
  inventory,
  quantity = 1,
  availableQuantity,
}) {
  return {
    cart_id: cartId,
    product_id: productId,
    product_name: productName,
    inventory_id: inventoryId,
    user_id: userId,
    quantity: quantity,
    size: inventory.size || "One Size",
    color: inventory.color || "Default",
    price: inventory.price || inventory.product_price || 0,
    available_quantity: availableQuantity,
    added_at: new Date().toISOString(),
  };
}

/**
 * Build cart.item_removed event payload
 */
export function buildCartItemRemovedPayload({
  cartId,
  productId,
  productName,
  userId,
  quantity,
  removalReason = "user_action",
}) {
  return {
    cart_id: cartId,
    product_id: productId,
    product_name: productName,
    user_id: userId,
    quantity: quantity,
    removal_reason: removalReason,
    removed_at: new Date().toISOString(),
  };
}

/**
 * Build cart.cleared event payload
 */
export function buildCartClearedPayload({
  cartId,
  userId,
  itemsCount,
  totalValue,
  clearReason = "checkout_completed",
}) {
  return {
    cart_id: cartId,
    user_id: userId,
    items_count: itemsCount,
    total_value: totalValue,
    clear_reason: clearReason,
    cleared_at: new Date().toISOString(),
  };
}

// ============================================================================
// ORDER EVENTS
// ============================================================================

/**
 * Build order.paid event payload
 */
export function buildOrderPaidPayload({
  orderId,
  userId,
  totalAmount,
  customerEmail,
  customerName,
  payment,
}) {
  return {
    order_id: orderId,
    user_id: userId,
    total_amount: totalAmount,
    customer_email: customerEmail,
    customer_name: customerName,
    payment_provider: payment.provider,
    payment_id: payment.payment_id,
    payment_method: payment.method,
    transaction_id: payment.transaction_id || null,
    receipt_url: payment.receipt_url || null,
    paid_at: new Date().toISOString(),
  };
}

/**
 * Build order.shipped event payload
 */
export function buildOrderShippedPayload({
  orderId,
  customerEmail,
  customerName,
  shippingAddress,
  trackingNumber,
  carrier,
  estimatedDelivery,
  shippedItems,
}) {
  return {
    order_id: orderId,
    customer_email: customerEmail,
    customer_name: customerName,
    shipping_address: shippingAddress,
    tracking_number: trackingNumber || null,
    carrier: carrier,
    estimated_delivery: estimatedDelivery || null,
    shipped_items: shippedItems.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
      name: item.name,
    })),
    shipped_at: new Date().toISOString(),
  };
}

// ============================================================================
// PRODUCT EVENTS
// ============================================================================

/**
 * Build product.created event payload
 */
export function buildProductCreatedPayload({
  productId,
  name,
  description,
  price,
  status = "active",
  images = [],
  tags = [],
  collections = [],
  inventoryCount,
}) {
  return {
    product_id: productId,
    name: name,
    description: description,
    price: price,
    status: status,
    images: images,
    tags: tags,
    collections: collections,
    inventory_count: inventoryCount || 0,
    created_at: new Date().toISOString(),
  };
}

/**
 * Build product.updated event payload
 */
export function buildProductUpdatedPayload({
  productId,
  name,
  description,
  price,
  status,
  images,
  tags,
  collections,
  previousValues = {},
}) {
  return {
    product_id: productId,
    name: name,
    description: description,
    price: price,
    status: status,
    images: images || [],
    tags: tags || [],
    collections: collections || [],
    previous_values: previousValues,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Build product.deleted event payload
 */
export function buildProductDeletedPayload({
  productId,
  name,
  deletionReason = "user_requested",
}) {
  return {
    product_id: productId,
    name: name,
    deletion_reason: deletionReason,
    deleted_at: new Date().toISOString(),
  };
}

// ============================================================================
// WAITLIST EVENTS
// ============================================================================

/**
 * Build waitlist.item_added event payload
 */
export function buildWaitlistItemAddedPayload({
  waitlistId,
  productId,
  productName,
  userId,
  userEmail,
  size,
  color,
  notifyWhenAvailable = true,
}) {
  return {
    waitlist_id: waitlistId,
    product_id: productId,
    product_name: productName,
    user_id: userId,
    user_email: userEmail,
    size: size || null,
    color: color || null,
    notify_when_available: notifyWhenAvailable,
    added_at: new Date().toISOString(),
  };
}

/**
 * Build waitlist.item_removed event payload
 */
export function buildWaitlistItemRemovedPayload({
  waitlistId,
  productId,
  userId,
  userEmail,
  removalReason = "user_action",
}) {
  return {
    waitlist_id: waitlistId,
    product_id: productId,
    user_id: userId,
    user_email: userEmail,
    removal_reason: removalReason,
    removed_at: new Date().toISOString(),
  };
}

/**
 * Build waitlist.item_preauthorized event payload
 */
export function buildWaitlistItemPreauthorizedPayload({
  waitlistId,
  productId,
  productName,
  userId,
  userEmail,
  preauthAmount,
  preauthExpiresAt,
  paymentMethodId,
}) {
  return {
    waitlist_id: waitlistId,
    product_id: productId,
    product_name: productName,
    user_id: userId,
    user_email: userEmail,
    preauth_amount: preauthAmount,
    preauth_expires_at: preauthExpiresAt,
    payment_method_id: paymentMethodId,
    preauthorized_at: new Date().toISOString(),
  };
}

// ============================================================================
// FAVORITE EVENTS
// ============================================================================

/**
 * Build favorite.added event payload
 */
export function buildFavoriteAddedPayload({
  favoriteId,
  productId,
  productName,
  userId,
}) {
  return {
    favorite_id: favoriteId,
    product_id: productId,
    product_name: productName,
    user_id: userId,
    added_at: new Date().toISOString(),
  };
}

/**
 * Build favorite.removed event payload
 */
export function buildFavoriteRemovedPayload({
  favoriteId,
  productId,
  productName,
  userId,
}) {
  return {
    favorite_id: favoriteId,
    product_id: productId,
    product_name: productName,
    user_id: userId,
    removed_at: new Date().toISOString(),
  };
}

// ============================================================================
// SEARCH EVENTS
// ============================================================================

/**
 * Build search.performed event payload
 */
export function buildSearchPerformedPayload({
  searchId,
  query,
  userId,
  resultsCount,
  searchTimeMs,
  filtersApplied = {},
}) {
  return {
    search_id: searchId,
    query: query,
    user_id: userId || null,
    results_count: resultsCount,
    search_time_ms: searchTimeMs,
    filters_applied: filtersApplied,
    performed_at: new Date().toISOString(),
  };
}

/**
 * Build search.no_results event payload
 */
export function buildSearchNoResultsPayload({
  searchId,
  query,
  userId,
  searchTimeMs,
  suggestions = [],
  filtersApplied = {},
}) {
  return {
    search_id: searchId,
    query: query,
    user_id: userId || null,
    search_time_ms: searchTimeMs,
    suggestions: suggestions,
    filters_applied: filtersApplied,
    performed_at: new Date().toISOString(),
  };
}

// ============================================================================
// CUSTOMER EVENTS
// ============================================================================

/**
 * Build customer.created event payload
 */
export function buildCustomerCreatedPayload({
  customerId,
  name,
  email,
  phone,
  registrationSource = "checkout",
  location = {},
}) {
  return {
    customer_id: customerId,
    name: name,
    email: email,
    phone: phone || null,
    registration_source: registrationSource,
    location: {
      city: location.city || null,
      state: location.state || null,
      country: location.country || null,
    },
    created_at: new Date().toISOString(),
  };
}

// ============================================================================
// INVENTORY EVENTS
// ============================================================================

/**
 * Build inventory.updated event payload
 */
export function buildInventoryUpdatedPayload({
  inventoryId,
  productId,
  productName,
  previousQuantity,
  newQuantity,
  changeReason = "sale",
}) {
  return {
    inventory_id: inventoryId,
    product_id: productId,
    product_name: productName,
    previous_quantity: previousQuantity,
    new_quantity: newQuantity,
    change_reason: changeReason,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Build inventory.low event payload
 */
export function buildInventoryLowPayload({
  inventoryId,
  productId,
  productName,
  currentQuantity,
  thresholdQuantity,
  locationId,
}) {
  return {
    inventory_id: inventoryId,
    product_id: productId,
    product_name: productName,
    current_quantity: currentQuantity,
    threshold_quantity: thresholdQuantity,
    location_id: locationId || null,
    detected_at: new Date().toISOString(),
  };
}

/**
 * Build inventory.out event payload
 */
export function buildInventoryOutPayload({
  inventoryId,
  productId,
  productName,
  lastAvailableAt,
  locationId,
}) {
  return {
    inventory_id: inventoryId,
    product_id: productId,
    product_name: productName,
    last_available_at: lastAvailableAt,
    location_id: locationId || null,
    detected_at: new Date().toISOString(),
  };
}
