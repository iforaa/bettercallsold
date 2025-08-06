/**
 * LiveSellingService - Handle live selling API operations
 * Extracted from the monolithic live component for better maintainability
 */

export class LiveSellingService {
    constructor() {
        this.currentLiveStreamId = null;
        this.isLiveSelling = false;
        
        // Event callbacks
        this.callbacks = {
            onStarted: null,
            onStopped: null,
            onError: null
        };
    }

    /**
     * Start live selling
     */
    async startLiveSelling(liveSellingForm) {
        // Validate form data
        const validation = this.validateLiveSellingForm(liveSellingForm);
        if (!validation.isValid) {
            throw new Error(validation.error);
        }

        try {
            const response = await fetch("/api/live-selling/start", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(liveSellingForm),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Failed to start live selling: ${errorData.error}`);
            }

            const result = await response.json();
            
            this.isLiveSelling = true;
            this.currentLiveStreamId = result.live_stream.id;
            
            this.triggerCallback('onStarted', result);
            
            return result;
        } catch (error) {
            console.error("Start live selling error:", error);
            this.triggerCallback('onError', error.message);
            throw error;
        }
    }

    /**
     * Stop live selling
     */
    async stopLiveSelling() {
        if (!this.currentLiveStreamId) {
            throw new Error("No active live selling session");
        }

        try {
            const response = await fetch("/api/live-selling/stop", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    live_stream_id: this.currentLiveStreamId,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Failed to stop live selling: ${errorData.error}`);
            }

            const result = await response.json();
            
            this.isLiveSelling = false;
            this.currentLiveStreamId = null;
            
            this.triggerCallback('onStopped', result);
            
            return result;
        } catch (error) {
            console.error("Stop live selling error:", error);
            this.triggerCallback('onError', error.message);
            throw error;
        }
    }

    /**
     * Validate live selling form data
     */
    validateLiveSellingForm(form) {
        if (!form.name || !form.name.trim()) {
            return { isValid: false, error: "Stream name is required" };
        }

        if (!form.agora_channel || !form.agora_channel.trim()) {
            return { isValid: false, error: "Agora channel is required" };
        }

        if (!form.agora_token || !form.agora_token.trim()) {
            return { isValid: false, error: "Agora token is required" };
        }

        return { isValid: true };
    }

    /**
     * Get current live selling state
     */
    getState() {
        return {
            isLiveSelling: this.isLiveSelling,
            currentLiveStreamId: this.currentLiveStreamId
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
     * Reset state
     */
    reset() {
        this.isLiveSelling = false;
        this.currentLiveStreamId = null;
    }

    /**
     * Create default form data
     */
    createDefaultForm(channel = "test-channel", token = "") {
        return {
            name: "",
            description: "",
            agora_channel: channel,
            agora_token: token,
        };
    }
}