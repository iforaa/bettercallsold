/**
 * AgoraService - Centralized Agora RTC functionality
 * Extracted from the monolithic live component for better maintainability
 */

export class AgoraService {
    constructor() {
        this.client = null;
        this.AgoraRTC = null;
        this.localVideoTrack = null;
        this.localAudioTrack = null;
        this.remoteUsers = [];
        this.joined = false;
        this.connectionStatus = "Disconnected";
        this.isLocalStreaming = false;
        this.isCameraActive = false;
        
        // Configuration - App ID will be loaded from server
        this.APP_ID = null;
        this.DEFAULT_CHANNEL = "test-channel";
        
        // Event callbacks
        this.callbacks = {
            onUserPublished: null,
            onUserUnpublished: null,
            onUserLeft: null,
            onConnectionStateChange: null,
            onError: null,
            onSuccess: null
        };
    }

    /**
     * Initialize Agora RTC client
     */
    async init() {
        try {
            // First, get the App ID from the server
            await this.loadAppId();
            
            // Dynamically import Agora SDK
            const agoraModule = await import("agora-rtc-sdk-ng");
            this.AgoraRTC = agoraModule.default;
            
            // Create client
            this.client = this.AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
            
            // Set up event handlers
            this.setupEventHandlers();
            
            this.triggerCallback('onSuccess', 'Agora client initialized successfully');
            return true;
        } catch (error) {
            console.error("Failed to initialize Agora client:", error);
            this.triggerCallback('onError', `Failed to initialize video client: ${error.message}`);
            return false;
        }
    }

    /**
     * Load App ID from server-side configuration
     */
    async loadAppId() {
        if (this.APP_ID) {
            return this.APP_ID; // Already loaded
        }
        
        try {
            const response = await fetch('/api/agora/config');
            if (!response.ok) {
                throw new Error(`Failed to get Agora config: ${response.status}`);
            }
            
            const config = await response.json();
            if (!config.success || !config.app_id) {
                throw new Error('Invalid Agora configuration received');
            }
            
            this.APP_ID = config.app_id;
            return this.APP_ID;
        } catch (error) {
            console.error('Failed to load Agora App ID:', error);
            throw new Error(`Cannot initialize Agora without App ID: ${error.message}`);
        }
    }

    /**
     * Set up Agora event handlers
     */
    setupEventHandlers() {
        if (!this.client) return;

        this.client.on("user-published", async (user, mediaType) => {
            await this.client.subscribe(user, mediaType);
            console.log("subscribe success");

            this.remoteUsers = this.client.remoteUsers;
            
            if (this.callbacks.onUserPublished) {
                this.callbacks.onUserPublished(user, mediaType, this.remoteUsers);
            }
        });

        this.client.on("user-unpublished", (user, mediaType) => {
            this.remoteUsers = this.client.remoteUsers;
            
            if (this.callbacks.onUserUnpublished) {
                this.callbacks.onUserUnpublished(user, mediaType, this.remoteUsers);
            }
        });

        this.client.on("user-left", (user) => {
            this.remoteUsers = this.client.remoteUsers;
            
            if (this.callbacks.onUserLeft) {
                this.callbacks.onUserLeft(user, this.remoteUsers);
            }
        });

        this.client.on("connection-state-change", (curState, revState) => {
            this.connectionStatus = curState;
            console.log(`Connection state changed from ${revState} to ${curState}`);
            
            if (this.callbacks.onConnectionStateChange) {
                this.callbacks.onConnectionStateChange(curState, revState);
            }
        });
    }

    /**
     * Join a channel
     */
    async joinChannel(channel, token, uid = null) {
        if (!this.client) {
            throw new Error("Client not initialized");
        }

        if (!this.APP_ID) {
            throw new Error("App ID not loaded. Make sure init() was called successfully.");
        }

        try {
            this.connectionStatus = "Connecting...";
            
            if (!token) {
                throw new Error("Token is required");
            }

            const joinedUid = await this.client.join(this.APP_ID, channel, token, uid);
            console.log("Join channel success, uid:", joinedUid);

            this.joined = true;
            this.connectionStatus = "Connected";
            
            return joinedUid;
        } catch (error) {
            console.error("Failed to join channel:", error);
            
            // Handle token expiration
            if (error.code === 'CAN_NOT_GET_GATEWAY_SERVER' || 
                error.message.includes('dynamic key or token timeout')) {
                this.connectionStatus = "Token Expired";
                throw new Error("Token has expired");
            } else {
                this.connectionStatus = "Connection Failed";
                throw error;
            }
        }
    }

    /**
     * Leave the channel
     */
    async leaveChannel() {
        if (!this.client || !this.joined) return;
        
        try {
            // Stop local streaming if active
            if (this.isLocalStreaming) {
                await this.stopLocalStreaming();
            }

            await this.client.leave();
            this.joined = false;
            this.connectionStatus = "Disconnected";
            this.remoteUsers = [];
            
            this.triggerCallback('onSuccess', 'Disconnected from channel');
        } catch (error) {
            console.error("Failed to leave channel:", error);
            throw error;
        }
    }

    /**
     * Start local camera
     */
    async startLocalCamera() {
        if (!this.client || !this.AgoraRTC) {
            throw new Error("Client not initialized");
        }

        if (!this.joined) {
            throw new Error("Please connect to the channel first");
        }

        try {
            // Create local video and audio tracks
            this.localVideoTrack = await this.AgoraRTC.createCameraVideoTrack({
                encoderConfig: {
                    width: 640,
                    height: 480,
                    frameRate: 30,
                    bitrateMax: 1000,
                    bitrateMin: 300
                }
            });

            this.localAudioTrack = await this.AgoraRTC.createMicrophoneAudioTrack({
                encoderConfig: {
                    sampleRate: 48000,
                    stereo: false,
                    bitrate: 128
                }
            });

            this.isCameraActive = true;
            
            return {
                videoTrack: this.localVideoTrack,
                audioTrack: this.localAudioTrack
            };
        } catch (error) {
            console.error("Failed to start local camera:", error);
            
            // Clean up if partially created
            if (this.localVideoTrack) {
                this.localVideoTrack.close();
                this.localVideoTrack = null;
            }
            if (this.localAudioTrack) {
                this.localAudioTrack.close();
                this.localAudioTrack = null;
            }
            
            throw error;
        }
    }

    /**
     * Start local streaming (publish tracks)
     */
    async startLocalStreaming() {
        if (!this.client) {
            throw new Error("Client not initialized");
        }

        if (!this.isCameraActive || !this.localVideoTrack || !this.localAudioTrack) {
            throw new Error("Please activate camera first");
        }

        try {
            // Publish local tracks to the channel
            await this.client.publish([this.localVideoTrack, this.localAudioTrack]);

            this.isLocalStreaming = true;
            
            return true;
        } catch (error) {
            console.error("Failed to start local streaming:", error);
            throw error;
        }
    }

    /**
     * Stop local streaming
     */
    async stopLocalStreaming() {
        if (!this.client) return;

        try {
            // Unpublish tracks if streaming
            if (this.isLocalStreaming && this.localVideoTrack && this.localAudioTrack) {
                await this.client.unpublish([this.localVideoTrack, this.localAudioTrack]);
            }

            // Stop and close tracks
            if (this.localVideoTrack) {
                this.localVideoTrack.stop();
                this.localVideoTrack.close();
                this.localVideoTrack = null;
            }

            if (this.localAudioTrack) {
                this.localAudioTrack.stop();
                this.localAudioTrack.close();
                this.localAudioTrack = null;
            }

            this.isLocalStreaming = false;
            this.isCameraActive = false;
            
            return true;
        } catch (error) {
            console.error("Failed to stop local streaming:", error);
            throw error;
        }
    }

    /**
     * Get current state
     */
    getState() {
        return {
            joined: this.joined,
            connectionStatus: this.connectionStatus,
            isLocalStreaming: this.isLocalStreaming,
            isCameraActive: this.isCameraActive,
            remoteUsers: this.remoteUsers,
            hasRemoteVideo: this.remoteUsers.some(u => u.hasVideo),
            localVideoTrack: this.localVideoTrack,
            localAudioTrack: this.localAudioTrack
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
     * Cleanup on destroy
     */
    destroy() {
        if (this.joined) {
            this.leaveChannel();
        }
        
        if (this.localVideoTrack) {
            this.localVideoTrack.close();
        }
        if (this.localAudioTrack) {
            this.localAudioTrack.close();
        }
        
        this.client = null;
        this.AgoraRTC = null;
        this.remoteUsers = [];
        this.joined = false;
        this.connectionStatus = "Disconnected";
        this.isLocalStreaming = false;
        this.isCameraActive = false;
    }
}