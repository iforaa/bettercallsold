/**
 * Advanced TypeScript Event Payload Factory
 * 
 * Type-safe, scalable event payload factory with:
 * - Compile-time type checking
 * - Runtime validation
 * - Automatic metadata generation
 * - Builder pattern support
 * - Easy extensibility
 */

import { 
  EventPayloadMap, 
  EventWithMetadata, 
  EventMetadata,
  EventPayload,
  // Specific payload types for builders
  ProductCreatedPayload,
  OrderCreatedPayload,
  CheckoutCompletedPayload,
  CartItemAddedPayload,
  CustomerCreatedPayload
} from '../types/events.js';
import { DEFAULT_TENANT_ID } from '../constants.js';

// ============================================================================
// CORE FACTORY TYPES AND UTILITIES
// ============================================================================

/**
 * Input data requirements for each event type
 * Excludes auto-generated fields like timestamps and IDs
 */
type EventInputMap = {
  'product.created': Omit<ProductCreatedPayload, 'created_at'> & { created_at?: string };
  'product.updated': Omit<EventPayload<'product.updated'>, 'updated_at'> & { updated_at?: string };
  'product.deleted': Omit<EventPayload<'product.deleted'>, 'deleted_at'> & { deleted_at?: string };
  
  'order.created': Omit<OrderCreatedPayload, 'created_at'> & { created_at?: string };
  'order.paid': Omit<EventPayload<'order.paid'>, 'paid_at'> & { paid_at?: string };
  'order.shipped': Omit<EventPayload<'order.shipped'>, 'shipped_at'> & { shipped_at?: string };
  'order.delivered': Omit<EventPayload<'order.delivered'>, 'delivered_at'> & { delivered_at?: string };
  'order.cancelled': Omit<EventPayload<'order.cancelled'>, 'cancelled_at'> & { cancelled_at?: string };
  
  'customer.created': Omit<CustomerCreatedPayload, 'created_at'> & { created_at?: string };
  'customer.updated': Omit<EventPayload<'customer.updated'>, 'updated_at'> & { updated_at?: string };
  
  'cart.item_added': Omit<CartItemAddedPayload, 'added_at'> & { added_at?: string };
  'cart.item_removed': Omit<EventPayload<'cart.item_removed'>, 'removed_at'> & { removed_at?: string };
  'cart.item_updated': Omit<EventPayload<'cart.item_updated'>, 'updated_at'> & { updated_at?: string };
  'cart.cleared': Omit<EventPayload<'cart.cleared'>, 'cleared_at'> & { cleared_at?: string };
  
  'waitlist.item_added': Omit<EventPayload<'waitlist.item_added'>, 'added_at'> & { added_at?: string };
  'waitlist.item_removed': Omit<EventPayload<'waitlist.item_removed'>, 'removed_at'> & { removed_at?: string };
  'waitlist.item_preauthorized': Omit<EventPayload<'waitlist.item_preauthorized'>, 'preauthorized_at'> & { preauthorized_at?: string };
  
  'checkout.started': Omit<EventPayload<'checkout.started'>, 'started_at'> & { started_at?: string };
  'checkout.completed': Omit<CheckoutCompletedPayload, 'completed_at'> & { completed_at?: string };
  'checkout.failed': Omit<EventPayload<'checkout.failed'>, 'failed_at'> & { failed_at?: string };
  
  'favorite.added': Omit<EventPayload<'favorite.added'>, 'added_at'> & { added_at?: string };
  'favorite.removed': Omit<EventPayload<'favorite.removed'>, 'removed_at'> & { removed_at?: string };
  
  'search.performed': Omit<EventPayload<'search.performed'>, 'performed_at'> & { performed_at?: string };
  'search.no_results': Omit<EventPayload<'search.no_results'>, 'performed_at'> & { performed_at?: string };
  
  'inventory.low': Omit<EventPayload<'inventory.low'>, 'detected_at'> & { detected_at?: string };
  'inventory.out': Omit<EventPayload<'inventory.out'>, 'detected_at'> & { detected_at?: string };
  'inventory.updated': Omit<EventPayload<'inventory.updated'>, 'updated_at'> & { updated_at?: string };
};

/**
 * Factory result with metadata
 */
export type EventFactoryResult<T extends keyof EventPayloadMap> = {
  readonly eventType: T;
  readonly payload: EventWithMetadata<T>;
  readonly isValid: boolean;
  readonly validationErrors?: string[];
};

/**
 * Factory configuration options
 */
export interface FactoryOptions {
  tenantId?: string;
  source?: EventMetadata['source'];
  schemaVersion?: string;
  validateOnCreate?: boolean;
  includeDebugInfo?: boolean;
}

// ============================================================================
// MAIN EVENT PAYLOAD FACTORY
// ============================================================================

export class EventPayloadFactory {
  private static readonly DEFAULT_OPTIONS: Required<FactoryOptions> = {
    tenantId: DEFAULT_TENANT_ID,
    source: 'bettercallsold_api',
    schemaVersion: '1.0',
    validateOnCreate: true,
    includeDebugInfo: false
  };

  // ========================================================================
  // GENERIC FACTORY METHOD
  // ========================================================================

  /**
   * Generic factory method with full type safety
   */
  static create<T extends keyof EventPayloadMap>(
    eventType: T,
    input: EventInputMap[T],
    options?: FactoryOptions
  ): EventFactoryResult<T> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    
    try {
      // Generate metadata
      const metadata: EventMetadata = {
        schema_version: opts.schemaVersion,
        generated_at: new Date().toISOString(),
        tenant_id: opts.tenantId,
        source: opts.source
      };

      // Complete the payload with auto-generated fields
      const completePayload = this.completePayload(eventType, input);
      
      // Add metadata
      const payloadWithMetadata = {
        ...completePayload,
        _meta: metadata
      } as EventWithMetadata<T>;

      // Validate if required
      let isValid = true;
      let validationErrors: string[] | undefined;
      
      if (opts.validateOnCreate) {
        const validation = this.validatePayload(eventType, payloadWithMetadata);
        isValid = validation.isValid;
        validationErrors = validation.errors;
      }

      return {
        eventType,
        payload: payloadWithMetadata,
        isValid,
        validationErrors
      };
      
    } catch (error) {
      return {
        eventType,
        payload: {} as EventWithMetadata<T>,
        isValid: false,
        validationErrors: [`Factory error: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  // ========================================================================
  // SPECIFIC EVENT BUILDERS WITH FLUENT API
  // ========================================================================

  /**
   * Product Events Builder
   */
  static product = {
    created: (data: EventInputMap['product.created'], options?: FactoryOptions) =>
      EventPayloadFactory.create('product.created', data, options),
      
    updated: (data: EventInputMap['product.updated'], options?: FactoryOptions) =>
      EventPayloadFactory.create('product.updated', data, options),
      
    deleted: (data: EventInputMap['product.deleted'], options?: FactoryOptions) =>
      EventPayloadFactory.create('product.deleted', data, options)
  };

  /**
   * Order Events Builder
   */
  static order = {
    created: (data: EventInputMap['order.created'], options?: FactoryOptions) =>
      EventPayloadFactory.create('order.created', data, options),
      
    paid: (data: EventInputMap['order.paid'], options?: FactoryOptions) =>
      EventPayloadFactory.create('order.paid', data, options),
      
    shipped: (data: EventInputMap['order.shipped'], options?: FactoryOptions) =>
      EventPayloadFactory.create('order.shipped', data, options),
      
    delivered: (data: EventInputMap['order.delivered'], options?: FactoryOptions) =>
      EventPayloadFactory.create('order.delivered', data, options),
      
    cancelled: (data: EventInputMap['order.cancelled'], options?: FactoryOptions) =>
      EventPayloadFactory.create('order.cancelled', data, options)
  };

  /**
   * Customer Events Builder
   */
  static customer = {
    created: (data: EventInputMap['customer.created'], options?: FactoryOptions) =>
      EventPayloadFactory.create('customer.created', data, options),
      
    updated: (data: EventInputMap['customer.updated'], options?: FactoryOptions) =>
      EventPayloadFactory.create('customer.updated', data, options)
  };

  /**
   * Cart Events Builder
   */
  static cart = {
    itemAdded: (data: EventInputMap['cart.item_added'], options?: FactoryOptions) =>
      EventPayloadFactory.create('cart.item_added', data, options),
      
    itemRemoved: (data: EventInputMap['cart.item_removed'], options?: FactoryOptions) =>
      EventPayloadFactory.create('cart.item_removed', data, options),
      
    itemUpdated: (data: EventInputMap['cart.item_updated'], options?: FactoryOptions) =>
      EventPayloadFactory.create('cart.item_updated', data, options),
      
    cleared: (data: EventInputMap['cart.cleared'], options?: FactoryOptions) =>
      EventPayloadFactory.create('cart.cleared', data, options)
  };

  /**
   * Waitlist Events Builder
   */
  static waitlist = {
    itemAdded: (data: EventInputMap['waitlist.item_added'], options?: FactoryOptions) =>
      EventPayloadFactory.create('waitlist.item_added', data, options),
      
    itemRemoved: (data: EventInputMap['waitlist.item_removed'], options?: FactoryOptions) =>
      EventPayloadFactory.create('waitlist.item_removed', data, options),
      
    itemPreauthorized: (data: EventInputMap['waitlist.item_preauthorized'], options?: FactoryOptions) =>
      EventPayloadFactory.create('waitlist.item_preauthorized', data, options)
  };

  /**
   * Checkout Events Builder
   */
  static checkout = {
    started: (data: EventInputMap['checkout.started'], options?: FactoryOptions) =>
      EventPayloadFactory.create('checkout.started', data, options),
      
    completed: (data: EventInputMap['checkout.completed'], options?: FactoryOptions) =>
      EventPayloadFactory.create('checkout.completed', data, options),
      
    failed: (data: EventInputMap['checkout.failed'], options?: FactoryOptions) =>
      EventPayloadFactory.create('checkout.failed', data, options)
  };

  /**
   * Favorite Events Builder
   */
  static favorite = {
    added: (data: EventInputMap['favorite.added'], options?: FactoryOptions) =>
      EventPayloadFactory.create('favorite.added', data, options),
      
    removed: (data: EventInputMap['favorite.removed'], options?: FactoryOptions) =>
      EventPayloadFactory.create('favorite.removed', data, options)
  };

  /**
   * Search Events Builder
   */
  static search = {
    performed: (data: EventInputMap['search.performed'], options?: FactoryOptions) =>
      EventPayloadFactory.create('search.performed', data, options),
      
    noResults: (data: EventInputMap['search.no_results'], options?: FactoryOptions) =>
      EventPayloadFactory.create('search.no_results', data, options)
  };

  /**
   * Inventory Events Builder
   */
  static inventory = {
    low: (data: EventInputMap['inventory.low'], options?: FactoryOptions) =>
      EventPayloadFactory.create('inventory.low', data, options),
      
    out: (data: EventInputMap['inventory.out'], options?: FactoryOptions) =>
      EventPayloadFactory.create('inventory.out', data, options),
      
    updated: (data: EventInputMap['inventory.updated'], options?: FactoryOptions) =>
      EventPayloadFactory.create('inventory.updated', data, options)
  };

  // ========================================================================
  // PRIVATE HELPER METHODS
  // ========================================================================

  /**
   * Complete payload with auto-generated fields
   */
  private static completePayload<T extends keyof EventPayloadMap>(
    eventType: T, 
    input: EventInputMap[T]
  ): EventPayloadMap[T] {
    const now = new Date().toISOString();
    
    // Add timestamp fields based on event type
    if (eventType.includes('.created')) {
      return { ...input, created_at: now } as EventPayloadMap[T];
    }
    if (eventType.includes('.updated')) {
      return { ...input, updated_at: now } as EventPayloadMap[T];
    }
    if (eventType.includes('.deleted')) {
      return { ...input, deleted_at: now } as EventPayloadMap[T];
    }
    if (eventType.includes('.added')) {
      return { ...input, added_at: now } as EventPayloadMap[T];
    }
    if (eventType.includes('.removed')) {
      return { ...input, removed_at: now } as EventPayloadMap[T];
    }
    if (eventType.includes('paid')) {
      return { ...input, paid_at: now } as EventPayloadMap[T];
    }
    if (eventType.includes('shipped')) {
      return { ...input, shipped_at: now } as EventPayloadMap[T];
    }
    if (eventType.includes('delivered')) {
      return { ...input, delivered_at: now } as EventPayloadMap[T];
    }
    if (eventType.includes('cancelled')) {
      return { ...input, cancelled_at: now } as EventPayloadMap[T];
    }
    if (eventType.includes('started')) {
      return { ...input, started_at: now } as EventPayloadMap[T];
    }
    if (eventType.includes('completed')) {
      return { ...input, completed_at: now } as EventPayloadMap[T];
    }
    if (eventType.includes('failed')) {
      return { ...input, failed_at: now } as EventPayloadMap[T];
    }
    if (eventType.includes('performed')) {
      return { ...input, performed_at: now } as EventPayloadMap[T];
    }
    if (eventType.includes('preauthorized')) {
      return { ...input, preauthorized_at: now } as EventPayloadMap[T];
    }
    if (eventType.includes('inventory')) {
      return { ...input, detected_at: now } as EventPayloadMap[T];
    }
    
    return input as EventPayloadMap[T];
  }

  /**
   * Validate payload structure
   */
  private static validatePayload<T extends keyof EventPayloadMap>(
    eventType: T,
    payload: EventWithMetadata<T>
  ): { isValid: boolean; errors?: string[] } {
    const errors: string[] = [];

    // Basic validation - check required fields exist
    if (!payload._meta) {
      errors.push('Missing _meta field');
    }

    if (payload._meta && !payload._meta.generated_at) {
      errors.push('Missing _meta.generated_at');
    }

    if (payload._meta && !payload._meta.tenant_id) {
      errors.push('Missing _meta.tenant_id');
    }

    // Event-specific validations
    try {
      switch (eventType) {
        case 'product.created':
        case 'product.updated':
          if (!('product_id' in payload)) errors.push('Missing product_id');
          if (!('name' in payload)) errors.push('Missing name');
          if (!('price' in payload)) errors.push('Missing price');
          break;
          
        case 'order.created':
        case 'order.paid':
          if (!('order_id' in payload)) errors.push('Missing order_id');
          if (!('user_id' in payload)) errors.push('Missing user_id');
          if (!('total_amount' in payload)) errors.push('Missing total_amount');
          break;
          
        case 'cart.item_added':
        case 'cart.item_removed':
          if (!('cart_id' in payload)) errors.push('Missing cart_id');
          if (!('product_id' in payload)) errors.push('Missing product_id');
          if (!('user_id' in payload)) errors.push('Missing user_id');
          break;
          
        // Add more validations as needed
      }
    } catch (error) {
      errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  // ========================================================================
  // UTILITY METHODS
  // ========================================================================

  /**
   * Get all supported event types
   */
  static getSupportedEvents(): Array<keyof EventPayloadMap> {
    return [
      'product.created', 'product.updated', 'product.deleted',
      'order.created', 'order.paid', 'order.shipped', 'order.delivered', 'order.cancelled',
      'customer.created', 'customer.updated',
      'cart.item_added', 'cart.item_removed', 'cart.item_updated', 'cart.cleared',
      'waitlist.item_added', 'waitlist.item_removed', 'waitlist.item_preauthorized',
      'checkout.started', 'checkout.completed', 'checkout.failed',
      'favorite.added', 'favorite.removed',
      'search.performed', 'search.no_results',
      'inventory.low', 'inventory.out', 'inventory.updated'
    ];
  }

  /**
   * Check if an event type is supported
   */
  static isEventSupported(eventType: string): eventType is keyof EventPayloadMap {
    return this.getSupportedEvents().includes(eventType as keyof EventPayloadMap);
  }

  /**
   * Get schema version for event type
   */
  static getSchemaVersion(eventType: keyof EventPayloadMap): string {
    // You can implement versioning logic here
    return '1.0';
  }
}

// ============================================================================
// ADVANCED BUILDER PATTERN (OPTIONAL)
// ============================================================================

/**
 * Advanced builder for complex events with fluent API
 */
export class CheckoutEventBuilder {
  private data: Partial<EventInputMap['checkout.completed']> = {};
  private options: FactoryOptions = {};

  static create(): CheckoutEventBuilder {
    return new CheckoutEventBuilder();
  }

  order(orderId: string): this {
    this.data.order_id = orderId;
    return this;
  }

  user(userId: string): this {
    this.data.user_id = userId;
    return this;
  }

  payment(provider: string, paymentId: string, method: string): this {
    this.data.payment_provider = provider;
    this.data.payment_id = paymentId;
    this.data.payment_method = method;
    return this;
  }

  customer(name: string, email: string, phone?: string): this {
    this.data.customer_name = name;
    this.data.customer_email = email;
    if (phone) this.data.customer_phone = phone;
    return this;
  }

  amounts(total: number, processing_time_ms?: number): this {
    this.data.total_amount = total;
    if (processing_time_ms) this.data.processing_time_ms = processing_time_ms;
    return this;
  }

  withOptions(options: FactoryOptions): this {
    this.options = { ...this.options, ...options };
    return this;
  }

  build(): EventFactoryResult<'checkout.completed'> {
    return EventPayloadFactory.checkout.completed(
      this.data as EventInputMap['checkout.completed'], 
      this.options
    );
  }
}

// ============================================================================
// TYPE GUARDS AND UTILITIES
// ============================================================================

/**
 * Type guard to check if result is valid
 */
export function isValidEventResult<T extends keyof EventPayloadMap>(
  result: EventFactoryResult<T>
): result is EventFactoryResult<T> & { isValid: true; validationErrors: undefined } {
  return result.isValid === true;
}

/**
 * Extract payload from result (throws if invalid)
 */
export function getPayload<T extends keyof EventPayloadMap>(
  result: EventFactoryResult<T>
): EventWithMetadata<T> {
  if (!result.isValid) {
    throw new Error(`Invalid payload: ${result.validationErrors?.join(', ')}`);
  }
  return result.payload;
}