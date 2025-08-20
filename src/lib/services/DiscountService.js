/**
 * DiscountService - Client-side discount operations
 * Handles all discount-related API calls and data transformations
 * Follows the established service pattern used by ProductService and OrderService
 */

export class DiscountService {
  /**
   * Get all discounts with optional filtering and pagination
   * @param {Object} params - Filter and pagination parameters
   * @returns {Promise<Object>} Discounts data with pagination info
   */
  static async getDiscounts(params = {}) {
    const searchParams = new URLSearchParams();
    
    if (params.status && params.status !== 'all') searchParams.set('status', params.status);
    if (params.search) searchParams.set('search', params.search);
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.offset) searchParams.set('offset', params.offset.toString());
    
    const url = `/api/discounts${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch discounts: HTTP ${response.status}`);
    }
    
    return await response.json();
  }

  /**
   * Get a single discount by ID
   * @param {string} id - Discount ID
   * @returns {Promise<Object>} Discount data with usage statistics
   */
  static async getDiscount(id) {
    const response = await fetch(`/api/discounts/${id}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Discount not found');
      }
      throw new Error(`Failed to fetch discount: HTTP ${response.status}`);
    }
    
    return await response.json();
  }

  /**
   * Create a new discount
   * @param {Object} discountData - Discount creation data
   * @returns {Promise<Object>} Created discount response
   */
  static async createDiscount(discountData) {
    const response = await fetch('/api/discounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(discountData)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to create discount: HTTP ${response.status}`);
    }
    
    return await response.json();
  }

  /**
   * Update an existing discount
   * @param {string} id - Discount ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Update response
   */
  static async updateDiscount(id, updateData) {
    const response = await fetch(`/api/discounts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to update discount: HTTP ${response.status}`);
    }
    
    return await response.json();
  }

  /**
   * Delete a discount
   * @param {string} id - Discount ID
   * @returns {Promise<Object>} Delete response
   */
  static async deleteDiscount(id) {
    const response = await fetch(`/api/discounts/${id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to delete discount: HTTP ${response.status}`);
    }
    
    return await response.json();
  }

  /**
   * Generate a random discount code
   * @returns {Promise<Object>} Generated code response
   */
  static async generateCode() {
    const response = await fetch('/api/discounts/generate-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to generate discount code: HTTP ${response.status}`);
    }
    
    return await response.json();
  }

  /**
   * Validate a discount code
   * @param {string} code - Discount code to validate
   * @param {number} cartTotal - Cart total amount (optional)
   * @param {string} userId - User ID (optional)
   * @returns {Promise<Object>} Validation response
   */
  static async validateCode(code, cartTotal = 0, userId = null) {
    const response = await fetch('/api/discounts/validate-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        code,
        cart_total: cartTotal,
        user_id: userId 
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to validate discount code: HTTP ${response.status}`);
    }
    
    return await response.json();
  }

  /**
   * Calculate discount amount dynamically based on current cart total
   * @param {Object} discount - Discount object with value_type and value
   * @param {number} cartTotal - Current cart subtotal
   * @returns {number} Calculated discount amount
   */
  static calculateDiscountAmount(discount, cartTotal) {
    let discountAmount = 0;
    
    if (discount.value_type === 'percentage') {
      discountAmount = (cartTotal * parseFloat(discount.value)) / 100;
    } else if (discount.value_type === 'fixed_amount') {
      discountAmount = Math.min(parseFloat(discount.value), cartTotal);
    }
    
    // Round to 2 decimal places
    return Math.round(discountAmount * 100) / 100;
  }

  /**
   * Get discount status based on dates and status
   * @param {Object} discount - Discount object
   * @returns {string} Computed status: 'active', 'scheduled', 'expired', 'disabled'
   */
  static getDiscountStatus(discount) {
    const now = new Date();
    const startsAt = new Date(discount.starts_at);
    const endsAt = discount.ends_at ? new Date(discount.ends_at) : null;

    if (discount.status === 'disabled') return 'disabled';
    if (startsAt > now) return 'scheduled';
    if (endsAt && endsAt < now) return 'expired';
    return 'active';
  }

  /**
   * Format discount value for display
   * @param {Object} discount - Discount object
   * @returns {string} Formatted discount value
   */
  static formatDiscountValue(discount) {
    if (discount.value_type === 'percentage') {
      return `${discount.value}%`;
    } else {
      return `$${discount.value}`;
    }
  }

  /**
   * Get discount type icon
   * @param {string} discountType - Discount type
   * @returns {string} Icon emoji for the discount type
   */
  static getDiscountTypeIcon(discountType) {
    switch (discountType) {
      case 'amount_off_order': return '💰';
      case 'amount_off_products': return '🏷️';
      case 'buy_x_get_y': return '🔄';
      case 'free_shipping': return '🚚';
      default: return '💰';
    }
  }

  /**
   * Get discount type display name
   * @param {string} discountType - Discount type
   * @returns {string} Human-readable display name
   */
  static getDiscountTypeDisplay(discountType) {
    const displayNames = {
      'amount_off_order': 'Amount off order',
      'amount_off_products': 'Amount off products',
      'buy_x_get_y': 'Buy X Get Y',
      'free_shipping': 'Free shipping'
    };
    return displayNames[discountType] || discountType;
  }

  /**
   * Prepare discount data for form submission
   * @param {Object} formData - Raw form data
   * @returns {Object} Prepared data for API submission
   */
  static prepareDiscountData(formData) {
    // Format dates
    const startsAt = new Date(`${formData.starts_at}T${formData.start_time}:00Z`);
    let endsAt = null;
    
    if (formData.set_end_date && formData.ends_at && formData.end_time) {
      endsAt = new Date(`${formData.ends_at}T${formData.end_time}:00Z`);
    }

    return {
      title: formData.title,
      description: formData.description,
      discount_type: formData.discount_type,
      method: formData.method,
      value_type: formData.value_type,
      value: parseFloat(formData.value),
      minimum_requirement_type: formData.minimum_requirement_type,
      minimum_amount: formData.minimum_amount ? parseFloat(formData.minimum_amount) : null,
      minimum_quantity: formData.minimum_quantity ? parseInt(formData.minimum_quantity) : null,
      usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
      usage_limit_per_customer: formData.usage_limit_per_customer ? parseInt(formData.usage_limit_per_customer) : null,
      can_combine_with_product_discounts: formData.can_combine_with_product_discounts,
      can_combine_with_order_discounts: formData.can_combine_with_order_discounts,
      can_combine_with_shipping_discounts: formData.can_combine_with_shipping_discounts,
      customer_eligibility: formData.customer_eligibility,
      applies_to_subscription: formData.applies_to_subscription,
      applies_to_one_time: formData.applies_to_one_time,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt ? endsAt.toISOString() : null,
      available_on_online_store: formData.available_on_online_store,
      available_on_mobile_app: formData.available_on_mobile_app,
      discount_code: formData.method === 'code' ? formData.discount_code : undefined,
      status: formData.status
    };
  }

  /**
   * Populate form data from discount object
   * @param {Object} discount - Discount data from API
   * @returns {Object} Form-ready data
   */
  static populateFormData(discount) {
    // Parse dates with null checks
    const startsAt = discount.starts_at ? new Date(discount.starts_at) : new Date();
    const endsAt = discount.ends_at ? new Date(discount.ends_at) : null;

    return {
      title: discount.title || '',
      description: discount.description || '',
      discount_type: discount.discount_type || '',
      method: discount.method || 'code',
      value_type: discount.value_type || 'percentage',
      value: discount.value?.toString() || '',
      minimum_requirement_type: discount.minimum_requirement_type || 'none',
      minimum_amount: discount.minimum_amount?.toString() || '',
      minimum_quantity: discount.minimum_quantity?.toString() || '',
      usage_limit: discount.usage_limit?.toString() || '',
      usage_limit_per_customer: discount.usage_limit_per_customer?.toString() || '',
      can_combine_with_product_discounts: discount.can_combine_with_product_discounts || false,
      can_combine_with_order_discounts: discount.can_combine_with_order_discounts || false,
      can_combine_with_shipping_discounts: discount.can_combine_with_shipping_discounts || false,
      customer_eligibility: discount.customer_eligibility || 'all',
      applies_to_subscription: discount.applies_to_subscription !== false,
      applies_to_one_time: discount.applies_to_one_time !== false,
      available_on_online_store: discount.available_on_online_store !== false,
      available_on_mobile_app: discount.available_on_mobile_app !== false,
      discount_code: discount.code || '',
      status: discount.status === 'active' ? 'enabled' : 'disabled',
      
      // Format dates
      starts_at: startsAt.toISOString().split('T')[0],
      start_time: startsAt.toTimeString().slice(0, 5),
      set_end_date: !!endsAt,
      ends_at: endsAt ? endsAt.toISOString().split('T')[0] : '',
      end_time: endsAt ? endsAt.toTimeString().slice(0, 5) : ''
    };
  }
}