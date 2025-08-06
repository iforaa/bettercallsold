/**
 * ToastService - Centralized toast notification system
 * Extracted from the monolithic live component for better maintainability
 */

export class ToastService {
    constructor() {
        this.toasts = [];
        this.nextId = 1;
        this.subscribers = [];
        this.defaultTimeout = 4000; // 4 seconds
    }

    /**
     * Show a toast notification
     */
    show(message, type = "info", timeout = this.defaultTimeout) {
        const id = this.nextId++;
        const toast = { 
            id, 
            message, 
            type, 
            timestamp: new Date(),
            timeout 
        };
        
        this.toasts = [...this.toasts, toast];
        this.notifySubscribers();

        // Auto-remove after timeout
        if (timeout > 0) {
            setTimeout(() => {
                this.remove(id);
            }, timeout);
        }

        return id;
    }

    /**
     * Remove a specific toast
     */
    remove(id) {
        this.toasts = this.toasts.filter(toast => toast.id !== id);
        this.notifySubscribers();
    }

    /**
     * Clear all toasts
     */
    clear() {
        this.toasts = [];
        this.notifySubscribers();
    }

    /**
     * Convenience methods for different toast types
     */
    success(message, timeout) {
        return this.show(message, "success", timeout);
    }

    error(message, timeout) {
        return this.show(message, "error", timeout);
    }

    info(message, timeout) {
        return this.show(message, "info", timeout);
    }

    warning(message, timeout) {
        return this.show(message, "warning", timeout);
    }

    /**
     * Subscribe to toast updates
     */
    subscribe(callback) {
        this.subscribers.push(callback);
        
        // Return unsubscribe function
        return () => {
            this.subscribers = this.subscribers.filter(sub => sub !== callback);
        };
    }

    /**
     * Notify all subscribers of toast updates
     */
    notifySubscribers() {
        this.subscribers.forEach(callback => {
            callback(this.toasts);
        });
    }

    /**
     * Get current toasts
     */
    getToasts() {
        return [...this.toasts];
    }

    /**
     * Get toast count
     */
    getCount() {
        return this.toasts.length;
    }

    /**
     * Set default timeout for all toasts
     */
    setDefaultTimeout(timeout) {
        this.defaultTimeout = timeout;
    }
}

// Create a singleton instance for global use
export const toastService = new ToastService();