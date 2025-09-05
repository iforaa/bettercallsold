/**
 * Live Stream Global State - Svelte 5 Runes
 * Universal reactivity for live streaming across the entire app
 */

import { browser } from '$app/environment';
import { LiveStreamService } from '../services/LiveStreamService.js';
import { toastService } from '../services/ToastService.js';

// IMPORTANT: Use objects for automatic proxy reactivity
export const liveStreamState = $state({
  // Service instances
  services: {
    agoraService: null,
    liveSellingService: null,
    settingsService: null
  },
  
  // Connection state
  connection: {
    joined: false,
    connectionStatus: "Disconnected",
    isStreamActive: false,
    isLiveSelling: false
  },
  
  // Settings state
  settings: {
    agoraSettings: {
      token: "",
      channel: "test-channel",
      lastUpdated: null
    },
    liveSellingForm: {
      name: "",
      description: "",
      agora_channel: "test-channel",
      agora_token: "",
    }
  },
  
  // UI state
  ui: {
    showTokenPrompt: false,
    isTokenExpired: false,
    settingsLoaded: false,
    videoHandlers: null
  },
  
  // Loading states for different operations
  loading: {
    initializing: false,
    connecting: false,
    startingLiveSelling: false,
    stoppingLiveSelling: false,
    updatingSettings: false
  },
  
  // Error states for different operations
  errors: {
    initialization: '',
    connection: '',
    liveSelling: '',
    settings: '',
    general: ''
  },
  
  // Stream data
  stream: {
    selectedProducts: [],
    sessionStart: null,
    metrics: {
      duration: '0:00',
      viewers: 0,
      isActive: false
    }
  },
  
  // Metadata
  lastFetch: null,
  initialized: false,
  tokenCheckInterval: null
});

// Computed functions (can't export $derived from modules)
export function getStreamStatus() {
  return LiveStreamService.getStreamStatus(liveStreamState.connection);
}

export function getStreamMetrics() {
  return LiveStreamService.getStreamMetrics(
    liveStreamState.connection,
    liveStreamState.stream.sessionStart
  );
}

export function canStartLiveSelling() {
  const status = getStreamStatus();
  return status.canStartLiveSelling && !liveStreamState.loading.startingLiveSelling;
}

export function canStopLiveSelling() {
  const status = getStreamStatus();
  return status.canStopLiveSelling && !liveStreamState.loading.stoppingLiveSelling;
}

export function getLiveSellingFormValidation() {
  return LiveStreamService.validateLiveSellingForm(liveStreamState.settings.liveSellingForm);
}

export function isServicesInitialized() {
  const { services } = liveStreamState;
  return services.agoraService && services.liveSellingService && services.settingsService;
}

export function hasActiveErrors() {
  const { errors } = liveStreamState;
  return errors.initialization || errors.connection || errors.liveSelling || errors.settings || errors.general;
}

// Actions for state management
export const liveStreamActions = {
  // Initialization
  async initializeServices() {
    if (!browser) return false;
    
    // Prevent multiple concurrent initializations
    if (liveStreamState.loading.initializing) {
      console.log('Services initialization already in progress, skipping');
      return false;
    }
    
    liveStreamState.loading.initializing = true;
    liveStreamState.errors.initialization = '';
    
    try {
      const result = await LiveStreamService.initializeServices();
      
      if (result.success) {
        liveStreamState.services = result.services;
        liveStreamState.settings.agoraSettings = { ...result.settings };
        liveStreamState.settings.liveSellingForm = LiveStreamService.getDefaultLiveSellingForm(result.settings);
        liveStreamState.ui.settingsLoaded = true;
        liveStreamState.initialized = true;
        liveStreamState.lastFetch = new Date();
        
        console.log('Live stream services initialized successfully');
        return true;
      } else {
        liveStreamState.errors.initialization = result.error;
        console.error('Failed to initialize live stream services:', result.error);
        return false;
      }
    } catch (error) {
      liveStreamState.errors.initialization = error.message;
      console.error('Failed to initialize live stream services:', error);
      return false;
    } finally {
      liveStreamState.loading.initializing = false;
    }
  },

  async initializeAgora() {
    if (!isServicesInitialized()) {
      console.error('Services not initialized');
      return false;
    }

    const callbacks = {
      onUserPublished: liveStreamActions.handleUserPublished,
      onUserUnpublished: liveStreamActions.handleUserUnpublished,
      onUserLeft: liveStreamActions.handleUserLeft,
      onConnectionStateChange: liveStreamActions.handleConnectionStateChange,
      onError: (error) => {
        liveStreamState.errors.general = error;
        toastService.show("Video client error", 'error');
      },
      onSuccess: (message) => {
        toastService.show(message, 'success');
      }
    };

    const success = await LiveStreamService.initializeAgora(liveStreamState.services.agoraService, callbacks);
    
    if (success) {
      // Check token status and auto-join if valid
      const tokenStatus = await liveStreamActions.checkTokenStatus();
      
      if (tokenStatus.hasToken && !tokenStatus.isExpired) {
        // Token is valid, auto-join
        await liveStreamActions.joinChannel();
        
        // Show warning if token expires soon (less than 2 hours)
        if (tokenStatus.timeRemaining < 7200) { // 2 hours in seconds
          const hoursLeft = Math.floor(tokenStatus.timeRemaining / 3600);
          const minutesLeft = Math.floor((tokenStatus.timeRemaining % 3600) / 60);
          toastService.show(`Token expires in ${hoursLeft}h ${minutesLeft}m`, 'warning');
        }
      } else {
        // Token is expired or missing
        liveStreamState.ui.isTokenExpired = tokenStatus.isExpired;
        liveStreamState.ui.showTokenPrompt = true;
        
        if (tokenStatus.hasToken) {
          toastService.show("Your Agora token has expired. Please generate a new one.", 'warning');
        } else {
          toastService.show("Please generate an Agora token to start streaming", 'info');
        }
      }
      
      // Start periodic token check (every 30 minutes)
      liveStreamActions.startTokenMonitoring();
    }

    return success;
  },

  // Connection management
  async joinChannel() {
    const { agoraService } = liveStreamState.services;
    const { channel, token } = liveStreamState.settings.agoraSettings;
    
    if (!agoraService) {
      toastService.show("Agora service not initialized", 'error');
      return false;
    }
    
    liveStreamState.loading.connecting = true;
    liveStreamState.errors.connection = '';
    liveStreamState.connection.connectionStatus = "Connecting...";
    
    try {
      const result = await LiveStreamService.joinChannel(agoraService, channel, token);
      
      if (result.success) {
        liveStreamState.ui.isTokenExpired = false;
        toastService.show("Waiting for stream from mobile app...", 'info');
        return true;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Join channel error:", error);
      
      if (LiveStreamService.isTokenError(error)) {
        liveStreamState.ui.isTokenExpired = true;
        liveStreamState.ui.showTokenPrompt = true;
        liveStreamState.errors.connection = "Agora token has expired. Please enter a new token.";
        liveStreamState.connection.connectionStatus = "Token Expired";
        toastService.show("Token expired - please enter a new token", 'error');
      } else {
        liveStreamState.errors.connection = error.message;
        liveStreamState.connection.connectionStatus = "Connection Failed";
        toastService.show("Failed to join channel", 'error');
      }
      return false;
    } finally {
      liveStreamState.loading.connecting = false;
    }
  },

  async leaveChannel() {
    const { agoraService } = liveStreamState.services;
    
    if (!agoraService) return false;
    
    try {
      const result = await LiveStreamService.leaveChannel(agoraService);
      
      if (result.success) {
        if (liveStreamState.ui.videoHandlers) {
          liveStreamState.ui.videoHandlers.clearVideoContainer();
        }
        liveStreamState.connection.isStreamActive = false;
        return true;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Leave channel error:", error);
      toastService.show("Failed to leave channel", 'error');
      return false;
    }
  },

  // Live selling management
  async startLiveSelling() {
    const { liveSellingService } = liveStreamState.services;
    const formData = liveStreamState.settings.liveSellingForm;
    
    // Validate form
    const validation = LiveStreamService.validateLiveSellingForm(formData);
    if (!validation.valid) {
      toastService.show(`Validation error: ${validation.errors.join(', ')}`, 'error');
      return false;
    }
    
    liveStreamState.loading.startingLiveSelling = true;
    liveStreamState.errors.liveSelling = '';
    
    const callbacks = {
      onStarted: (result) => {
        liveStreamState.connection.isLiveSelling = true;
        liveStreamState.stream.sessionStart = new Date();
        toastService.show("Live selling started successfully!", 'success');
      },
      onError: (error) => {
        liveStreamState.errors.liveSelling = error;
        toastService.show(error, 'error');
      }
    };
    
    try {
      const result = await LiveStreamService.startLiveSelling(liveSellingService, formData, callbacks);
      return result.success;
    } catch (error) {
      liveStreamState.errors.liveSelling = error.message;
      return false;
    } finally {
      liveStreamState.loading.startingLiveSelling = false;
    }
  },

  async stopLiveSelling() {
    const { liveSellingService } = liveStreamState.services;
    
    liveStreamState.loading.stoppingLiveSelling = true;
    liveStreamState.errors.liveSelling = '';
    
    const callbacks = {
      onStopped: (result) => {
        liveStreamState.connection.isLiveSelling = false;
        liveStreamState.stream.sessionStart = null;
        toastService.show("Live selling stopped successfully!", 'success');
        
        // Reset form
        const { agoraSettings } = liveStreamState.settings;
        liveStreamState.settings.liveSellingForm = LiveStreamService.getDefaultLiveSellingForm(agoraSettings);
      },
      onError: (error) => {
        liveStreamState.errors.liveSelling = error;
        toastService.show(error, 'error');
      }
    };
    
    try {
      const result = await LiveStreamService.stopLiveSelling(liveSellingService, callbacks);
      return result.success;
    } catch (error) {
      liveStreamState.errors.liveSelling = error.message;
      return false;
    } finally {
      liveStreamState.loading.stoppingLiveSelling = false;
    }
  },

  // Settings management
  async updateAgoraSettings() {
    const { settingsService, agoraService } = liveStreamState.services;
    const { agora_token, agora_channel } = liveStreamState.settings.liveSellingForm;
    const isJoined = liveStreamState.connection.joined;
    
    if (!agora_channel.trim() || !agora_token.trim()) {
      toastService.show("Channel and token are required", 'error');
      return false;
    }
    
    liveStreamState.loading.updatingSettings = true;
    liveStreamState.errors.settings = '';
    
    try {
      toastService.show("Updating Agora settings and reconnecting...", 'info');
      
      const result = await LiveStreamService.updateAgoraSettings(
        settingsService, 
        agoraService, 
        agora_token, 
        agora_channel, 
        isJoined
      );
      
      if (result.success) {
        liveStreamState.settings.agoraSettings = result.settings;
        toastService.show("Agora settings updated successfully!", 'success');
        return true;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Update settings error:", error);
      liveStreamState.errors.settings = error.message;
      toastService.show("Failed to update Agora settings", 'error');
      return false;
    } finally {
      liveStreamState.loading.updatingSettings = false;
    }
  },

  async handleTokenSubmit(token) {
    const { settingsService, agoraService } = liveStreamState.services;
    const channel = liveStreamState.settings.liveSellingForm.agora_channel;
    const isJoined = liveStreamState.connection.joined;
    
    try {
      const result = await LiveStreamService.handleTokenSubmit(
        settingsService,
        agoraService,
        token,
        channel,
        isJoined
      );
      
      if (result.success) {
        liveStreamState.settings.agoraSettings = result.settings;
        liveStreamState.settings.liveSellingForm.agora_token = token.trim();
        liveStreamState.ui.showTokenPrompt = false;
        liveStreamState.ui.isTokenExpired = false;
        return true;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Token submit error:", error);
      toastService.show("Failed to save token", 'error');
      return false;
    }
  },

  // Event handlers
  handleUserPublished(user, mediaType) {
    if (mediaType === "video" && liveStreamState.ui.videoHandlers) {
      const remoteVideoTrack = user.videoTrack;
      liveStreamState.ui.videoHandlers.displayRemoteVideo(user, remoteVideoTrack);
      liveStreamState.connection.isStreamActive = true;
      
      if (liveStreamState.connection.isLiveSelling) {
        toastService.show("Stream reconnected!", 'success');
      }
      toastService.show("Stream started from mobile app!", 'success');
    }
    
    if (mediaType === "audio") {
      user.audioTrack?.play();
    }
  },

  handleUserUnpublished(user, mediaType) {
    if (mediaType === "video" && liveStreamState.ui.videoHandlers) {
      liveStreamState.ui.videoHandlers.removeVideoContainer(user.uid);
      
      const agoraState = liveStreamState.services.agoraService?.getState();
      
      if (agoraState && !agoraState.hasRemoteVideo && agoraState.isLocalStreaming && agoraState.localVideoTrack) {
        liveStreamState.ui.videoHandlers.displayLocalVideo(agoraState.localVideoTrack);
        liveStreamState.connection.isStreamActive = true;
      } else {
        liveStreamState.connection.isStreamActive = agoraState?.hasRemoteVideo || false;
      }
    }
    
    toastService.show("Stream ended", 'info');
  },

  handleUserLeft(user) {
    if (liveStreamState.ui.videoHandlers) {
      liveStreamState.ui.videoHandlers.removeVideoContainer(user.uid);
    }
  },

  handleConnectionStateChange(curState) {
    liveStreamState.connection.connectionStatus = curState;
    liveStreamState.connection.joined = curState === "CONNECTED";
  },

  // Video event handlers
  setupVideoEventHandlers() {
    if (!browser) return () => {};
    
    const onVideoHandlersReady = (event) => {
      liveStreamState.ui.videoHandlers = event.detail;
    };
    
    const onLocalStreamStarted = (event) => {
      const detail = event.detail;
      console.log("Local stream started event:", {
        videoHandlers: !!liveStreamState.ui.videoHandlers,
        videoTrack: !!detail.videoTrack
      });
      
      if (liveStreamState.ui.videoHandlers && detail.videoTrack) {
        console.log("Calling displayLocalVideo...");
        liveStreamState.ui.videoHandlers.displayLocalVideo(detail.videoTrack);
      }
      liveStreamState.connection.isStreamActive = true;
    };
    
    const onLocalStreamStopped = () => {
      if (liveStreamState.ui.videoHandlers) {
        liveStreamState.ui.videoHandlers.clearVideoContainer();
      }
      liveStreamState.connection.isStreamActive = false;
      
      // Auto-stop live selling when broadcasting stops
      if (liveStreamState.connection.isLiveSelling) {
        toastService.show("Broadcasting stopped - automatically stopping live selling", 'info');
        liveStreamActions.stopLiveSelling();
      }
    };
    
    return LiveStreamService.setupVideoEventHandlers(
      onVideoHandlersReady,
      onLocalStreamStarted,
      onLocalStreamStopped
    );
  },

  // UI state management
  showTokenPrompt() {
    liveStreamState.ui.showTokenPrompt = true;
  },

  hideTokenPrompt() {
    liveStreamState.ui.showTokenPrompt = false;
  },

  // Data management
  updateLiveSellingForm(updates) {
    liveStreamState.settings.liveSellingForm = {
      ...liveStreamState.settings.liveSellingForm,
      ...updates
    };
  },

  updateSelectedProducts(products) {
    liveStreamState.stream.selectedProducts = products;
    console.log('Selected products updated:', products.length);
  },

  // Error management
  clearErrors() {
    liveStreamState.errors = {
      initialization: '',
      connection: '',
      liveSelling: '',
      settings: '',
      general: ''
    };
  },

  clearError(errorType) {
    if (liveStreamState.errors[errorType] !== undefined) {
      liveStreamState.errors[errorType] = '';
    }
  },

  // Token generation
  async generateToken(channel = null) {
    const currentChannel = channel || liveStreamState.settings.liveSellingForm.agora_channel || 'test-channel';
    
    try {
      const response = await fetch('/api/agora/generate-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          channel: currentChannel,
          role: 'publisher',
          expire_hours: 24
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        const error = new Error(result.error || 'Failed to generate token');
        error.code = result.code;
        error.instructions = result.instructions;
        throw error;
      }
      
      // Update the form with the new token
      liveStreamState.settings.liveSellingForm.agora_token = result.token;
      liveStreamState.settings.liveSellingForm.agora_channel = result.channel;
      
      // Update the agora settings
      liveStreamState.settings.agoraSettings.token = result.token;
      liveStreamState.settings.agoraSettings.channel = result.channel;
      liveStreamState.settings.agoraSettings.lastUpdated = new Date().toISOString();
      
      // Reset token expired status
      liveStreamState.ui.isTokenExpired = false;
      
      toastService.show(`Token generated successfully! Valid for 24 hours.`, 'success');
      return true;
      
    } catch (error) {
      console.error('Token generation error:', error);
      toastService.show(`Failed to generate token: ${error.message}`, 'error');
      throw error;
    }
  },

  // Check if token is expired or needs renewal
  async checkTokenStatus() {
    try {
      const response = await fetch('/api/agora/generate-token');
      const result = await response.json();
      
      if (result.success && result.has_token) {
        const isExpired = result.is_expired;
        const timeRemaining = result.time_remaining_hours;
        
        liveStreamState.ui.isTokenExpired = isExpired;
        
        // Show warning if token expires in less than 1 hour
        if (!isExpired && timeRemaining < 1 && timeRemaining > 0) {
          toastService.show(`Token expires in ${result.time_remaining_seconds} seconds`, 'warning');
        }
        
        return {
          hasToken: true,
          isExpired,
          timeRemaining: result.time_remaining_seconds
        };
      }
      
      return { hasToken: false, isExpired: true, timeRemaining: 0 };
      
    } catch (error) {
      console.error('Token status check error:', error);
      return { hasToken: false, isExpired: true, timeRemaining: 0 };
    }
  },

  // Token monitoring
  startTokenMonitoring() {
    // Clear existing interval if any
    if (liveStreamState.tokenCheckInterval) {
      clearInterval(liveStreamState.tokenCheckInterval);
    }
    
    // Check token status every 30 minutes
    liveStreamState.tokenCheckInterval = setInterval(async () => {
      const tokenStatus = await liveStreamActions.checkTokenStatus();
      
      if (tokenStatus.isExpired) {
        // Token expired, show modal automatically
        liveStreamState.ui.isTokenExpired = true;
        liveStreamState.ui.showTokenPrompt = true;
        toastService.show("Your Agora token has expired. Please generate a new one.", 'error');
      } else if (tokenStatus.timeRemaining < 3600) { // Less than 1 hour
        // Token expiring soon, warn user
        const minutesLeft = Math.floor(tokenStatus.timeRemaining / 60);
        toastService.show(`Token expires in ${minutesLeft} minutes. Consider generating a new one.`, 'warning');
      }
    }, 30 * 60 * 1000); // 30 minutes
  },

  stopTokenMonitoring() {
    if (liveStreamState.tokenCheckInterval) {
      clearInterval(liveStreamState.tokenCheckInterval);
      liveStreamState.tokenCheckInterval = null;
    }
  },

  // Retry initialization or connection
  async retry() {
    liveStreamActions.clearErrors();
    if (!liveStreamState.initialized) {
      return await liveStreamActions.initializeServices();
    } else {
      return await liveStreamActions.joinChannel();
    }
  },

  // Cleanup
  cleanup() {
    LiveStreamService.cleanup(liveStreamState.services);
    
    // Stop token monitoring
    liveStreamActions.stopTokenMonitoring();
    
    // Reset state
    liveStreamState.connection = {
      joined: false,
      connectionStatus: "Disconnected",
      isStreamActive: false,
      isLiveSelling: false
    };
    
    liveStreamState.stream.sessionStart = null;
    liveStreamState.initialized = false;
  },

  // Retry operations
  retry() {
    if (liveStreamState.errors.initialization) {
      return this.initializeServices();
    }
    if (liveStreamState.errors.connection) {
      return this.joinChannel();
    }
  }
};