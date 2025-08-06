/**
 * AgoraSettingsService - Handle Agora settings persistence
 * Extracted from the monolithic live component for better maintainability
 */

export class AgoraSettingsService {
    constructor() {
        this.settings = {
            token: "",
            channel: "test-channel",
            lastUpdated: null
        };
        this.loaded = false;
    }

    /**
     * Load Agora settings from database
     */
    async loadSettings() {
        try {
            const response = await fetch('/api/agora/settings');
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.settings) {
                    this.settings.token = data.settings.token?.value || "";
                    this.settings.channel = data.settings.channel?.value || "test-channel";
                    this.settings.lastUpdated = data.settings.token?.updated_at || null;
                }
                this.loaded = true;
                return this.settings;
            }
            throw new Error('Failed to load settings from server');
        } catch (error) {
            console.error('Failed to load Agora settings:', error);
            this.loaded = true; // Continue even if loading fails
            throw error;
        }
    }

    /**
     * Save Agora settings to database
     */
    async saveSettings(token, channel = null) {
        try {
            const settings = {
                token: {
                    value: token,
                    metadata: { 
                        saved_at: new Date().toISOString(),
                        user_entered: true 
                    }
                }
            };
            
            if (channel) {
                settings.channel = {
                    value: channel,
                    metadata: { 
                        saved_at: new Date().toISOString() 
                    }
                };
            }

            const response = await fetch('/api/agora/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ settings }),
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    // Update local settings
                    this.settings.token = token;
                    if (channel) this.settings.channel = channel;
                    this.settings.lastUpdated = new Date().toISOString();
                    return true;
                }
            }
            throw new Error('Failed to save settings to server');
        } catch (error) {
            console.error('Failed to save Agora settings:', error);
            throw error;
        }
    }

    /**
     * Get current settings
     */
    getSettings() {
        return { ...this.settings };
    }

    /**
     * Check if settings are loaded
     */
    isLoaded() {
        return this.loaded;
    }

    /**
     * Check if token is available
     */
    hasToken() {
        return !!this.settings.token && this.settings.token.trim() !== "";
    }

    /**
     * Get token
     */
    getToken() {
        return this.settings.token;
    }

    /**
     * Get channel
     */
    getChannel() {
        return this.settings.channel;
    }

    /**
     * Update local settings (without saving to server)
     */
    updateLocal(token, channel) {
        if (token !== undefined) {
            this.settings.token = token;
        }
        if (channel !== undefined) {
            this.settings.channel = channel;
        }
    }

    /**
     * Check if token might be expired based on error codes
     */
    isTokenError(error) {
        return error.code === 'CAN_NOT_GET_GATEWAY_SERVER' || 
               error.message.includes('dynamic key or token timeout');
    }

    /**
     * Reset settings
     */
    reset() {
        this.settings = {
            token: "",
            channel: "test-channel",
            lastUpdated: null
        };
        this.loaded = false;
    }
}