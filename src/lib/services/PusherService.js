/**
 * PusherService - Centralized Pusher Channels functionality
 * Extracted from the monolithic live component for better maintainability
 */

export class PusherService {
    constructor() {
        this.pusher = null;
        this.Pusher = null;
        this.chatChannel = null;
        this.connected = false;
        this.status = "Disconnected";
        
        // Configuration
        this.PUSHER_KEY = "2df4398e22debaee3ec6";
        this.PUSHER_CLUSTER = "mt1";
        this.CHAT_CHANNEL = "private-live-chat"; // Standard private channel name
        
        // Event callbacks
        this.callbacks = {
            onMessage: null,
            onProductMessage: null,
            onConnected: null,
            onDisconnected: null,
            onError: null
        };
    }

    /**
     * Initialize Pusher client and connect to chat channel
     * @param {string} channelName - Optional channel name to use instead of default
     */
    async init(channelName = null) {
        try {
            // Use provided channel name or default
            if (channelName) {
                this.CHAT_CHANNEL = channelName;
            }

            console.log('PusherService: Initializing with channel:', this.CHAT_CHANNEL);

            // Dynamically import Pusher
            const pusherModule = await import("pusher-js");
            this.Pusher = pusherModule.default;
            
            this.status = "Connecting...";

            // Enable pusher logging in development
            this.Pusher.logToConsole = true;

            // Create Pusher instance
            this.pusher = new this.Pusher(this.PUSHER_KEY, {
                cluster: this.PUSHER_CLUSTER,
                authEndpoint: '/api/pusher/auth'
            });

            // Subscribe to the chat channel
            this.chatChannel = this.pusher.subscribe(this.CHAT_CHANNEL);

            // Set up event handlers
            this.setupEventHandlers();

            // Wait for subscription to succeed
            return new Promise((resolve) => {
                this.chatChannel.bind('pusher:subscription_succeeded', () => {
                    console.log('PusherService: Successfully subscribed to', this.CHAT_CHANNEL);
                    resolve(true);
                });
                
                this.chatChannel.bind('pusher:subscription_error', (error) => {
                    console.error('PusherService: Subscription failed:', error);
                    this.triggerCallback('onError', `Failed to subscribe to chat: ${error}`);
                    resolve(false);
                });

                // Also handle general connection success
                if (this.connected) {
                    // If already connected, resolve immediately
                    setTimeout(() => resolve(true), 100);
                }
            });
        } catch (error) {
            console.error("Failed to initialize Pusher:", error);
            this.status = "Failed";
            this.triggerCallback('onError', `Failed to initialize chat: ${error.message}`);
            return false;
        }
    }

    /**
     * Set up Pusher event handlers
     */
    setupEventHandlers() {
        if (!this.pusher || !this.chatChannel) return;

        // Listen for new messages (both server-triggered and client-triggered)
        this.chatChannel.bind("new-message", (data) => {
            const message = {
                id: data.id || Date.now(),
                user: data.user,
                message: data.message,
                timestamp: new Date(data.timestamp),
            };
            
            this.triggerCallback('onMessage', message);
        });

        // Also listen for client-triggered messages (from other clients)
        this.chatChannel.bind("client-new-message", (data) => {
            const message = {
                id: data.id || Date.now(),
                user: data.user,
                message: data.message,
                timestamp: new Date(data.timestamp),
            };
            
            this.triggerCallback('onMessage', message);
        });

        // Listen for product messages
        this.chatChannel.bind("client-product-message", (data) => {
            const productMessage = {
                id: data.id || Date.now(),
                user: data.user || 'Live Stream',
                message: data.message,
                timestamp: new Date(data.timestamp),
                type: data.type,
                product: data.product,
                isProductMessage: true
            };
            
            this.triggerCallback('onProductMessage', productMessage);
        });

        // Listen for connection state changes
        this.pusher.connection.bind("connected", () => {
            this.connected = true;
            this.status = "Connected";
            this.triggerCallback('onConnected');
        });

        this.pusher.connection.bind("disconnected", () => {
            this.connected = false;
            this.status = "Disconnected";
            this.triggerCallback('onDisconnected');
        });

        this.pusher.connection.bind("failed", () => {
            this.connected = false;
            this.status = "Failed";
            this.triggerCallback('onError', "Chat connection failed");
        });
    }

    /**
     * Send a chat message using client-side trigger (for private channels)
     */
    async sendMessage(user, message) {
        if (!this.connected) {
            throw new Error("Chat not connected");
        }

        if (!message.trim()) {
            throw new Error("Message cannot be empty");
        }

        try {
            // Trigger message directly on the private channel
            await this.chatChannel.trigger("client-new-message", {
                user: user,
                message: message.trim(),
                timestamp: new Date().toISOString(),
                id: Date.now().toString()
            });

            return true;
        } catch (error) {
            console.error("Failed to send message:", error);
            throw error;
        }
    }

    /**
     * Send a product message to the chat
     */
    async sendProductMessage(productData) {
        if (!this.connected) {
            throw new Error("Chat not connected");
        }

        try {
            // Trigger product message on the channel
            await this.chatChannel.trigger("client-product-message", {
                type: productData.type || 'product-highlight',
                product: productData.product,
                message: productData.message,
                timestamp: new Date().toISOString(),
                id: Date.now().toString(),
                user: 'Live Stream' // System user for product messages
            });

            return true;
        } catch (error) {
            console.error("Failed to send product message:", error);
            throw error;
        }
    }

    /**
     * Get current state
     */
    getState() {
        return {
            connected: this.connected,
            status: this.status,
            pusherKey: this.PUSHER_KEY,
            cluster: this.PUSHER_CLUSTER,
            chatChannel: this.CHAT_CHANNEL
        };
    }

    /**
     * Set callback functions
     */
    setCallbacks(callbacks) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    /**
     * Trigger callback if it exists
     */
    triggerCallback(name, ...args) {
        if (this.callbacks[name]) {
            this.callbacks[name](...args);
        }
    }

    /**
     * Disconnect and cleanup
     */
    disconnect() {
        if (this.pusher) {
            this.pusher.disconnect();
        }
        
        this.pusher = null;
        this.Pusher = null;
        this.chatChannel = null;
        this.connected = false;
        this.status = "Disconnected";
    }

    /**
     * Cleanup on destroy
     */
    destroy() {
        this.disconnect();
    }
}