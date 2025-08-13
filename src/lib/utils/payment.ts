/**
 * Payment Method Utilities
 * Handles payment method formatting with proper names and emojis
 */

export const PAYMENT_METHODS = {
  // Digital Wallets
  apple_pay: { name: 'Apple Pay', emoji: '🍎' },
  google_pay: { name: 'Google Pay', emoji: '🟢' },
  paypal: { name: 'PayPal', emoji: '💙' },
  venmo: { name: 'Venmo', emoji: '💸' },
  
  // Credit Cards
  visa: { name: 'Visa', emoji: '💳' },
  mastercard: { name: 'Mastercard', emoji: '💳' },
  amex: { name: 'American Express', emoji: '💳' },
  discover: { name: 'Discover', emoji: '💳' },
  credit_card: { name: 'Credit Card', emoji: '💳' },
  
  // Debit Cards
  debit_card: { name: 'Debit Card', emoji: '💳' },
  
  // Bank Transfers
  ach: { name: 'ACH Transfer', emoji: '🏦' },
  wire: { name: 'Wire Transfer', emoji: '🏦' },
  bank_transfer: { name: 'Bank Transfer', emoji: '🏦' },
  
  // Buy Now Pay Later
  klarna: { name: 'Klarna', emoji: '🛍️' },
  afterpay: { name: 'Afterpay', emoji: '🛍️' },
  affirm: { name: 'Affirm', emoji: '🛍️' },
  sezzle: { name: 'Sezzle', emoji: '🛍️' },
  
  // Cash and Other
  cash: { name: 'Cash', emoji: '💵' },
  check: { name: 'Check', emoji: '📝' },
  gift_card: { name: 'Gift Card', emoji: '🎁' },
  store_credit: { name: 'Store Credit', emoji: '🏪' },
  
  // Crypto
  bitcoin: { name: 'Bitcoin', emoji: '₿' },
  crypto: { name: 'Cryptocurrency', emoji: '🪙' },
  
  // Default fallback
  unknown: { name: 'Other', emoji: '💰' }
};

/**
 * Format payment method with emoji and proper name
 */
export function formatPaymentMethod(paymentMethod: string | null | undefined): string {
  if (!paymentMethod) {
    return `${PAYMENT_METHODS.unknown.emoji} ${PAYMENT_METHODS.unknown.name}`;
  }
  
  // Normalize the payment method string
  const normalized = paymentMethod.toLowerCase().trim();
  
  // Check for exact matches first
  if (PAYMENT_METHODS[normalized]) {
    const method = PAYMENT_METHODS[normalized];
    return `${method.emoji} ${method.name}`;
  }
  
  // Check for partial matches
  for (const [key, value] of Object.entries(PAYMENT_METHODS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return `${value.emoji} ${value.name}`;
    }
  }
  
  // If no match found, use the original string with capitalization and unknown emoji
  const formatted = paymentMethod
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
    
  return `${PAYMENT_METHODS.unknown.emoji} ${formatted}`;
}

/**
 * Get just the emoji for a payment method
 */
export function getPaymentMethodEmoji(paymentMethod: string | null | undefined): string {
  if (!paymentMethod) {
    return PAYMENT_METHODS.unknown.emoji;
  }
  
  const normalized = paymentMethod.toLowerCase().trim();
  
  if (PAYMENT_METHODS[normalized]) {
    return PAYMENT_METHODS[normalized].emoji;
  }
  
  for (const [key, value] of Object.entries(PAYMENT_METHODS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value.emoji;
    }
  }
  
  return PAYMENT_METHODS.unknown.emoji;
}

/**
 * Get just the formatted name for a payment method
 */
export function getPaymentMethodName(paymentMethod: string | null | undefined): string {
  if (!paymentMethod) {
    return PAYMENT_METHODS.unknown.name;
  }
  
  const normalized = paymentMethod.toLowerCase().trim();
  
  if (PAYMENT_METHODS[normalized]) {
    return PAYMENT_METHODS[normalized].name;
  }
  
  for (const [key, value] of Object.entries(PAYMENT_METHODS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value.name;
    }
  }
  
  // Fallback to formatted original string
  return paymentMethod
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}