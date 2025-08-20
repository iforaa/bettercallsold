import { query } from '$lib/database.js';
import { DiscountService } from './DiscountService.js';
import { CreditService } from './CreditService.js';
import { DEFAULT_TENANT_ID, DEFAULT_MOBILE_USER_ID } from '$lib/constants.js';

/**
 * CartService - Centralized cart operations with discount integration
 * 
 * Handles all cart operations including discount application using DiscountService.
 * Eliminates code duplication between cart and checkout flows.
 */
export class CartService {
  
  /**
   * Get complete cart with applied discounts, credits, and calculated totals
   * @param {string} userId - User ID (defaults to mobile user)
   * @param {number} appliedCredits - Amount of credits to apply (optional, auto-applies max if not specified)
   * @returns {Promise<Object>} Complete cart data with totals
   */
  static async getCart(userId = DEFAULT_MOBILE_USER_ID, appliedCredits = null) {
    try {
      // Get cart items from database
      const cartItems = await this.getCartItems(userId);
      
      // Get applied discount if any
      const appliedDiscount = await this.getAppliedDiscount(userId);
      
      // Get user's credit balance
      const userCredits = await CreditService.getUserBalance(userId);
      
      // If no specific credit amount is provided, automatically apply maximum available credits
      if (appliedCredits === null && userCredits.balance > 0) {
        // Calculate total before credits to determine max applicable credits
        const prelimTotals = await this.calculateTotals(cartItems, appliedDiscount, 0);
        const totalBeforeCredits = prelimTotals.subtotal + prelimTotals.shipping + prelimTotals.tax - prelimTotals.discountAmount;
        appliedCredits = Math.min(userCredits.balance, Math.max(0, totalBeforeCredits));
      } else if (appliedCredits === null) {
        appliedCredits = 0;
      }
      
      // Calculate totals including credits
      const totals = await this.calculateTotals(cartItems, appliedDiscount, appliedCredits);
      
      return {
        success: true,
        cart_items: cartItems,
        pricing: {
          subtotal: totals.subtotal,
          tax: totals.tax,
          shipping: totals.shipping,
          discount_amount: totals.discountAmount,
          credits_applied: totals.creditsApplied,
          total: totals.total
        },
        applied_discount: appliedDiscount,
        user_credits: {
          balance: userCredits.balance,
          total_earned: userCredits.total_earned,
          total_spent: userCredits.total_spent
        }
      };
      
    } catch (error) {
      console.error('CartService.getCart error:', error);
      throw error;
    }
  }

  /**
   * Apply discount code to cart
   * @param {string} userId - User ID
   * @param {string} discountCode - Discount code to apply
   * @returns {Promise<Object>} Updated cart data
   */
  static async applyDiscount(userId, discountCode) {
    try {
      // Get current cart items to calculate subtotal for validation
      const cartItems = await this.getCartItems(userId);
      const subtotal = cartItems.reduce((sum, item) => {
        const price = this.getItemPrice(item);
        return sum + (price * (item.quantity || 1));
      }, 0);

      // Use DiscountService for validation - this eliminates all duplicate logic!
      const validation = await DiscountService.validateCode(discountCode, subtotal, userId);
      
      if (!validation.valid) {
        throw new Error(validation.error || 'Invalid discount code');
      }

      // Store applied discount in discount_usage table (cart type) - NO AMOUNT STORED!
      await query(`
        INSERT INTO discount_usage (
          tenant_id, user_id, discount_id, discount_code_id, 
          usage_type, used_at
        ) VALUES ($1, $2, $3, $4, 'cart', NOW())
        ON CONFLICT (tenant_id, user_id) WHERE usage_type = 'cart'
        DO UPDATE SET
          discount_id = EXCLUDED.discount_id,
          discount_code_id = EXCLUDED.discount_code_id,
          used_at = NOW()
      `, [
        DEFAULT_TENANT_ID, 
        userId, 
        validation.discount.id, 
        validation.discount.code_id
      ]);

      console.log(`✅ Applied discount ${discountCode} to cart`);

      // Return updated cart
      return await this.getCart(userId);
      
    } catch (error) {
      console.error('CartService.applyDiscount error:', error);
      
      // Return cart with error info (but still return cart data)
      const cart = await this.getCart(userId);
      return {
        ...cart,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Remove applied discount from cart
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Updated cart data without discount
   */
  static async removeDiscount(userId) {
    try {
      await query(`
        DELETE FROM discount_usage 
        WHERE tenant_id = $1 AND user_id = $2 AND usage_type = 'cart'
      `, [DEFAULT_TENANT_ID, userId]);

      console.log(`✅ Removed discount from cart for user ${userId}`);

      return await this.getCart(userId);
      
    } catch (error) {
      console.error('CartService.removeDiscount error:', error);
      throw error;
    }
  }

  /**
   * Add item to cart
   * @param {string} userId - User ID  
   * @param {string} productId - Product ID
   * @param {Object} variantData - Variant information (size, color, price, etc.)
   * @returns {Promise<Object>} Updated cart
   */
  static async addItem(userId, productId, variantData = {}) {
    try {
      await query(`
        INSERT INTO cart_items (tenant_id, user_id, product_id, quantity, variant_data)
        VALUES ($1, $2, $3, 1, $4)
      `, [DEFAULT_TENANT_ID, userId, productId, JSON.stringify(variantData)]);

      console.log(`✅ Added item to cart: ${productId}`);
      return await this.getCart(userId);
      
    } catch (error) {
      console.error('CartService.addItem error:', error);
      throw error;
    }
  }

  /**
   * Remove item from cart
   * @param {string} userId - User ID
   * @param {string} cartItemId - Cart item ID to remove  
   * @returns {Promise<Object>} Updated cart
   */
  static async removeItem(userId, cartItemId) {
    try {
      await query(`
        DELETE FROM cart_items 
        WHERE id = $1 AND user_id = $2 AND tenant_id = $3
      `, [cartItemId, userId, DEFAULT_TENANT_ID]);

      console.log(`✅ Removed item from cart: ${cartItemId}`);
      return await this.getCart(userId);
      
    } catch (error) {
      console.error('CartService.removeItem error:', error);
      throw error;
    }
  }

  /**
   * Apply credits to cart (validate credits can be applied)
   * @param {string} userId - User ID
   * @param {number} amount - Amount of credits to apply
   * @returns {Promise<Object>} Updated cart data with credits applied
   */
  static async applyCredits(userId, amount) {
    try {
      // Get current cart to validate against
      const cart = await this.getCart(userId);
      
      if (!cart.cart_items || cart.cart_items.length === 0) {
        throw new Error('Cannot apply credits to empty cart');
      }

      // Validate credit application
      const validation = await CreditService.validateCreditApplication(
        userId,
        amount,
        cart.pricing.total
      );

      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Return updated cart with credits applied
      return await this.getCart(userId, validation.applicable_amount);
      
    } catch (error) {
      console.error('CartService.applyCredits error:', error);
      throw error;
    }
  }

  /**
   * Validate cart for checkout with credits
   * @param {string} userId - User ID
   * @param {number} appliedCredits - Amount of credits being applied
   * @returns {Promise<Object>} Validation result with cart data
   */
  static async validateCartForCheckout(userId, appliedCredits = null) {
    try {
      const cart = await this.getCart(userId, appliedCredits);
      
      if (!cart.cart_items || cart.cart_items.length === 0) {
        throw new Error('Cart is empty');
      }

      // Check if applied discount is still valid (using direct database query for server-side)
      if (cart.applied_discount) {
        const validation = await this.validateDiscountCode(
          cart.applied_discount.code,
          cart.pricing.subtotal,
          userId
        );
        
        if (!validation.valid) {
          throw new Error(`Applied discount is no longer valid: ${validation.error}`);
        }
      }

      // Validate applied credits if any
      if (appliedCredits > 0) {
        const creditValidation = await CreditService.validateCreditApplication(
          userId,
          appliedCredits,
          cart.pricing.subtotal + cart.pricing.tax + cart.pricing.shipping - cart.pricing.discount_amount
        );

        if (!creditValidation.valid) {
          throw new Error(`Applied credits are no longer valid: ${creditValidation.error}`);
        }
      }

      return cart;
      
    } catch (error) {
      console.error('CartService.validateCartForCheckout error:', error);
      throw error;
    }
  }

  /**
   * Validate discount code directly with database (for server-side use)
   * @param {string} code - Discount code to validate
   * @param {number} cartTotal - Cart total amount
   * @param {string} userId - User ID (optional)
   * @returns {Promise<Object>} Validation response
   */
  static async validateDiscountCode(code, cartTotal = 0, userId = null) {
    try {
      // Get discount by code from database
      const discountQuery = `
        SELECT 
          d.*,
          dc.id as code_id,
          dc.code,
          dc.usage_count as code_usage_count
        FROM discounts d
        JOIN discount_codes dc ON d.id = dc.discount_id
        WHERE UPPER(dc.code) = UPPER($1) 
        AND d.tenant_id = $2 
        AND d.status IN ('enabled', 'active')
        AND d.starts_at <= NOW()
        AND (d.ends_at IS NULL OR d.ends_at > NOW())
      `;
      
      const result = await query(discountQuery, [code, DEFAULT_TENANT_ID]);
      
      if (result.rows.length === 0) {
        return {
          valid: false,
          error: 'Discount code not found or expired'
        };
      }
      
      const discount = result.rows[0];
      
      // Check minimum requirements
      if (discount.minimum_requirement_type === 'minimum_amount' && discount.minimum_amount) {
        if (cartTotal < parseFloat(discount.minimum_amount)) {
          return {
            valid: false,
            error: `Minimum order amount of $${discount.minimum_amount} required`
          };
        }
      }
      
      // Check usage limits
      if (discount.usage_limit && discount.total_usage_count >= discount.usage_limit) {
        return {
          valid: false,
          error: 'Discount code has reached its usage limit'
        };
      }
      
      // Return valid result
      return {
        valid: true,
        discount: {
          id: discount.id,
          code_id: discount.code_id,
          code: discount.code,
          title: discount.title,
          discount_type: discount.discount_type,
          value_type: discount.value_type,
          value: parseFloat(discount.value)
        }
      };
      
    } catch (error) {
      console.error('CartService.validateDiscountCode error:', error);
      return {
        valid: false,
        error: 'Failed to validate discount code'
      };
    }
  }

  /**
   * Clear entire cart (used after successful checkout)
   * @param {string} userId - User ID
   */
  static async clearCart(userId) {
    try {
      // Clear cart items
      await query(`
        DELETE FROM cart_items 
        WHERE tenant_id = $1 AND user_id = $2
      `, [DEFAULT_TENANT_ID, userId]);

      console.log(`✅ Cleared cart for user ${userId}`);
      
    } catch (error) {
      console.error('CartService.clearCart error:', error);
      throw error;
    }
  }

  // ==========================================
  // Private helper methods
  // ==========================================

  /**
   * Get raw cart items from database
   * @private
   */
  static async getCartItems(userId) {
    const cartQuery = `
      SELECT 
        c.id as cart_id,
        c.product_id,
        c.quantity,
        c.variant_data,
        c.created_at,
        c.user_id,
        p.title as product_name,
        pv.price as base_price,
        COALESCE(json_agg(
          DISTINCT jsonb_build_object(
            'id', pi.id,
            'src', pi.src,
            'alt', pi.alt
          )
        ) FILTER (WHERE pi.id IS NOT NULL), '[]') as images
      FROM cart_items c
      LEFT JOIN products_new p ON c.product_id = p.id
      LEFT JOIN product_variants_new pv ON p.id = pv.product_id
      LEFT JOIN product_images_new pi ON p.id = pi.product_id
      WHERE c.tenant_id = $1 AND c.user_id = $2
      GROUP BY c.id, c.product_id, c.quantity, c.variant_data, c.created_at, c.user_id, p.title, pv.price
      ORDER BY c.created_at DESC
    `;
    
    const result = await query(cartQuery, [DEFAULT_TENANT_ID, userId]);
    
    // Transform to match mobile app expectations
    return result.rows.map(item => {
      // Parse variant data
      let variantData = {};
      try {
        variantData = item.variant_data ? 
          (typeof item.variant_data === 'string' ? JSON.parse(item.variant_data) : item.variant_data) : {};
      } catch (e) {
        variantData = {};
      }

      // Parse images
      let images = [];
      try {
        images = item.images ? (typeof item.images === 'string' ? JSON.parse(item.images) : item.images) : [];
      } catch (e) {
        images = [];
      }

      const thumbnail = images.length > 0 ? (typeof images[0] === 'string' ? images[0] : images[0]?.url || images[0]) : '';
      const price = this.getItemPrice(item);
      
      return {
        thumbnail: thumbnail,
        filename: thumbnail,
        cart_id: item.cart_id,
        product_name: item.product_name || '',
        product_subtitle: '',
        product_id: item.product_id,
        inventory_id: variantData.inventory_id || null,
        created_at: Math.floor(new Date(item.created_at).getTime() / 1000),
        price_label: `$${price.toFixed(2)}`,
        price: price,
        quantity: item.quantity || 1,
        image_width: 400,
        image_height: 400,
        waitlist: 0,
        is_gift_item: false,
        expires_at: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours from now
        inventory_not_held_message: null,
        message: null,
        messages: [],
        can_delete: true,
        color: variantData.color || '',
        size: variantData.size || '',
        style: ''
      };
    });
  }

  /**
   * Get applied discount from database
   * @private
   */
  static async getAppliedDiscount(userId) {
    const discountQuery = `
      SELECT 
        du.*,
        dc.code,
        d.title,
        d.discount_type,
        d.value_type,
        d.value
      FROM discount_usage du
      JOIN discount_codes dc ON du.discount_code_id = dc.id
      JOIN discounts d ON du.discount_id = d.id
      WHERE du.tenant_id = $1 
        AND du.user_id = $2 
        AND du.usage_type = 'cart'
    `;
    
    const result = await query(discountQuery, [DEFAULT_TENANT_ID, userId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const discount = result.rows[0];
    return {
      id: discount.discount_id,
      code: discount.code,
      title: discount.title,
      discount_type: discount.discount_type,
      value_type: discount.value_type,
      value: parseFloat(discount.value)
      // Removed: discount_amount (calculated dynamically)
    };
  }

  /**
   * Calculate cart totals with applied discount and credits
   * @private
   */
  static async calculateTotals(cartItems, appliedDiscount, appliedCredits = 0) {
    const subtotal = cartItems.reduce((sum, item) => {
      const price = this.getItemPrice(item);
      return sum + (price * (item.quantity || 1));
    }, 0);
    
    const shipping = 0; // Free shipping for now
    const tax = subtotal * 0.08; // 8% tax
    
    // Calculate discount amount dynamically based on current subtotal
    let discountAmount = 0;
    if (appliedDiscount) {
      discountAmount = DiscountService.calculateDiscountAmount(appliedDiscount, subtotal);
    }
    
    // Calculate total before credits
    const totalBeforeCredits = subtotal + shipping + tax - discountAmount;
    
    // Apply credits (cannot exceed total)
    const creditsApplied = Math.min(appliedCredits, Math.max(0, totalBeforeCredits));
    
    // Final total after credits
    const total = Math.max(0, totalBeforeCredits - creditsApplied);
    
    return {
      subtotal,
      tax,
      shipping,
      discountAmount,
      creditsApplied,
      total
    };
  }

  /**
   * Get item price from variant data or base price
   * @private
   */
  static getItemPrice(item) {
    // Try variant price first, then base price, then default to 0
    let variantData = {};
    try {
      variantData = item.variant_data ? 
        (typeof item.variant_data === 'string' ? JSON.parse(item.variant_data) : item.variant_data) : {};
    } catch (e) {
      variantData = {};
    }

    if (variantData.price) {
      return typeof variantData.price === 'string' ? parseFloat(variantData.price) : variantData.price;
    } else if (item.base_price || item.price) {
      const price = item.base_price || item.price;
      return typeof price === 'string' ? parseFloat(price) : price;
    }
    
    return 0;
  }
}