import { jsonResponse } from '$lib/response.js';
import { PLUGIN_EVENTS } from '$lib/constants.js';

/**
 * GET /api/events/types - Get all available platform event types
 * This endpoint provides the complete list of events that plugins can subscribe to
 */
export async function GET() {
  try {
    // Get all event types from PLUGIN_EVENTS constant
    const eventTypes = Object.values(PLUGIN_EVENTS);
    
    // Create formatted event data with metadata
    const events = eventTypes.map(eventType => {
      const [domain, action] = eventType.split('.');
      
      return {
        id: eventType,
        name: formatEventName(eventType),
        domain: domain,
        action: action,
        description: getEventDescription(eventType),
        icon: getEventIcon(eventType),
        category: getEventCategory(domain)
      };
    });

    // Group events by domain for better organization
    const eventsByDomain = {};
    events.forEach(event => {
      if (!eventsByDomain[event.domain]) {
        eventsByDomain[event.domain] = [];
      }
      eventsByDomain[event.domain].push(event);
    });

    return jsonResponse({
      success: true,
      events: events,
      events_by_domain: eventsByDomain,
      total_count: events.length,
      domains: Object.keys(eventsByDomain),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting event types:', error);
    return jsonResponse({
      success: false,
      error: 'Failed to fetch event types',
      events: [],
      total_count: 0
    }, { status: 500 });
  }
}

/**
 * Format event type into human-readable name
 */
function formatEventName(eventType) {
  return eventType
    .split('.')
    .map(part => part.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' '))
    .join(' - ');
}

/**
 * Get event description
 */
function getEventDescription(eventType) {
  const descriptions = {
    'product.created': 'When a new product is added to the store',
    'product.updated': 'When an existing product is modified',
    'product.deleted': 'When a product is removed from the store',
    'order.created': 'When a new order is placed',
    'order.paid': 'When an order payment is completed',
    'order.shipped': 'When an order is shipped',
    'order.delivered': 'When an order is delivered',
    'order.cancelled': 'When an order is cancelled',
    'customer.created': 'When a new customer account is created',
    'customer.updated': 'When customer information is modified',
    'cart.item_added': 'When an item is added to cart',
    'cart.item_removed': 'When an item is removed from cart',
    'cart.item_updated': 'When cart item quantity is changed',
    'cart.cleared': 'When cart is emptied',
    'waitlist.item_added': 'When someone joins a product waitlist',
    'waitlist.item_removed': 'When someone leaves a waitlist',
    'waitlist.item_preauthorized': 'When waitlist item is preauthorized for payment',
    'checkout.started': 'When checkout process begins',
    'checkout.completed': 'When checkout process completes successfully',
    'checkout.failed': 'When checkout process fails',
    'favorite.added': 'When a product is favorited',
    'favorite.removed': 'When a product is unfavorited',
    'search.performed': 'When a search is performed',
    'search.no_results': 'When a search returns no results',
    'inventory.low': 'When product inventory is running low',
    'inventory.out': 'When product is out of stock',
    'inventory.updated': 'When inventory levels change'
  };
  
  return descriptions[eventType] || `Triggered when ${eventType} occurs`;
}

/**
 * Get event icon
 */
function getEventIcon(eventType) {
  const [domain] = eventType.split('.');
  
  const iconMap = {
    'product.created': '🛍️',
    'product.updated': '✏️',
    'product.deleted': '🗑️',
    'order.created': '📦',
    'order.paid': '💰',
    'order.shipped': '🚚',
    'order.delivered': '✅',
    'order.cancelled': '❌',
    'customer.created': '👤',
    'customer.updated': '✏️',
    'cart.item_added': '🛒',
    'cart.item_removed': '🗑️',
    'cart.item_updated': '✏️',
    'cart.cleared': '🧹',
    'waitlist.item_added': '⏰',
    'waitlist.item_removed': '❌',
    'waitlist.item_preauthorized': '💳',
    'checkout.started': '🚀',
    'checkout.completed': '✅',
    'checkout.failed': '❌',
    'favorite.added': '❤️',
    'favorite.removed': '💔',
    'search.performed': '🔍',
    'search.no_results': '🚫',
    'inventory.low': '⚠️',
    'inventory.out': '📭',
    'inventory.updated': '📊'
  };
  
  return iconMap[eventType] || getDomainIcon(domain);
}

/**
 * Get domain-based icon fallback
 */
function getDomainIcon(domain) {
  const domainIcons = {
    'product': '🛍️',
    'order': '📦',
    'customer': '👤',
    'cart': '🛒',
    'waitlist': '⏰',
    'checkout': '💳',
    'favorite': '❤️',
    'search': '🔍',
    'inventory': '📦'
  };
  
  return domainIcons[domain] || '⚡';
}

/**
 * Get event category based on domain
 */
function getEventCategory(domain) {
  const categories = {
    'product': 'Product Management',
    'order': 'Order Management', 
    'customer': 'Customer Management',
    'cart': 'Shopping Cart',
    'waitlist': 'Waitlist Management',
    'checkout': 'Checkout Process',
    'favorite': 'User Engagement',
    'search': 'Search & Discovery',
    'inventory': 'Inventory Management'
  };
  
  return categories[domain] || 'General';
}