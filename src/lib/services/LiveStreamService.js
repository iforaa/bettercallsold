/**
 * Live Stream Service - Orchestration service for live streaming functionality
 * Coordinates between AgoraService, LiveSellingService, and AgoraSettingsService
 * Follows the Services + Runes + Context architecture pattern
 */

import { AgoraService } from './AgoraService.js';
import { LiveSellingService } from './LiveSellingService.js';
import { AgoraSettingsService } from './AgoraSettingsService.js';

export class LiveStreamService {
	/**
	 * Initialize all live streaming services
	 * @returns {Promise<Object>} Service instances and initialization result
	 */
	static async initializeServices() {
		try {
			const settingsService = new AgoraSettingsService();
			const agoraService = new AgoraService();
			const liveSellingService = new LiveSellingService();

			// Load settings first
			const settings = await settingsService.loadSettings();

			return {
				success: true,
				services: {
					agoraService,
					liveSellingService,
					settingsService
				},
				settings,
				error: null
			};
		} catch (error) {
			return {
				success: false,
				services: null,
				settings: null,
				error: error.message
			};
		}
	}

	/**
	 * Initialize Agora service with callbacks
	 * @param {AgoraService} agoraService - Agora service instance
	 * @param {Object} callbacks - Callback functions
	 * @returns {Promise<boolean>} Success status
	 */
	static async initializeAgora(agoraService, callbacks) {
		if (!agoraService) return false;

		// Set up Agora callbacks
		agoraService.setCallbacks(callbacks);

		// Initialize Agora
		return await agoraService.init();
	}

	/**
	 * Join a live stream channel
	 * @param {AgoraService} agoraService - Agora service instance
	 * @param {string} channel - Channel name
	 * @param {string} token - Agora token
	 * @returns {Promise<Object>} Join result
	 */
	static async joinChannel(agoraService, channel, token) {
		if (!agoraService) {
			throw new Error('Agora service not initialized');
		}

		if (!token) {
			throw new Error('Agora token is required');
		}

		if (!channel) {
			throw new Error('Channel name is required');
		}

		try {
			await agoraService.joinChannel(channel, token);
			return { success: true, error: null };
		} catch (error) {
			return { success: false, error: error.message };
		}
	}

	/**
	 * Leave current channel
	 * @param {AgoraService} agoraService - Agora service instance
	 * @returns {Promise<Object>} Leave result
	 */
	static async leaveChannel(agoraService) {
		if (!agoraService) {
			throw new Error('Agora service not initialized');
		}

		try {
			await agoraService.leaveChannel();
			return { success: true, error: null };
		} catch (error) {
			return { success: false, error: error.message };
		}
	}

	/**
	 * Start live selling session
	 * @param {LiveSellingService} liveSellingService - Live selling service instance
	 * @param {Object} formData - Live selling form data
	 * @param {Object} callbacks - Callback functions
	 * @returns {Promise<Object>} Start result
	 */
	static async startLiveSelling(liveSellingService, formData, callbacks) {
		if (!liveSellingService) {
			throw new Error('Live selling service not initialized');
		}

		try {
			liveSellingService.setCallbacks(callbacks);
			await liveSellingService.startLiveSelling(formData);
			return { success: true, error: null };
		} catch (error) {
			return { success: false, error: error.message };
		}
	}

	/**
	 * Stop live selling session
	 * @param {LiveSellingService} liveSellingService - Live selling service instance
	 * @param {Object} callbacks - Callback functions
	 * @returns {Promise<Object>} Stop result
	 */
	static async stopLiveSelling(liveSellingService, callbacks) {
		if (!liveSellingService) {
			throw new Error('Live selling service not initialized');
		}

		try {
			liveSellingService.setCallbacks(callbacks);
			await liveSellingService.stopLiveSelling();
			return { success: true, error: null };
		} catch (error) {
			return { success: false, error: error.message };
		}
	}

	/**
	 * Update Agora settings and reconnect
	 * @param {AgoraSettingsService} settingsService - Settings service instance
	 * @param {AgoraService} agoraService - Agora service instance
	 * @param {string} token - New token
	 * @param {string} channel - New channel
	 * @param {boolean} isJoined - Current join status
	 * @returns {Promise<Object>} Update result
	 */
	static async updateAgoraSettings(settingsService, agoraService, token, channel, isJoined) {
		if (!settingsService || !agoraService) {
			throw new Error('Services not initialized');
		}

		if (!token.trim() || !channel.trim()) {
			throw new Error('Channel and token are required');
		}

		try {
			// Save new settings
			const saved = await settingsService.saveSettings(token.trim(), channel.trim());
			
			if (!saved) {
				throw new Error('Failed to save settings');
			}

			const newSettings = settingsService.getSettings();

			// Reconnect if currently joined
			if (isJoined) {
				await agoraService.leaveChannel();
				// Add small delay for clean disconnection
				await new Promise(resolve => setTimeout(resolve, 1000));
				await agoraService.joinChannel(newSettings.channel, newSettings.token);
			}

			return { 
				success: true, 
				settings: newSettings,
				error: null 
			};
		} catch (error) {
			return { success: false, error: error.message };
		}
	}

	/**
	 * Handle token submission and reconnection
	 * @param {AgoraSettingsService} settingsService - Settings service instance
	 * @param {AgoraService} agoraService - Agora service instance
	 * @param {string} token - New token
	 * @param {string} channel - Channel name
	 * @param {boolean} isJoined - Current join status
	 * @returns {Promise<Object>} Token submission result
	 */
	static async handleTokenSubmit(settingsService, agoraService, token, channel, isJoined) {
		if (!settingsService || !agoraService) {
			throw new Error('Services not initialized');
		}

		try {
			const saved = await settingsService.saveSettings(token.trim(), channel);
			
			if (!saved) {
				throw new Error('Failed to save token');
			}

			const settings = settingsService.getSettings();

			// Reconnect with new token
			if (isJoined) {
				await agoraService.leaveChannel();
				await new Promise(resolve => setTimeout(resolve, 500));
			}
			
			await agoraService.joinChannel(settings.channel, settings.token);

			return { 
				success: true, 
				settings,
				error: null 
			};
		} catch (error) {
			return { success: false, error: error.message };
		}
	}

	/**
	 * Business logic: Get stream status info
	 * @param {Object} state - Current stream state
	 * @returns {Object} Stream status information
	 */
	static getStreamStatus(state) {
		const { connectionStatus, joined, isStreamActive, isLiveSelling } = state;

		let statusClass = 'disconnected';
		let statusText = 'Disconnected';
		let statusColor = 'default';

		if (connectionStatus === 'CONNECTED' || joined) {
			statusClass = 'connected';
			statusText = 'Connected';
			statusColor = 'success';
		} else if (connectionStatus === 'Connecting...') {
			statusClass = 'connecting';
			statusText = 'Connecting';
			statusColor = 'warning';
		} else if (connectionStatus === 'Token Expired') {
			statusClass = 'token-expired';
			statusText = 'Token Expired';
			statusColor = 'error';
		} else if (connectionStatus === 'Connection Failed') {
			statusClass = 'connection-failed';
			statusText = 'Connection Failed';
			statusColor = 'error';
		}

		return {
			statusClass,
			statusText,
			statusColor,
			isActive: isStreamActive,
			isLive: isLiveSelling,
			canStartLiveSelling: joined && !isLiveSelling,
			canStopLiveSelling: isLiveSelling
		};
	}

	/**
	 * Business logic: Validate live selling form
	 * @param {Object} formData - Live selling form data
	 * @returns {Object} Validation result
	 */
	static validateLiveSellingForm(formData) {
		const errors = [];

		if (!formData.name || formData.name.trim().length === 0) {
			errors.push('Live selling name is required');
		}

		if (!formData.description || formData.description.trim().length === 0) {
			errors.push('Description is required');
		}

		if (!formData.agora_channel || formData.agora_channel.trim().length === 0) {
			errors.push('Agora channel is required');
		}

		if (!formData.agora_token || formData.agora_token.trim().length === 0) {
			errors.push('Agora token is required');
		}

		return {
			valid: errors.length === 0,
			errors: errors
		};
	}

	/**
	 * Business logic: Get default live selling form data
	 * @param {Object} settings - Agora settings
	 * @returns {Object} Default form data
	 */
	static getDefaultLiveSellingForm(settings = {}) {
		return {
			name: "",
			description: "",
			agora_channel: settings.channel || "test-channel",
			agora_token: settings.token || "",
		};
	}

	/**
	 * Business logic: Check if error is token-related
	 * @param {Error} error - Error object
	 * @returns {boolean} True if token error
	 */
	static isTokenError(error) {
		const tokenErrors = [
			'token',
			'expired',
			'invalid',
			'unauthorized',
			'forbidden'
		];

		const errorMessage = error.message.toLowerCase();
		return tokenErrors.some(keyword => errorMessage.includes(keyword));
	}

	/**
	 * Business logic: Get stream metrics
	 * @param {Object} state - Current stream state
	 * @param {Date} sessionStart - Session start time
	 * @returns {Object} Stream metrics
	 */
	static getStreamMetrics(state, sessionStart) {
		const now = new Date();
		const duration = sessionStart ? Math.floor((now - sessionStart) / 1000) : 0;

		const formatDuration = (seconds) => {
			const hours = Math.floor(seconds / 3600);
			const minutes = Math.floor((seconds % 3600) / 60);
			const secs = seconds % 60;
			
			if (hours > 0) {
				return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
			}
			return `${minutes}:${secs.toString().padStart(2, '0')}`;
		};

		return {
			duration: formatDuration(duration),
			isActive: state.isStreamActive,
			isLive: state.isLiveSelling,
			connected: state.joined,
			channel: state.agoraSettings?.channel || 'N/A',
			viewers: 0, // Could be extended with actual viewer count
			status: LiveStreamService.getStreamStatus(state)
		};
	}

	/**
	 * Business logic: Clean up all services
	 * @param {Object} services - Service instances
	 */
	static cleanup(services) {
		if (services?.agoraService) {
			try {
				services.agoraService.destroy();
			} catch (error) {
				console.error('Error cleaning up Agora service:', error);
			}
		}
	}

	/**
	 * Business logic: Setup event handlers for video display
	 * @param {Function} onVideoHandlersReady - Callback for video handlers ready
	 * @param {Function} onLocalStreamStarted - Callback for local stream started
	 * @param {Function} onLocalStreamStopped - Callback for local stream stopped
	 * @returns {Function} Cleanup function
	 */
	static setupVideoEventHandlers(onVideoHandlersReady, onLocalStreamStarted, onLocalStreamStopped) {
		const handlers = {
			'video-handlers-ready': onVideoHandlersReady,
			'local-stream-started': onLocalStreamStarted,
			'local-stream-stopped': onLocalStreamStopped
		};

		// Add event listeners
		Object.entries(handlers).forEach(([event, handler]) => {
			document.addEventListener(event, handler);
		});

		// Return cleanup function
		return () => {
			Object.entries(handlers).forEach(([event, handler]) => {
				document.removeEventListener(event, handler);
			});
		};
	}
}