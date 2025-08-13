/**
 * Formatting utility functions
 */

export const currency = (amount: number, currency = 'USD'): string => 
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);

export const date = (dateString: string): string => 
  new Date(dateString).toLocaleDateString();

export const dateTime = (dateString: string): string => 
  new Date(dateString).toLocaleString();

export const relativeTime = (dateString: string): string => {
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const diff = Date.now() - new Date(dateString).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return rtf.format(-days, 'day');
  if (days < 30) return rtf.format(-Math.floor(days / 7), 'week');
  return rtf.format(-Math.floor(days / 30), 'month');
};

export const number = (value: number): string =>
  new Intl.NumberFormat('en-US').format(value);

export const percentage = (value: number): string =>
  new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 1 }).format(value / 100);

/**
 * Format order ID for compact display
 * Shows first 8 characters with ellipsis, but with better styling
 */
export const orderId = (id: string | null | undefined): string => {
  if (!id) return 'N/A';
  
  // For UUIDs, show first 8 characters
  if (id.length > 8) {
    return `${id.slice(0, 8)}...`;
  }
  
  return id;
};

/**
 * Get full order ID for copy/paste or tooltips
 */
export const fullOrderId = (id: string | null | undefined): string => {
  return id || 'N/A';
};