<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { browser } from '$app/environment';
    
    // Services
    import { AgoraService } from '$lib/services/AgoraService.js';
    import { LiveSellingService } from '$lib/services/LiveSellingService.js';
    import { AgoraSettingsService } from '$lib/services/AgoraSettingsService.js';
    import { toastService } from '$lib/services/ToastService.js';
    
    // Components
    import ToastNotifications from '$lib/components/ToastNotifications.svelte';
    import TokenModal from '$lib/components/TokenModal.svelte';
    import StreamDisplay from '$lib/components/StreamDisplay.svelte';
    import LiveChat from '$lib/components/LiveChat.svelte';
    import TestCamera from '$lib/components/TestCamera.svelte';
    import ProductsListSimple from '$lib/components/ProductsListSimple.svelte';
    
    // Services instances
    let agoraService: AgoraService;
    let liveSellingService: LiveSellingService;
    let settingsService: AgoraSettingsService;
    
    // State
    let joined = $state(false);
    let connectionStatus = $state("Disconnected");
    let errorMessage = $state("");
    let isStreamActive = $state(false);
    let isLiveSelling = $state(false);
    let showTokenPrompt = $state(false);
    let isTokenExpired = $state(false);
    let settingsLoaded = $state(false);
    
    // Settings and form data
    let agoraSettings = $state({
        token: "",
        channel: "test-channel",
        lastUpdated: null
    });
    
    let liveSellingForm = $state({
        name: "",
        description: "",
        agora_channel: "test-channel",
        agora_token: "",
    });
    
    // Products state
    let selectedProducts = $state([]);
    
    // Video handlers reference
    let videoHandlers = null;
    
    onMount(async () => {
        if (!browser) return;
        
        try {
            // Set up event listeners FIRST, before any component initialization
            document.addEventListener('video-handlers-ready', (event) => {
                videoHandlers = (event as CustomEvent).detail;
            });
            
            document.addEventListener('local-stream-started', (event) => {
                const detail = (event as CustomEvent).detail;
                console.log("Local stream started event:", {
                    videoHandlers: !!videoHandlers,
                    videoTrack: !!detail.videoTrack
                });
                
                if (videoHandlers && detail.videoTrack) {
                    console.log("Calling displayLocalVideo...");
                    videoHandlers.displayLocalVideo(detail.videoTrack);
                } else {
                    console.error("Missing videoHandlers or videoTrack:", {
                        videoHandlers: !!videoHandlers,
                        videoTrack: !!detail.videoTrack
                    });
                }
                // Set stream active when local broadcasting starts
                isStreamActive = true;
            });
            
            document.addEventListener('local-stream-stopped', () => {
                if (videoHandlers) {
                    videoHandlers.clearVideoContainer();
                }
                isStreamActive = false;
                
                // Auto-stop live selling when broadcasting stops
                if (isLiveSelling) {
                    toastService.info("Broadcasting stopped - automatically stopping live selling");
                    stopLiveSelling();
                }
            });
            
            // Initialize services
            settingsService = new AgoraSettingsService();
            agoraService = new AgoraService();
            liveSellingService = new LiveSellingService();
            
            // Load settings first
            await loadSettings();
            
            // Initialize Agora
            await initializeAgora();
            
        } catch (error) {
            console.error("Failed to initialize:", error);
            errorMessage = `Initialization failed: ${error.message}`;
        }
    });
    
    onDestroy(() => {
        if (!browser) return;
        
        if (agoraService) {
            agoraService.destroy();
        }
    });
    
    async function loadSettings() {
        try {
            const settings = await settingsService.loadSettings();
            agoraSettings = { ...settings };
            liveSellingForm.agora_token = settings.token;
            liveSellingForm.agora_channel = settings.channel;
            settingsLoaded = true;
        } catch (error) {
            console.error('Failed to load settings:', error);
            settingsLoaded = true;
        }
    }
    
    async function initializeAgora() {
        // Set up Agora callbacks
        agoraService.setCallbacks({
            onUserPublished: handleUserPublished,
            onUserUnpublished: handleUserUnpublished,
            onUserLeft: handleUserLeft,
            onConnectionStateChange: handleConnectionStateChange,
            onError: (error) => {
                errorMessage = error;
                toastService.error("Video client error");
            },
            onSuccess: (message) => {
                toastService.success(message);
            }
        });
        
        // Initialize Agora
        const success = await agoraService.init();
        if (!success) return;
        
        // Auto-join if token is available
        if (agoraSettings.token) {
            await joinChannel();
        } else {
            showTokenPrompt = true;
            toastService.info("Please enter your Agora token to start streaming");
        }
    }
    
    function handleUserPublished(user: any, mediaType: string) {
        if (mediaType === "video" && videoHandlers) {
            const remoteVideoTrack = user.videoTrack;
            videoHandlers.displayRemoteVideo(user, remoteVideoTrack);
            isStreamActive = true;
            if (isLiveSelling) {
                toastService.success("Stream reconnected!");
            }
            toastService.success("Stream started from mobile app!");
        }
        
        if (mediaType === "audio") {
            user.audioTrack?.play();
        }
    }
    
    function handleUserUnpublished(user: any, mediaType: string) {
        if (mediaType === "video" && videoHandlers) {
            videoHandlers.removeVideoContainer(user.uid);
            
            const state = agoraService.getState();
            
            // If no remote video but we're broadcasting locally, show our stream
            if (!state.hasRemoteVideo && state.isLocalStreaming && state.localVideoTrack) {
                videoHandlers.displayLocalVideo(state.localVideoTrack);
                isStreamActive = true;
            } else {
                isStreamActive = state.hasRemoteVideo;
            }
        }
        
        toastService.info("Stream ended");
    }
    
    function handleUserLeft(user: any) {
        if (videoHandlers) {
            videoHandlers.removeVideoContainer(user.uid);
        }
    }
    
    function handleConnectionStateChange(curState: string) {
        connectionStatus = curState;
        joined = curState === "CONNECTED"; // Agora returns "CONNECTED" not "Connected"
    }
    
    async function joinChannel() {
        try {
            connectionStatus = "Connecting...";
            
            if (!agoraSettings.token) {
                showTokenPrompt = true;
                toastService.error("Please enter your Agora token");
                connectionStatus = "Token Required";
                return;
            }
            
            await agoraService.joinChannel(agoraSettings.channel, agoraSettings.token);
            isTokenExpired = false;
            toastService.info("Waiting for stream from mobile app...");
            
        } catch (error) {
            console.error("Join channel error:", error);
            
            if (settingsService.isTokenError(error)) {
                isTokenExpired = true;
                showTokenPrompt = true;
                errorMessage = "Agora token has expired. Please enter a new token.";
                toastService.error("Token expired - please enter a new token");
                connectionStatus = "Token Expired";
            } else {
                errorMessage = `Failed to join channel: ${error.message}`;
                toastService.error("Failed to join channel");
                connectionStatus = "Connection Failed";
            }
        }
    }
    
    async function leaveChannel() {
        try {
            await agoraService.leaveChannel();
            if (videoHandlers) {
                videoHandlers.clearVideoContainer();
            }
            isStreamActive = false;
        } catch (error) {
            console.error("Leave channel error:", error);
            toastService.error("Failed to leave channel");
        }
    }
    
    // Live selling functions
    async function startLiveSelling() {
        try {
            liveSellingService.setCallbacks({
                onStarted: (result) => {
                    isLiveSelling = true;
                    toastService.success("Live selling started successfully!");
                },
                onError: (error) => {
                    toastService.error(error);
                }
            });
            
            await liveSellingService.startLiveSelling(liveSellingForm);
        } catch (error) {
            // Error already handled by service callback
        }
    }
    
    async function stopLiveSelling() {
        try {
            liveSellingService.setCallbacks({
                onStopped: (result) => {
                    isLiveSelling = false;
                    toastService.success("Live selling stopped successfully!");
                    
                    // Reset form
                    liveSellingForm = {
                        name: "",
                        description: "",
                        agora_channel: agoraSettings.channel,
                        agora_token: agoraSettings.token,
                    };
                },
                onError: (error) => {
                    toastService.error(error);
                }
            });
            
            await liveSellingService.stopLiveSelling();
        } catch (error) {
            // Error already handled by service callback
        }
    }
    
    // Token handling
    async function handleTokenSubmit(token: string) {
        try {
            const saved = await settingsService.saveSettings(token.trim(), liveSellingForm.agora_channel);
            if (saved) {
                agoraSettings = settingsService.getSettings();
                liveSellingForm.agora_token = token.trim();
                
                showTokenPrompt = false;
                isTokenExpired = false;
                
                if (joined) {
                    await leaveChannel();
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
                await joinChannel();
            }
        } catch (error) {
            console.error("Token submit error:", error);
            toastService.error("Failed to save token");
        }
    }
    
    function handleTokenCancel() {
        showTokenPrompt = false;
    }
    
    // Products handlers
    function handleProductsChange(products) {
        selectedProducts = products;
        console.log('Selected products updated:', products.length);
    }
    
    async function updateAgoraSettings() {
        if (!liveSellingForm.agora_channel.trim() || !liveSellingForm.agora_token.trim()) {
            toastService.error("Channel and token are required");
            return;
        }
        
        try {
            toastService.info("Updating Agora settings and reconnecting...");
            
            const saved = await settingsService.saveSettings(
                liveSellingForm.agora_token.trim(), 
                liveSellingForm.agora_channel.trim()
            );
            
            if (saved) {
                agoraSettings = settingsService.getSettings();
                
                if (joined) {
                    await leaveChannel();
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                
                toastService.info("Reconnecting with new settings...");
                await joinChannel();
                toastService.success("Agora settings updated successfully!");
            }
        } catch (error) {
            console.error("Update settings error:", error);
            toastService.error("Failed to update Agora settings");
        }
    }
</script>

<svelte:head>
    <title>Live Stream - BetterCallSold</title>
</svelte:head>

<div class="page">
    <div class="page-header">
        <div class="header-main">
            <h1>
                <span class="page-icon">📺</span>
                Live Stream
            </h1>
            <div class="connection-status">
                <div class="status-group">
                    <div class="status-indicator {connectionStatus.toLowerCase().replace(' ', '-')}"></div>
                    <span class="status-text">Stream: {connectionStatus}</span>
                </div>
            </div>
        </div>
    </div>

    <div class="page-content">
        {#if errorMessage}
            <div class="error-banner">
                <span class="error-icon">⚠️</span>
                <p>{errorMessage}</p>
                <button class="close-error" onclick={() => (errorMessage = "")}>×</button>
            </div>
        {/if}

        <!-- Main Layout -->
        <div class="main-layout">
            <!-- Stream Display -->
            <StreamDisplay
                channel={agoraSettings.channel}
                {isStreamActive}
                {joined}
                {isLiveSelling}
                bind:liveSellingForm
                onStartLiveSelling={startLiveSelling}
                onStopLiveSelling={stopLiveSelling}
            />

            <!-- Right Column -->
            <div class="right-column">
                <!-- Test Camera -->
                <TestCamera {agoraService} {joined} />

                <!-- Products List -->
                <ProductsListSimple />

                <!-- Live Chat -->
                <LiveChat />
            </div>
        </div>

        <!-- Configuration Section -->
        <div class="config-section">
            <h3>Stream Configuration</h3>
            
            <div class="config-grid">
                <div class="config-item">
                    <label>App ID</label>
                    <input type="text" value={agoraService?.APP_ID || "Loading..."} readonly />
                </div>
                <div class="config-item">
                    <label for="channelConfig">Channel</label>
                    <input
                        id="channelConfig"
                        type="text"
                        bind:value={liveSellingForm.agora_channel}
                        placeholder="test-channel"
                        class="form-input"
                    />
                </div>
                <div class="config-item">
                    <label for="tokenConfig">Token</label>
                    <input
                        id="tokenConfig"
                        type="text"
                        bind:value={liveSellingForm.agora_token}
                        placeholder="Paste Agora token..."
                        class="form-input token-input"
                    />
                </div>
                <div class="config-item">
                    <label>Token Status</label>
                    <input
                        type="text"
                        value={agoraSettings.token ? (isTokenExpired ? "Expired" : "Available") : "Missing"}
                        readonly
                        class={isTokenExpired ? "token-expired" : ""}
                    />
                </div>
                {#if agoraSettings.lastUpdated}
                <div class="config-item">
                    <label>Last Updated</label>
                    <input
                        type="text"
                        value={new Date(agoraSettings.lastUpdated).toLocaleString()}
                        readonly
                    />
                </div>
                {/if}
            </div>
            
            <div class="config-actions">
                <button class="btn-secondary" onclick={updateAgoraSettings}>
                    Update Settings
                </button>
                <button 
                    class="btn-primary"
                    onclick={() => { showTokenPrompt = true; }}
                >
                    🔑 Update Token
                </button>
            </div>
        </div>
    </div>
</div>

<!-- Token Modal -->
<TokenModal 
    bind:show={showTokenPrompt}
    {isTokenExpired}
    onSubmit={handleTokenSubmit}
    onCancel={handleTokenCancel}
/>

<!-- Toast Notifications -->
<ToastNotifications />

<style>
    .page {
        min-height: 100vh;
        background: #f6f6f7;
    }

    .page-header {
        background: white;
        border-bottom: 1px solid #e1e1e1;
        padding: 1rem 2rem;
    }

    .header-main {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .header-main h1 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 600;
        color: #202223;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .page-icon {
        font-size: 1rem;
    }

    .connection-status {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .status-group {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .status-indicator {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #6d7175;
    }

    .status-indicator.connected {
        background: #00a96e;
        animation: pulse 2s infinite;
    }

    .status-indicator.connecting {
        background: #ffa500;
        animation: blink 1s infinite;
    }

    .status-indicator.connection-failed,
    .status-indicator.token-expired {
        background: #d72c0d;
    }

    .status-text {
        font-size: 0.875rem;
        color: #6d7175;
        font-weight: 500;
    }

    .page-content {
        padding: 2rem;
        max-width: 1400px;
        margin: 0 auto;
    }

    .error-banner {
        background: #fef2f2;
        border: 1px solid #fecaca;
        color: #991b1b;
        padding: 1rem 1.5rem;
        margin-bottom: 2rem;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        position: relative;
    }

    .error-icon {
        font-size: 1.25rem;
    }

    .error-banner p {
        flex: 1;
        margin: 0;
    }

    .close-error {
        background: none;
        border: none;
        font-size: 1.25rem;
        color: #991b1b;
        cursor: pointer;
        padding: 0;
    }

    .main-layout {
        display: grid;
        grid-template-columns: 1fr 400px;
        gap: 2rem;
        margin-bottom: 2rem;
    }

    .right-column {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }

    .config-section {
        background: white;
        border: 1px solid #e1e1e1;
        border-radius: 12px;
        padding: 1.5rem;
    }

    .config-section h3 {
        margin: 0 0 1rem 0;
        font-size: 1.125rem;
        font-weight: 600;
        color: #202223;
    }

    .config-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin-bottom: 1rem;
    }

    .config-item {
        display: flex;
        flex-direction: column;
    }

    .config-item label {
        font-size: 0.875rem;
        font-weight: 500;
        color: #202223;
        margin-bottom: 0.5rem;
    }

    .config-item input {
        padding: 0.75rem;
        border: 1px solid #c9cccf;
        border-radius: 6px;
        font-size: 0.875rem;
        background: #f9fafb;
        font-family: monospace;
    }

    .form-input {
        background: white;
    }

    .form-input:focus {
        outline: none;
        border-color: #005bd3;
        box-shadow: 0 0 0 2px rgba(0, 91, 211, 0.1);
    }

    .token-input {
        font-size: 0.75rem;
    }

    .token-expired {
        color: #d72c0d !important;
        background: #fef2f2 !important;
        border-color: #fecaca !important;
    }

    .config-actions {
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
        padding-top: 1rem;
        border-top: 1px solid #f0f0f0;
    }

    .btn-primary,
    .btn-secondary {
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s ease;
        border: none;
    }

    .btn-primary {
        background: #005bd3;
        color: white;
    }

    .btn-primary:hover {
        background: #004bb5;
    }

    .btn-secondary {
        background: white;
        color: #6d7175;
        border: 1px solid #c9cccf;
    }

    .btn-secondary:hover {
        background: #f6f6f7;
    }

    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.6; }
    }

    @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; }
    }

    @media (max-width: 1200px) {
        .main-layout {
            grid-template-columns: 1fr;
        }
    }

    @media (max-width: 768px) {
        .page-content {
            padding: 1rem;
        }

        .header-main {
            flex-direction: column;
            gap: 1rem;
            align-items: flex-start;
        }

        .config-grid {
            grid-template-columns: 1fr;
        }

        .config-actions {
            flex-direction: column;
        }
    }
</style>