<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { browser } from "$app/environment";
    
    // Only import these on the client side
    let AgoraRTC: any;
    let Pusher: any;
    
    // Types for better TypeScript support
    type IAgoraRTCClient = any;
    type IAgoraRTCRemoteUser = any;
    type ICameraVideoTrack = any;
    type IMicrophoneAudioTrack = any;

    // Configuration from environment (APP_ID only)
    const APP_ID = "1fe1d3f0d301498d9e43e0094f091800";
    const DEFAULT_CHANNEL = "test-channel";
    
    // Dynamic settings from database
    let agoraSettings = $state({
        token: "",
        channel: DEFAULT_CHANNEL,
        lastUpdated: null
    });
    let settingsLoaded = $state(false);

    // Pusher Channels Configuration
    const PUSHER_KEY = "2df4398e22debaee3ec6";
    const PUSHER_CLUSTER = "mt1";

    // State variables
    let client: IAgoraRTCClient;
    let pusher: Pusher;
    let chatChannel: any;
    let remoteUsers: IAgoraRTCRemoteUser[] = $state([]);
    let joined = $state(false);
    let connectionStatus = $state("Disconnected");
    let errorMessage = $state("");
    let toasts = $state([]);
    let isStreamActive = $state(false);
    let chatConnected = $state(false);
    let chatStatus = $state("Disconnected");

    // Chat functionality
    let messages = $state([]);
    let newMessage = $state("");
    let userName = $state("Viewer" + Math.floor(Math.random() * 1000));

    // Live selling functionality
    let isLiveSelling = $state(false);
    let currentLiveStreamId = $state(null);
    let showStartForm = $state(false);
    let liveSellingForm = $state({
        name: "",
        description: "",
        agora_channel: DEFAULT_CHANNEL,
        agora_token: "",
    });
    
    // Token management state
    let showTokenPrompt = $state(false);
    let tokenInput = $state("");
    let isTokenExpired = $state(false);

    // Local camera streaming state
    let localVideoTrack: ICameraVideoTrack | null = null;
    let localAudioTrack: IMicrophoneAudioTrack | null = null;
    let isLocalStreaming = $state(false);
    let isCameraActive = $state(false);
    let localStreamError = $state("");
    let localVideoContainer: HTMLDivElement;

    // Video container references
    let remoteVideoContainer: HTMLDivElement;
    let chatContainer: HTMLDivElement;

    // Stream timeout handling for live selling
    let streamTimeoutId: number | null = null;
    let streamTimeoutWarning = $state(false);
    let timeoutCountdown = $state(0);

    // Toast notification system
    function showToast(
        message: string,
        type: "success" | "error" | "info" = "info",
    ) {
        const id = Date.now();
        const toast = { id, message, type };
        toasts = [...toasts, toast];

        setTimeout(() => {
            toasts = toasts.filter((t) => t.id !== id);
        }, 4000);
    }

    function removeToast(id: number) {
        toasts = toasts.filter((t) => t.id !== id);
    }

    // Stream timeout functions for live selling
    function startStreamTimeout() {
        // Only start timeout if live selling is active
        if (!isLiveSelling) return;

        clearStreamTimeout(); // Clear any existing timeout
        streamTimeoutWarning = true;
        timeoutCountdown = 10;

        showToast("Stream disconnected! Auto-stopping live selling in 10 seconds...", "error");

        // Update countdown every second
        const countdownInterval = setInterval(() => {
            timeoutCountdown--;
            if (timeoutCountdown <= 0) {
                clearInterval(countdownInterval);
            }
        }, 1000);

        // Set timeout to stop live selling after 10 seconds
        streamTimeoutId = window.setTimeout(async () => {
            if (isLiveSelling && !isStreamActive) {
                console.log("Stream timeout reached - automatically stopping live selling");
                showToast("Stream timeout reached - stopping live selling automatically", "error");
                await stopLiveSelling();
                streamTimeoutWarning = false;
                timeoutCountdown = 0;
            }
        }, 10000);
    }

    function clearStreamTimeout() {
        if (streamTimeoutId) {
            clearTimeout(streamTimeoutId);
            streamTimeoutId = null;
        }
        streamTimeoutWarning = false;
        timeoutCountdown = 0;
    }

    // Load Agora settings from database
    async function loadAgoraSettings() {
        try {
            const response = await fetch('/api/agora/settings');
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.settings) {
                    agoraSettings.token = data.settings.token?.value || "";
                    agoraSettings.channel = data.settings.channel?.value || DEFAULT_CHANNEL;
                    agoraSettings.lastUpdated = data.settings.token?.updated_at || null;
                    
                    // Update form with loaded settings
                    liveSellingForm.agora_token = agoraSettings.token;
                    liveSellingForm.agora_channel = agoraSettings.channel;
                }
                settingsLoaded = true;
            }
        } catch (error) {
            console.error('Failed to load Agora settings:', error);
            settingsLoaded = true; // Continue even if loading fails
        }
    }

    // Save Agora settings to database
    async function saveAgoraSettings(token, channel = null) {
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
                    agoraSettings.token = token;
                    if (channel) agoraSettings.channel = channel;
                    agoraSettings.lastUpdated = new Date().toISOString();
                    showToast('Agora settings saved successfully', 'success');
                    return true;
                }
            }
            throw new Error('Failed to save settings');
        } catch (error) {
            console.error('Failed to save Agora settings:', error);
            showToast('Failed to save Agora settings', 'error');
            return false;
        }
    }

    onMount(async () => {
        // Only run on client side
        if (!browser) return;
        
        try {
            // Load Agora settings from database first
            await loadAgoraSettings();
            
            // Dynamically import libraries on client side only
            const agoraModule = await import("agora-rtc-sdk-ng");
            AgoraRTC = agoraModule.default;
            
            const pusherModule = await import("pusher-js");
            Pusher = pusherModule.default;
            
            // Initialize Agora client
            client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

            // Set up event handlers
            client.on("user-published", async (user, mediaType) => {
                await client.subscribe(user, mediaType);
                console.log("subscribe success");

                if (mediaType === "video") {
                    const remoteVideoTrack = user.videoTrack;
                    const playerContainer = document.createElement("div");
                    playerContainer.id = user.uid.toString();
                    playerContainer.style.width = "100%";
                    playerContainer.style.height = "100%";
                    playerContainer.style.borderRadius = "8px";
                    playerContainer.style.overflow = "hidden";
                    playerContainer.style.display = "flex";
                    playerContainer.style.alignItems = "center";
                    playerContainer.style.justifyContent = "center";

                    if (remoteVideoContainer) {
                        // If we're currently showing our local stream, clear it first
                        if (remoteVideoContainer.querySelector("#local-stream")) {
                            remoteVideoContainer.innerHTML = "";
                        }
                        
                        remoteVideoContainer.appendChild(playerContainer);
                        remoteVideoTrack?.play(playerContainer, {
                            fit: "contain",
                        });
                    }
                }

                if (mediaType === "audio") {
                    user.audioTrack?.play();
                }

                remoteUsers = client.remoteUsers;
                if (mediaType === "video") {
                    isStreamActive = true;
                    // Clear any existing timeout since stream is back
                    clearStreamTimeout();
                    if (isLiveSelling) {
                        showToast(`Stream reconnected!`, "success");
                    }
                }
                showToast(`Stream started from mobile app!`, "success");
            });

            client.on("user-unpublished", (user, mediaType) => {
                if (mediaType === "video") {
                    const playerContainer = document.getElementById(
                        user.uid.toString(),
                    );
                    if (playerContainer) {
                        playerContainer.remove();
                    }
                    
                    // Update remote users first
                    remoteUsers = client.remoteUsers;
                    
                    // Check if there are still remote video streams
                    const hasRemoteVideo = remoteUsers.some((u) => u.hasVideo);
                    
                    // If no remote video but we're broadcasting locally, show our stream
                    if (!hasRemoteVideo && isLocalStreaming && localVideoTrack) {
                        displayLocalStreamInRemoteContainer();
                        isStreamActive = true;
                    } else {
                        isStreamActive = hasRemoteVideo;
                        // Start timeout only if live selling is active and no streams are active
                        if (isLiveSelling && !hasRemoteVideo && !isLocalStreaming) {
                            startStreamTimeout();
                        }
                    }
                }
                remoteUsers = client.remoteUsers;
                showToast(`Stream ended`, "info");
            });

            client.on("user-left", (user) => {
                const playerContainer = document.getElementById(
                    user.uid.toString(),
                );
                if (playerContainer) {
                    playerContainer.remove();
                }
                remoteUsers = client.remoteUsers;
            });

            client.on("connection-state-change", (curState, revState) => {
                connectionStatus = curState;
                console.log(
                    `Connection state changed from ${revState} to ${curState}`,
                );
            });

            showToast("Agora client initialized successfully", "success");

            // Initialize Pusher Channels for chat
            initializePusherChannels();

            // Automatically join the channel if token is available
            if (agoraSettings.token) {
                await joinChannel();
            } else {
                showTokenPrompt = true;
                showToast("Please enter your Agora token to start streaming", "info");
            }
        } catch (error) {
            console.error("Failed to initialize Agora client:", error);
            errorMessage = `Failed to initialize video client: ${error.message}`;
            showToast("Failed to initialize video client", "error");
        }
    });

    onDestroy(() => {
        if (!browser) return;
        
        if (joined) {
            leaveChannel();
        }
        if (pusher) {
            pusher.disconnect();
        }
        
        // Clean up timeout
        clearStreamTimeout();
        
        // Clean up local tracks
        if (localVideoTrack) {
            localVideoTrack.close();
        }
        if (localAudioTrack) {
            localAudioTrack.close();
        }
    });

    async function joinChannel() {
        if (!browser || !client) {
            showToast("Client not initialized", "error");
            return;
        }

        try {
            connectionStatus = "Connecting...";

            // Check if we have a valid token
            if (!agoraSettings.token) {
                showTokenPrompt = true;
                showToast("Please enter your Agora token", "error");
                connectionStatus = "Token Required";
                return;
            }

            // Join the channel
            const uid = await client.join(APP_ID, agoraSettings.channel, agoraSettings.token, null);
            console.log("Join channel success, uid:", uid);

            joined = true;
            connectionStatus = "Connected";
            isTokenExpired = false; // Reset token expired flag on successful connection
            showToast("Waiting for stream from mobile app...", "info");
        } catch (error) {
            console.error("Failed to join channel:", error);
            
            // Check if this is a token expiration error
            if (error.code === 'CAN_NOT_GET_GATEWAY_SERVER' || 
                error.message.includes('dynamic key or token timeout')) {
                isTokenExpired = true;
                showTokenPrompt = true;
                errorMessage = "Agora token has expired. Please enter a new token.";
                showToast("Token expired - please enter a new token", "error");
                connectionStatus = "Token Expired";
            } else {
                errorMessage = `Failed to join channel: ${error.message}`;
                showToast("Failed to join channel", "error");
                connectionStatus = "Connection Failed";
            }
        }
    }

    async function leaveChannel() {
        if (!browser || !client) return;
        
        try {
            // Stop local streaming if active
            if (isLocalStreaming || isCameraActive) {
                await stopLocalStreaming();
            }

            await client.leave();
            joined = false;
            connectionStatus = "Disconnected";
            isStreamActive = false;

            // Clear remote video containers
            if (remoteVideoContainer) {
                remoteVideoContainer.innerHTML = "";
            }

            showToast("Disconnected from channel", "info");
        } catch (error) {
            console.error("Failed to leave channel:", error);
            showToast("Failed to leave channel", "error");
        }
    }

    // Initialize Pusher Channels for chat
    function initializePusherChannels() {
        if (!browser || !Pusher) return;
        
        try {
            chatStatus = "Connecting...";

            // Enable pusher logging in development
            Pusher.logToConsole = true;

            pusher = new Pusher(PUSHER_KEY, {
                cluster: PUSHER_CLUSTER,
            });

            // Subscribe to the chat channel
            chatChannel = pusher.subscribe("live-chat");

            // Listen for new messages
            chatChannel.bind("new-message", function (data: any) {
                messages = [
                    ...messages,
                    {
                        id: Date.now(),
                        user: data.user,
                        message: data.message,
                        timestamp: new Date(data.timestamp),
                    },
                ];
                scrollChatToBottom();
            });

            // Listen for connection state changes
            pusher.connection.bind("connected", function () {
                chatConnected = true;
                chatStatus = "Connected";
                showToast("Chat connected successfully!", "success");
            });

            pusher.connection.bind("disconnected", function () {
                chatConnected = false;
                chatStatus = "Disconnected";
                showToast("Chat disconnected", "info");
            });

            pusher.connection.bind("failed", function () {
                chatConnected = false;
                chatStatus = "Failed";
                showToast("Chat connection failed", "error");
            });
        } catch (error) {
            console.error("Failed to initialize chat:", error);
            chatStatus = "Failed";
            showToast("Failed to initialize chat", "error");
        }
    }

    // Send a chat message
    async function sendMessage() {
        if (!newMessage.trim() || !chatConnected) return;

        try {
            // In a real app, you'd send this to your backend API
            // which would then trigger the Pusher event
            // For now, we'll simulate this by calling a local API
            const response = await fetch("/api/chat/send", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    user: userName,
                    message: newMessage.trim(),
                    timestamp: new Date().toISOString(),
                }),
            });

            if (response.ok) {
                newMessage = "";
            } else {
                throw new Error("Failed to send message");
            }
        } catch (error) {
            console.error("Failed to send message:", error);
            showToast("Failed to send message", "error");
        }
    }

    // Handle Enter key in chat input
    function handleChatKeydown(event: KeyboardEvent) {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    }

    // Scroll chat to bottom
    function scrollChatToBottom() {
        setTimeout(() => {
            if (chatContainer) {
                chatContainer.scrollTop = chatContainer.scrollHeight;
            }
        }, 100);
    }

    // Live selling functions
    function toggleStartForm() {
        showStartForm = !showStartForm;
        if (showStartForm) {
            // Pre-fill token from settings if available
            liveSellingForm.agora_token = agoraSettings.token;
        }
    }

    async function startLiveSelling() {
        if (!liveSellingForm.name.trim()) {
            showToast("Stream name is required", "error");
            return;
        }

        if (!liveSellingForm.agora_channel.trim()) {
            showToast("Agora channel is required", "error");
            return;
        }

        if (!liveSellingForm.agora_token.trim()) {
            showToast("Agora token is required", "error");
            return;
        }

        try {
            const response = await fetch("/api/live-selling/start", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(liveSellingForm),
            });

            if (response.ok) {
                const result = await response.json();
                isLiveSelling = true;
                currentLiveStreamId = result.live_stream.id;
                showStartForm = false;
                showToast("Live selling started successfully!", "success");
            } else {
                const error = await response.json();
                showToast(
                    `Failed to start live selling: ${error.error}`,
                    "error",
                );
            }
        } catch (error) {
            console.error("Start live selling error:", error);
            showToast("Failed to start live selling", "error");
        }
    }

    async function stopLiveSelling() {
        if (!currentLiveStreamId) return;

        try {
            const response = await fetch("/api/live-selling/stop", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    live_stream_id: currentLiveStreamId,
                }),
            });

            if (response.ok) {
                const result = await response.json();
                isLiveSelling = false;
                currentLiveStreamId = null;
                clearStreamTimeout(); // Clear any active timeout
                showToast("Live selling stopped successfully!", "success");

                // Reset form
                liveSellingForm = {
                    name: "",
                    description: "",
                    agora_channel: DEFAULT_CHANNEL,
                    agora_token: agoraSettings.token,
                };
            } else {
                const error = await response.json();
                showToast(
                    `Failed to stop live selling: ${error.error}`,
                    "error",
                );
            }
        } catch (error) {
            console.error("Stop live selling error:", error);
            showToast("Failed to stop live selling", "error");
        }
    }

    // Handle token input submission
    async function submitToken() {
        if (!tokenInput.trim()) {
            showToast("Please enter a valid token", "error");
            return;
        }

        try {
            // Save the new token
            const saved = await saveAgoraSettings(tokenInput.trim(), liveSellingForm.agora_channel);
            if (saved) {
                // Update form
                liveSellingForm.agora_token = tokenInput.trim();
                
                // Hide prompt and reset input
                showTokenPrompt = false;
                tokenInput = "";
                isTokenExpired = false;
                
                // Try to connect with new token
                if (joined) {
                    await leaveChannel();
                    await new Promise((resolve) => setTimeout(resolve, 500));
                }
                await joinChannel();
            }
        } catch (error) {
            console.error("Submit token error:", error);
            showToast("Failed to save token", "error");
        }
    }

    // Cancel token prompt
    function cancelTokenPrompt() {
        showTokenPrompt = false;
        tokenInput = "";
    }

    async function updateAgoraSettings() {
        if (
            !liveSellingForm.agora_channel.trim() ||
            !liveSellingForm.agora_token.trim()
        ) {
            showToast("Channel and token are required", "error");
            return;
        }

        try {
            showToast("Updating Agora settings and reconnecting...", "info");

            // Save settings to database
            const saved = await saveAgoraSettings(
                liveSellingForm.agora_token.trim(), 
                liveSellingForm.agora_channel.trim()
            );
            
            if (saved) {
                // First disconnect
                if (joined) {
                    await leaveChannel();
                    await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second
                }

                showToast("Reconnecting with new settings...", "info");

                // Reconnect with new settings
                await joinChannel();

                showToast("Agora settings updated successfully!", "success");
            }
        } catch (error) {
            console.error("Update Agora settings error:", error);
            showToast("Failed to update Agora settings", "error");
        }
    }

    // Local camera streaming functions
    async function startLocalCamera() {
        if (!browser || !client || !AgoraRTC) {
            showToast("Client not initialized", "error");
            return;
        }

        if (!joined) {
            showToast("Please connect to the channel first", "error");
            return;
        }

        try {
            localStreamError = "";
            showToast("Starting camera and microphone...", "info");

            // Create local video and audio tracks
            localVideoTrack = await AgoraRTC.createCameraVideoTrack({
                encoderConfig: {
                    width: 640,
                    height: 480,
                    frameRate: 30,
                    bitrateMax: 1000,
                    bitrateMin: 300
                }
            });

            localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack({
                encoderConfig: {
                    sampleRate: 48000,
                    stereo: false,
                    bitrate: 128
                }
            });

            // Play local video track in preview container
            if (localVideoContainer && localVideoTrack) {
                localVideoTrack.play(localVideoContainer, {
                    fit: "cover"
                });
            }

            isCameraActive = true;
            showToast("Camera activated! Click 'Start Streaming' to broadcast", "success");

        } catch (error) {
            console.error("Failed to start local camera:", error);
            localStreamError = `Failed to start camera: ${error.message}`;
            showToast("Failed to start camera", "error");
            
            // Clean up if partially created
            if (localVideoTrack) {
                localVideoTrack.close();
                localVideoTrack = null;
            }
            if (localAudioTrack) {
                localAudioTrack.close();
                localAudioTrack = null;
            }
        }
    }

    async function startLocalStreaming() {
        if (!browser || !client) {
            showToast("Client not initialized", "error");
            return;
        }

        if (!isCameraActive || !localVideoTrack || !localAudioTrack) {
            showToast("Please activate camera first", "error");
            return;
        }

        try {
            showToast("Starting stream broadcast...", "info");

            // Publish local tracks to the channel
            await client.publish([localVideoTrack, localAudioTrack]);

            // Also display the local stream in the remote video container
            // since the user-published event won't fire for our own stream
            displayLocalStreamInRemoteContainer();

            isLocalStreaming = true;
            isStreamActive = true; // Mark as stream active
            showToast("Broadcasting live! Other viewers can now see your stream", "success");

        } catch (error) {
            console.error("Failed to start local streaming:", error);
            localStreamError = `Failed to start streaming: ${error.message}`;
            showToast("Failed to start streaming", "error");
        }
    }

    // Display local stream in the remote video container
    function displayLocalStreamInRemoteContainer() {
        if (!localVideoTrack || !remoteVideoContainer) return;

        // Clear existing content
        remoteVideoContainer.innerHTML = "";

        // Create container for local stream
        const playerContainer = document.createElement("div");
        playerContainer.id = "local-stream";
        playerContainer.style.width = "100%";
        playerContainer.style.height = "100%";
        playerContainer.style.borderRadius = "8px";
        playerContainer.style.overflow = "hidden";
        playerContainer.style.display = "flex";
        playerContainer.style.alignItems = "center";
        playerContainer.style.justifyContent = "center";

        remoteVideoContainer.appendChild(playerContainer);

        // Play local video track in remote container
        localVideoTrack.play(playerContainer, {
            fit: "contain",
        });
    }

    async function stopLocalStreaming() {
        if (!browser || !client) return;

        try {
            // Unpublish tracks if streaming
            if (isLocalStreaming && localVideoTrack && localAudioTrack) {
                await client.unpublish([localVideoTrack, localAudioTrack]);
                showToast("Stopped broadcasting", "info");
            }

            // Clear remote video container if it was showing our local stream
            if (remoteVideoContainer && remoteVideoContainer.querySelector("#local-stream")) {
                remoteVideoContainer.innerHTML = "";
            }

            // Stop and close tracks
            if (localVideoTrack) {
                localVideoTrack.stop();
                localVideoTrack.close();
                localVideoTrack = null;
            }

            if (localAudioTrack) {
                localAudioTrack.stop();
                localAudioTrack.close();
                localAudioTrack = null;
            }

            // Clear local video container
            if (localVideoContainer) {
                localVideoContainer.innerHTML = "";
            }

            isLocalStreaming = false;
            isCameraActive = false;
            isStreamActive = false; // Reset stream active state
            localStreamError = "";
            
            // If live selling is active and there are no other streams, start timeout
            const hasRemoteVideo = remoteUsers.some((u) => u.hasVideo);
            if (isLiveSelling && !hasRemoteVideo) {
                startStreamTimeout();
                showToast("Test camera stopped - waiting for mobile stream to continue live selling", "info");
            } else {
                showToast("Camera stopped", "info");
            }

        } catch (error) {
            console.error("Failed to stop local streaming:", error);
            showToast("Failed to stop camera", "error");
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
                    <div
                        class="status-indicator {connectionStatus
                            .toLowerCase()
                            .replace(' ', '-')}"
                    ></div>
                    <span class="status-text">Stream: {connectionStatus}</span>
                </div>
                <div class="status-group">
                    <div
                        class="status-indicator {chatStatus
                            .toLowerCase()
                            .replace(' ', '-')}"
                    ></div>
                    <span class="status-text">Chat: {chatStatus}</span>
                </div>
            </div>
        </div>
    </div>

    <div class="page-content">
        {#if errorMessage}
            <div class="error-banner">
                <span class="error-icon">⚠️</span>
                <p>{errorMessage}</p>
                <button class="close-error" onclick={() => (errorMessage = "")}
                    >×</button
                >
            </div>
        {/if}


        <!-- Stream and Chat Layout -->
        <div class="main-layout">
            <!-- Mobile Stream Display -->
            <div class="stream-display">
                <div class="stream-header">
                    <h3>Live Stream from Mobile</h3>
                    <div class="stream-info">
                        <span class="channel-info">Channel: {agoraSettings.channel}</span>
                        {#if isStreamActive}
                            <span class="live-badge">
                                <span class="live-dot"></span>
                                LIVE
                            </span>
                        {:else if joined}
                            <span class="waiting-badge">
                                <span class="waiting-dot"></span>
                                WAITING
                            </span>
                        {/if}
                    </div>
                </div>

                <div class="video-container main-stream">
                    <div
                        class="video-placeholder"
                        bind:this={remoteVideoContainer}
                    >
                        {#if !joined}
                            <div class="placeholder-content">
                                <div class="stream-icon">📱</div>
                                <p>Connecting to channel...</p>
                            </div>
                        {:else if !isStreamActive}
                            <div class="placeholder-content">
                                <div class="stream-icon">📱</div>
                                <p>Waiting for mobile stream...</p>
                                <p class="hint">
                                    Start streaming from your mobile app
                                </p>
                            </div>
                        {/if}
                    </div>
                </div>

                <!-- Stream Timeout Warning -->
                {#if streamTimeoutWarning && isLiveSelling}
                    <div class="timeout-warning">
                        <div class="timeout-icon">⚠️</div>
                        <div class="timeout-content">
                            <p class="timeout-title">Stream Disconnected!</p>
                            <p class="timeout-message">
                                Auto-stopping live selling in <strong>{timeoutCountdown}</strong> seconds
                            </p>
                            <p class="timeout-hint">Reconnect your stream to cancel</p>
                        </div>
                    </div>
                {/if}

                <!-- Live Selling Form (Always visible) -->
                <div class="live-selling-form">
                    <div class="form-section">
                        <h4>Live Sale Details</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="streamName">Stream Name</label>
                                <input
                                    id="streamName"
                                    type="text"
                                    bind:value={liveSellingForm.name}
                                    placeholder="e.g., Fashion Friday Sale"
                                    class="form-input"
                                />
                            </div>
                            <div class="form-group">
                                <label for="streamDescription"
                                    >Description</label
                                >
                                <input
                                    id="streamDescription"
                                    type="text"
                                    bind:value={liveSellingForm.description}
                                    placeholder="Describe what you'll be selling..."
                                    class="form-input"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div class="stream-controls">
                    <div class="control-buttons">
                        <!-- Live Selling Controls (only show when stream is active) -->
                        {#if isStreamActive}
                            {#if !isLiveSelling}
                                <button
                                    class="btn-primary"
                                    onclick={startLiveSelling}
                                >
                                    🛍️ Start Live Selling
                                </button>
                            {:else}
                                <div class="live-selling-active">
                                    <span class="live-badge">
                                        <span class="live-dot"></span>
                                        SELLING LIVE
                                    </span>
                                    <button
                                        class="btn-danger btn-sm"
                                        onclick={stopLiveSelling}
                                    >
                                        Stop Sale
                                    </button>
                                </div>
                            {/if}
                        {/if}
                    </div>
                </div>
            </div>

            <!-- Right Column -->
            <div class="right-column">
                <!-- Test Camera Section -->
                <div class="test-camera-section">
                    <div class="camera-header">
                        <h3>
                            <span class="section-icon">📹</span>
                            Test Camera (for Development)
                        </h3>
                        <div class="camera-status">
                            {#if isCameraActive}
                                <span class="camera-badge active">
                                    <span class="camera-dot"></span>
                                    CAMERA ON
                                </span>
                            {/if}
                            {#if isLocalStreaming}
                                <span class="streaming-badge">
                                    <span class="streaming-dot"></span>
                                    BROADCASTING
                                </span>
                            {/if}
                        </div>
                    </div>

                    <div class="camera-content">
                        <div class="local-video-container">
                            <div
                                class="local-video-preview"
                                bind:this={localVideoContainer}
                            >
                                {#if !isCameraActive}
                                    <div class="camera-placeholder">
                                        <div class="camera-icon">📹</div>
                                        <p>Click "Start Camera" to activate</p>
                                        <p class="hint">This will use your computer's camera for testing</p>
                                    </div>
                                {/if}
                            </div>
                        </div>

                        <div class="camera-controls">
                            {#if localStreamError}
                                <div class="camera-error">
                                    <span class="error-icon">⚠️</span>
                                    <span>{localStreamError}</span>
                                </div>
                            {/if}

                            <div class="camera-buttons">
                                {#if !isCameraActive}
                                    <button
                                        class="btn-primary"
                                        onclick={startLocalCamera}
                                        disabled={!joined}
                                    >
                                        📹 Start Camera
                                    </button>
                                {:else if !isLocalStreaming}
                                    <button
                                        class="btn-success"
                                        onclick={startLocalStreaming}
                                    >
                                        📡 Start Broadcasting
                                    </button>
                                    <button
                                        class="btn-secondary"
                                        onclick={stopLocalStreaming}
                                    >
                                        Stop Camera
                                    </button>
                                {:else}
                                    <span class="streaming-info">
                                        🔴 Broadcasting to channel: {agoraSettings.channel}
                                    </span>
                                    <button
                                        class="btn-danger"
                                        onclick={stopLocalStreaming}
                                    >
                                        Stop Broadcasting
                                    </button>
                                {/if}
                            </div>

                            {#if !joined}
                                <p class="camera-note">
                                    💡 Connect to the Agora channel first to use the test camera
                                </p>
                            {/if}
                        </div>
                    </div>
                </div>

                <!-- Live Chat -->
            <div class="chat-display">
                <div class="chat-header">
                    <h3>Live Chat</h3>
                    <div class="chat-info">
                        <span class="user-info">Logged in as: {userName}</span>
                        {#if chatConnected}
                            <span class="online-badge">
                                <span class="online-dot"></span>
                                ONLINE
                            </span>
                        {/if}
                    </div>
                </div>

                <div class="chat-messages" bind:this={chatContainer}>
                    {#if messages.length === 0}
                        <div class="no-messages">
                            <div class="chat-icon">💬</div>
                            <p>No messages yet</p>
                            <p class="hint">Be the first to say hello!</p>
                        </div>
                    {:else}
                        {#each messages as message (message.id)}
                            <div class="message">
                                <div class="message-header">
                                    <span class="message-user"
                                        >{message.user}</span
                                    >
                                    <span class="message-time">
                                        {message.timestamp.toLocaleTimeString(
                                            [],
                                            {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            },
                                        )}
                                    </span>
                                </div>
                                <div class="message-content">
                                    {message.message}
                                </div>
                            </div>
                        {/each}
                    {/if}
                </div>

                <div class="chat-input-section">
                    <div class="chat-user-settings">
                        <input
                            type="text"
                            bind:value={userName}
                            placeholder="Your name"
                            class="user-input"
                            maxlength="20"
                        />
                    </div>
                    <div class="chat-input-container">
                        <input
                            type="text"
                            bind:value={newMessage}
                            placeholder="Type a message..."
                            class="chat-input"
                            disabled={!chatConnected}
                            onkeydown={handleChatKeydown}
                            maxlength="500"
                        />
                        <button
                            class="send-button"
                            onclick={sendMessage}
                            disabled={!chatConnected || !newMessage.trim()}
                        >
                            Send
                        </button>
                    </div>
                </div>
            </div>
        </div>
        </div>

        <!-- Stream Configuration -->
        <div class="config-section">
            <h3>Stream Configuration</h3>
            
            <!-- Agora Settings -->
            <div class="agora-settings-section">
                <h4>Agora Settings</h4>
                <div class="config-grid">
                    <div class="config-item">
                        <label>App ID</label>
                        <input type="text" value={APP_ID} readonly />
                    </div>
                    <div class="config-item">
                        <label for="agoraChannelConfig">Channel</label>
                        <input
                            id="agoraChannelConfig"
                            type="text"
                            bind:value={liveSellingForm.agora_channel}
                            placeholder="test-channel"
                            class="form-input"
                        />
                    </div>
                    <div class="config-item">
                        <label for="agoraTokenConfig">Token</label>
                        <input
                            id="agoraTokenConfig"
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
                
                <div class="agora-actions">
                    <button
                        class="btn-secondary"
                        onclick={updateAgoraSettings}
                    >
                        Update Settings
                    </button>
                    <button
                        class="btn-primary"
                        onclick={() => { showTokenPrompt = true; tokenInput = liveSellingForm.agora_token; }}
                    >
                        🔑 Update Token
                    </button>
                </div>
            </div>
        </div>

        <!-- Pusher Channels Configuration -->
        <div class="config-section">
            <h3>Chat Configuration</h3>
            <div class="push-config">
                <div class="config-grid">
                    <div class="config-item">
                        <label>Pusher Key</label>
                        <input type="text" value={PUSHER_KEY} readonly />
                    </div>
                    <div class="config-item">
                        <label>Cluster</label>
                        <input type="text" value={PUSHER_CLUSTER} readonly />
                    </div>
                    <div class="config-item">
                        <label>Chat Status</label>
                        <input type="text" value={chatStatus} readonly />
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Token Prompt Modal -->
{#if showTokenPrompt}
    <div class="token-modal-overlay">
        <div class="token-modal">
            <div class="token-modal-header">
                <h3>
                    {isTokenExpired ? "🔑 Token Expired" : "🔑 Enter Agora Token"}
                </h3>
                <button class="close-btn" onclick={cancelTokenPrompt}>×</button>
            </div>
            
            <div class="token-modal-content">
                <p class="token-message">
                    {#if isTokenExpired}
                        Your Agora token has expired and needs to be updated to continue streaming.
                    {:else}
                        Please enter your Agora token to start streaming.
                    {/if}
                </p>
                
                <div class="token-input-group">
                    <label for="tokenInput">Agora Token</label>
                    <textarea
                        id="tokenInput"
                        bind:value={tokenInput}
                        placeholder="Paste your Agora token here..."
                        class="token-textarea"
                        rows="4"
                    ></textarea>
                    <p class="token-help">
                        Get your token from the Agora Console or generate one using your App ID and Channel.
                    </p>
                </div>
                
                <div class="token-actions">
                    <button class="btn-secondary" onclick={cancelTokenPrompt}>
                        Cancel
                    </button>
                    <button 
                        class="btn-primary" 
                        onclick={submitToken}
                        disabled={!tokenInput.trim()}
                    >
                        Save & Connect
                    </button>
                </div>
            </div>
        </div>
    </div>
{/if}

<!-- Toast Notifications -->
{#if toasts.length > 0}
    <div class="toast-container">
        {#each toasts as toast (toast.id)}
            <div class="toast toast-{toast.type}">
                <div class="toast-content">
                    {#if toast.type === "success"}
                        <span class="toast-icon">✓</span>
                    {:else if toast.type === "error"}
                        <span class="toast-icon">⚠</span>
                    {:else}
                        <span class="toast-icon">ℹ</span>
                    {/if}
                    <span class="toast-message">{toast.message}</span>
                </div>
                <button
                    class="toast-close"
                    onclick={() => removeToast(toast.id)}>×</button
                >
            </div>
        {/each}
    </div>
{/if}

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

    .status-indicator.connection-failed {
        background: #d72c0d;
    }

    .status-text {
        font-size: 0.875rem;
        color: #6d7175;
        font-weight: 500;
    }

    @keyframes pulse {
        0%,
        100% {
            opacity: 1;
        }
        50% {
            opacity: 0.6;
        }
    }

    @keyframes blink {
        0%,
        100% {
            opacity: 1;
        }
        50% {
            opacity: 0.3;
        }
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

    /* Stream Timeout Warning */
    .timeout-warning {
        background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
        border: 2px solid #ef4444;
        border-radius: 12px;
        padding: 1.5rem;
        margin: 1rem 0;
        display: flex;
        align-items: center;
        gap: 1rem;
        animation: warningPulse 2s infinite;
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
    }

    .timeout-icon {
        font-size: 2rem;
        animation: warningShake 0.5s infinite;
    }

    .timeout-content {
        flex: 1;
    }

    .timeout-title {
        margin: 0 0 0.5rem 0;
        font-size: 1.125rem;
        font-weight: 600;
        color: #dc2626;
    }

    .timeout-message {
        margin: 0 0 0.25rem 0;
        font-size: 1rem;
        color: #991b1b;
    }

    .timeout-message strong {
        font-size: 1.25rem;
        font-weight: 700;
        color: #dc2626;
    }

    .timeout-hint {
        margin: 0;
        font-size: 0.875rem;
        color: #7f1d1d;
        font-style: italic;
    }

    @keyframes warningPulse {
        0%, 100% {
            border-color: #ef4444;
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
        }
        50% {
            border-color: #dc2626;
            box-shadow: 0 4px 20px rgba(239, 68, 68, 0.4);
        }
    }

    @keyframes warningShake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-2px); }
        75% { transform: translateX(2px); }
    }

    .stream-display {
        background: white;
        border: 1px solid #e1e1e1;
        border-radius: 12px;
        padding: 1.5rem;
        margin-bottom: 2rem;
    }

    .stream-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid #f0f0f0;
    }

    .stream-header h3 {
        margin: 0;
        font-size: 1.125rem;
        font-weight: 600;
        color: #202223;
    }

    .stream-info {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .channel-info {
        font-size: 0.875rem;
        color: #6d7175;
        font-family: monospace;
    }

    .live-badge {
        background: #ef4444;
        color: white;
        padding: 0.25rem 0.75rem;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 0.25rem;
        animation: pulse 2s infinite;
    }

    .waiting-badge {
        background: #ffa500;
        color: white;
        padding: 0.25rem 0.75rem;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 0.25rem;
        animation: pulse 2s infinite;
    }

    .live-dot,
    .waiting-dot {
        width: 6px;
        height: 6px;
        background: white;
        border-radius: 50%;
        animation: blink 1s infinite;
    }

    .viewer-count {
        font-size: 0.875rem;
        color: #6d7175;
        font-weight: 500;
    }

    .video-container {
        width: 100%;
        max-width: 400px;
        height: 600px;
        background: #000;
        border-radius: 8px;
        overflow: hidden;
        margin-bottom: 1rem;
        position: relative;
        margin-left: auto;
        margin-right: auto;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .video-placeholder {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    /* Ensure video content fits properly */
    .video-container video {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
    }

    .video-container div[id] {
        width: 100% !important;
        height: 100% !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
    }

    .video-container div[id] video {
        max-width: 100% !important;
        max-height: 100% !important;
        object-fit: contain !important;
        width: auto !important;
        height: auto !important;
    }

    .placeholder-content {
        text-align: center;
        color: #6d7175;
    }

    .camera-icon,
    .stream-icon {
        font-size: 3rem;
        margin-bottom: 0.5rem;
        opacity: 0.6;
    }

    .placeholder-content p {
        margin: 0.25rem 0;
        font-size: 0.875rem;
    }

    .stream-controls {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px solid #f0f0f0;
    }

    .connection-info {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
    }

    .info-label {
        color: #6d7175;
        font-weight: 500;
    }

    .status-value {
        color: #202223;
        font-weight: 600;
    }

    .divider {
        color: #c9cccf;
        margin: 0 0.25rem;
    }

    .hint {
        font-size: 0.75rem;
        opacity: 0.8;
    }

    .btn-primary,
    .btn-secondary,
    .btn-success,
    .btn-danger {
        padding: 0.75rem 1.5rem;
        border: none;
        border-radius: 8px;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s ease;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
    }

    .btn-primary {
        background: #005bd3;
        color: white;
    }

    .btn-primary:hover {
        background: #004bb5;
    }

    .btn-success {
        background: #00a96e;
        color: white;
    }

    .btn-success:hover {
        background: #008c5c;
    }

    .btn-danger {
        background: #d72c0d;
        color: white;
    }

    .btn-danger:hover {
        background: #b8240b;
    }

    .btn-secondary {
        background: white;
        color: #6d7175;
        border: 1px solid #c9cccf;
    }

    .btn-secondary:hover {
        background: #f6f6f7;
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

    .push-config {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }

    .push-controls {
        padding-top: 1rem;
        border-top: 1px solid #f0f0f0;
    }

    .interest-controls h4 {
        margin: 0 0 1rem 0;
        font-size: 1rem;
        font-weight: 600;
        color: #202223;
    }

    .interest-buttons {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
    }

    .btn-sm {
        padding: 0.5rem 1rem;
        font-size: 0.875rem;
    }

    /* Toast Notifications */
    .toast-container {
        position: fixed;
        top: 5rem;
        right: 2rem;
        z-index: 1000;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        pointer-events: none;
    }

    .toast {
        background: white;
        border-radius: 8px;
        box-shadow:
            0 10px 25px rgba(0, 0, 0, 0.1),
            0 4px 6px rgba(0, 0, 0, 0.05);
        border: 1px solid #e1e3e5;
        padding: 1rem 1.25rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-width: 320px;
        max-width: 480px;
        pointer-events: auto;
        animation: slideIn 0.3s ease-out;
    }

    .toast-success {
        border-left: 4px solid #00a96e;
    }

    .toast-error {
        border-left: 4px solid #d72c0d;
    }

    .toast-info {
        border-left: 4px solid #005bd3;
    }

    .toast-content {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex: 1;
    }

    .toast-icon {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.875rem;
        font-weight: 600;
    }

    .toast-success .toast-icon {
        background: #00a96e;
        color: white;
    }

    .toast-error .toast-icon {
        background: #d72c0d;
        color: white;
    }

    .toast-info .toast-icon {
        background: #005bd3;
        color: white;
    }

    .toast-message {
        font-size: 0.875rem;
        color: #202223;
        font-weight: 500;
    }

    .toast-close {
        background: none;
        border: none;
        color: #6d7175;
        cursor: pointer;
        font-size: 1.25rem;
        padding: 0;
        margin-left: 1rem;
        transition: color 0.15s ease;
    }

    .toast-close:hover {
        color: #202223;
    }

    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @media (max-width: 1024px) {
        .config-grid {
            grid-template-columns: 1fr;
        }
    }

    /* Main Layout - Side by Side */
    .main-layout {
        display: grid;
        grid-template-columns: 1fr 400px;
        gap: 2rem;
        margin-bottom: 2rem;
    }

    /* Right Column */
    .right-column {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }

    /* Test Camera Section - Updated for right column */
    .test-camera-section {
        background: white;
        border: 1px solid #e1e1e1;
        border-radius: 12px;
        padding: 1.5rem;
        border-left: 4px solid #ffa500;
    }

    /* Chat Display */
    .chat-display {
        background: white;
        border: 1px solid #e1e1e1;
        border-radius: 12px;
        padding: 0;
        display: flex;
        flex-direction: column;
        height: 400px;
        flex: 1;
    }

    .chat-header {
        padding: 1rem 1.5rem;
        border-bottom: 1px solid #f0f0f0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-shrink: 0;
    }

    .chat-header h3 {
        margin: 0;
        font-size: 1.125rem;
        font-weight: 600;
        color: #202223;
    }

    .chat-info {
        display: flex;
        align-items: center;
        gap: 1rem;
        font-size: 0.875rem;
    }

    .user-info {
        color: #6d7175;
    }

    .online-badge {
        background: #00a96e;
        color: white;
        padding: 0.25rem 0.75rem;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 0.25rem;
    }

    .online-dot {
        width: 6px;
        height: 6px;
        background: white;
        border-radius: 50%;
        animation: pulse 2s infinite;
    }

    .chat-messages {
        flex: 1;
        padding: 1rem 1.5rem;
        overflow-y: auto;
        background: #fafbfb;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .no-messages {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        text-align: center;
        color: #6d7175;
    }

    .chat-icon {
        font-size: 2rem;
        margin-bottom: 0.5rem;
        opacity: 0.6;
    }

    .no-messages p {
        margin: 0.25rem 0;
        font-size: 0.875rem;
    }

    .message {
        background: white;
        border: 1px solid #e1e1e1;
        border-radius: 8px;
        padding: 0.75rem 1rem;
        max-width: 85%;
        align-self: flex-start;
    }

    .message-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.25rem;
    }

    .message-user {
        font-weight: 600;
        font-size: 0.875rem;
        color: #202223;
    }

    .message-time {
        font-size: 0.75rem;
        color: #6d7175;
    }

    .message-content {
        font-size: 0.875rem;
        color: #202223;
        line-height: 1.4;
        word-wrap: break-word;
    }

    .chat-input-section {
        padding: 1rem 1.5rem;
        border-top: 1px solid #f0f0f0;
        background: white;
        flex-shrink: 0;
    }

    .chat-user-settings {
        margin-bottom: 0.75rem;
    }

    .user-input {
        width: 100%;
        padding: 0.5rem 0.75rem;
        border: 1px solid #c9cccf;
        border-radius: 6px;
        font-size: 0.875rem;
        background: #f9fafb;
    }

    .user-input:focus {
        outline: none;
        border-color: #005bd3;
        box-shadow: 0 0 0 2px rgba(0, 91, 211, 0.1);
        background: white;
    }

    .chat-input-container {
        display: flex;
        gap: 0.75rem;
        align-items: center;
    }

    .chat-input {
        flex: 1;
        padding: 0.75rem;
        border: 1px solid #c9cccf;
        border-radius: 8px;
        font-size: 0.875rem;
        background: white;
        resize: none;
    }

    .chat-input:focus {
        outline: none;
        border-color: #005bd3;
        box-shadow: 0 0 0 2px rgba(0, 91, 211, 0.1);
    }

    .chat-input:disabled {
        background: #f6f6f7;
        color: #6d7175;
        cursor: not-allowed;
    }

    .send-button {
        background: #005bd3;
        color: white;
        border: none;
        border-radius: 8px;
        padding: 0.75rem 1.25rem;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s ease;
        white-space: nowrap;
    }

    .send-button:hover:not(:disabled) {
        background: #004bb5;
    }

    .send-button:disabled {
        background: #c9cccf;
        cursor: not-allowed;
    }

    @media (max-width: 1200px) {
        .main-layout {
            grid-template-columns: 1fr;
            gap: 1rem;
        }

        .chat-display {
            height: 400px;
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

        .stream-controls {
            flex-direction: column;
            gap: 1rem;
            align-items: stretch;
        }

        .stream-controls button {
            width: 100%;
        }

        .main-layout {
            gap: 1rem;
        }

        .chat-display {
            height: 350px;
        }

        .chat-input-container {
            flex-direction: column;
            gap: 0.5rem;
            align-items: stretch;
        }

        .send-button {
            width: 100%;
        }

        .form-row {
            grid-template-columns: 1fr;
            gap: 0.75rem;
        }

        .live-selling-form {
            padding: 1rem;
        }

        .control-buttons {
            flex-direction: column;
            width: 100%;
        }

        .control-buttons button {
            width: 100%;
        }

        .live-selling-active {
            flex-direction: column;
            width: 100%;
            gap: 0.5rem;
        }
    }

    /* Live Selling Styles */
    .live-selling-form {
        background: #f9fafb;
        border: 1px solid #e1e1e1;
        border-radius: 8px;
        padding: 1.5rem;
        margin: 1rem 0;
    }

    .form-section {
        margin-bottom: 1.5rem;
    }

    .form-section:last-child {
        margin-bottom: 0;
    }

    .form-section h4 {
        margin: 0 0 1rem 0;
        font-size: 1rem;
        font-weight: 600;
        color: #202223;
    }

    .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
    }

    .form-group {
        display: flex;
        flex-direction: column;
    }

    .form-group label {
        font-size: 0.875rem;
        font-weight: 500;
        color: #202223;
        margin-bottom: 0.5rem;
    }

    .form-input {
        padding: 0.75rem;
        border: 1px solid #c9cccf;
        border-radius: 6px;
        font-size: 0.875rem;
        background: white;
        transition:
            border-color 0.15s ease,
            box-shadow 0.15s ease;
    }

    .form-input:focus {
        outline: none;
        border-color: #005bd3;
        box-shadow: 0 0 0 2px rgba(0, 91, 211, 0.1);
    }

    .token-input {
        font-family: monospace;
        font-size: 0.75rem;
    }

    .form-actions-inline {
        margin-top: 1rem;
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
        flex-wrap: wrap;
    }

    .control-buttons {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }

    .live-selling-active {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }

    .live-selling-section {
        background: white;
        border: 1px solid #e1e1e1;
        border-radius: 12px;
        padding: 2rem;
        margin-bottom: 2rem;
    }

    .live-selling-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
    }

    .live-selling-header h2 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 600;
        color: #202223;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .section-icon {
        font-size: 1.125rem;
    }

    .live-selling-status {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .start-form {
        background: #f9fafb;
        border: 1px solid #e1e1e1;
        border-radius: 8px;
        padding: 2rem;
        margin-top: 1rem;
    }

    .form-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 1.5rem;
        margin-bottom: 2rem;
    }

    .form-group {
        display: flex;
        flex-direction: column;
    }

    .form-group label {
        font-weight: 500;
        color: #202223;
        margin-bottom: 0.5rem;
        font-size: 0.875rem;
    }

    .form-input,
    .form-textarea {
        padding: 0.75rem;
        border: 1px solid #c9cccf;
        border-radius: 8px;
        font-size: 0.875rem;
        transition: border-color 0.15s ease;
        background: white;
        font-family: inherit;
    }

    .form-input:focus,
    .form-textarea:focus {
        outline: none;
        border-color: #005bd3;
        box-shadow: 0 0 0 3px rgba(0, 91, 211, 0.1);
    }

    .form-textarea {
        resize: vertical;
        min-height: 80px;
        font-family: monospace;
    }

    .form-help {
        font-size: 0.75rem;
        color: #6d7175;
        margin-top: 0.25rem;
    }

    .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 1rem;
        padding-top: 1rem;
        border-top: 1px solid #e1e1e1;
    }

    @media (max-width: 768px) {
        .live-selling-header {
            flex-direction: column;
            gap: 1rem;
            align-items: flex-start;
        }

        .live-selling-status {
            flex-direction: column;
            gap: 0.75rem;
            align-items: flex-start;
        }

        .form-grid {
            grid-template-columns: 1fr;
        }

        .form-actions {
            flex-direction: column;
        }

        .form-actions button {
            width: 100%;
        }
    }

    /* Token Modal Styles */
    .token-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(4px);
        z-index: 2000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
    }

    .token-modal {
        background: white;
        border-radius: 12px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
        width: 100%;
        max-width: 500px;
        max-height: 90vh;
        overflow: hidden;
        animation: tokenModalSlideIn 0.3s ease-out;
    }

    .token-modal-header {
        padding: 1.5rem 2rem;
        border-bottom: 1px solid #e1e1e1;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #f9fafb;
    }

    .token-modal-header h3 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 600;
        color: #202223;
    }

    .close-btn {
        background: none;
        border: none;
        font-size: 1.5rem;
        color: #6d7175;
        cursor: pointer;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        transition: all 0.15s ease;
    }

    .close-btn:hover {
        background: #e1e1e1;
        color: #202223;
    }

    .token-modal-content {
        padding: 2rem;
    }

    .token-message {
        margin: 0 0 1.5rem 0;
        color: #6d7175;
        line-height: 1.5;
    }

    .token-input-group {
        margin-bottom: 2rem;
    }

    .token-input-group label {
        display: block;
        font-size: 0.875rem;
        font-weight: 500;
        color: #202223;
        margin-bottom: 0.5rem;
    }

    .token-textarea {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid #c9cccf;
        border-radius: 8px;
        font-size: 0.875rem;
        font-family: monospace;
        background: #f9fafb;
        transition: all 0.15s ease;
        resize: vertical;
        min-height: 100px;
    }

    .token-textarea:focus {
        outline: none;
        border-color: #005bd3;
        box-shadow: 0 0 0 3px rgba(0, 91, 211, 0.1);
        background: white;
    }

    .token-help {
        margin: 0.5rem 0 0 0;
        font-size: 0.75rem;
        color: #6d7175;
        line-height: 1.4;
    }

    .token-actions {
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
    }

    .token-actions button {
        min-width: 120px;
    }

    .token-expired {
        color: #d72c0d !important;
        background: #fef2f2 !important;
        border-color: #fecaca !important;
    }

    @keyframes tokenModalSlideIn {
        from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
        }
        to {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
    }

    @media (max-width: 640px) {
        .token-modal {
            margin: 1rem;
            max-width: none;
        }

        .token-modal-header {
            padding: 1rem 1.5rem;
        }

        .token-modal-content {
            padding: 1.5rem;
        }

        .token-actions {
            flex-direction: column;
        }

        .token-actions button {
            width: 100%;
            min-width: auto;
        }
    }

    /* Test Camera Styles */

    .camera-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid #f0f0f0;
    }

    .camera-header h3 {
        margin: 0;
        font-size: 1.125rem;
        font-weight: 600;
        color: #202223;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .camera-status {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .camera-badge {
        background: #00a96e;
        color: white;
        padding: 0.25rem 0.75rem;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 0.25rem;
    }

    .streaming-badge {
        background: #ef4444;
        color: white;
        padding: 0.25rem 0.75rem;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 0.25rem;
        animation: pulse 2s infinite;
    }

    .camera-dot,
    .streaming-dot {
        width: 6px;
        height: 6px;
        background: white;
        border-radius: 50%;
        animation: blink 1s infinite;
    }

    .camera-content {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .local-video-container {
        position: relative;
    }

    .local-video-preview {
        width: 100%;
        height: 200px;
        background: #000;
        border-radius: 8px;
        overflow: hidden;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .camera-placeholder {
        text-align: center;
        color: #6d7175;
    }

    .camera-icon {
        font-size: 3rem;
        margin-bottom: 0.5rem;
        opacity: 0.6;
    }

    .camera-placeholder p {
        margin: 0.25rem 0;
        font-size: 0.875rem;
    }

    .camera-controls {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }

    .camera-error {
        background: #fef2f2;
        border: 1px solid #fecaca;
        color: #991b1b;
        padding: 0.75rem 1rem;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
    }

    .camera-buttons {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        align-items: center;
    }

    .streaming-info {
        font-size: 0.875rem;
        color: #202223;
        font-weight: 500;
        background: #fef2f2;
        padding: 0.75rem 1rem;
        border-radius: 8px;
        border: 1px solid #fecaca;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .camera-note {
        font-size: 0.875rem;
        color: #6d7175;
        margin: 0;
        padding: 0.75rem;
        background: #f9fafb;
        border-radius: 6px;
        border-left: 3px solid #ffa500;
    }

    /* Ensure video content fits properly in local preview */
    .local-video-preview video {
        width: 100% !important;
        height: 100% !important;
        object-fit: cover !important;
    }

    .local-video-preview div[id] {
        width: 100% !important;
        height: 100% !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
    }

    .local-video-preview div[id] video {
        width: 100% !important;
        height: 100% !important;
        object-fit: cover !important;
    }

    @media (max-width: 1024px) {
        .local-video-preview {
            width: 100%;
            max-width: 400px;
            margin: 0 auto;
        }
    }

    @media (max-width: 640px) {
        .camera-content {
            gap: 1rem;
        }

        .local-video-preview {
            height: 200px;
        }

        .camera-buttons {
            flex-direction: column;
            align-items: stretch;
        }

        .camera-buttons button {
            width: 100%;
        }

        .streaming-info {
            text-align: center;
        }
    }
</style>
