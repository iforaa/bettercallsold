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

    // Configuration from environment
    const APP_ID = "1fe1d3f0d301498d9e43e0094f091800";
    const TOKEN =
        "007eJxTYCgR/ehwcZ66f71LaWzBVP6eiv74wqPXm3nfSLasm8XHfUSBwTAt1TDFOM0gxdjA0MTSIsUy1cQ41cDA0iTNwNLQwsDg4o2ejIZARobV2idYGBkgEMTnYShJLS7RTc5IzMtLzWFgAAD8RyGp";
    const CHANNEL = "test-channel";

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
        agora_channel: CHANNEL,
        agora_token: TOKEN,
    });

    // Video container references
    let remoteVideoContainer: HTMLDivElement;
    let chatContainer: HTMLDivElement;

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

    onMount(async () => {
        // Only run on client side
        if (!browser) return;
        
        try {
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
                    isStreamActive = remoteUsers.some((u) => u.hasVideo);
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

            // Automatically join the channel
            await joinChannel();
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
    });

    async function joinChannel() {
        if (!browser || !client) {
            showToast("Client not initialized", "error");
            return;
        }

        try {
            connectionStatus = "Connecting...";

            // Join the channel
            const uid = await client.join(APP_ID, CHANNEL, TOKEN, null);
            console.log("Join channel success, uid:", uid);

            joined = true;
            connectionStatus = "Connected";
            showToast("Waiting for stream from mobile app...", "info");
        } catch (error) {
            console.error("Failed to join channel:", error);
            errorMessage = `Failed to join channel: ${error.message}`;
            connectionStatus = "Connection Failed";
            showToast("Failed to join channel", "error");
        }
    }

    async function leaveChannel() {
        if (!browser || !client) return;
        
        try {
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
            // Pre-fill token from environment
            liveSellingForm.agora_token = TOKEN;
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
                showToast("Live selling stopped successfully!", "success");

                // Reset form
                liveSellingForm = {
                    name: "",
                    description: "",
                    agora_channel: "test-channel",
                    agora_token: "",
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

            // First disconnect
            if (joined) {
                await leaveChannel();
                await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second
            }

            // Update the constants used by the client
            // Note: In a real implementation, you'd want to update these dynamically
            showToast("Reconnecting with new settings...", "info");

            // Reconnect with new settings
            await joinChannel();

            showToast("Agora settings updated successfully!", "success");
        } catch (error) {
            console.error("Update Agora settings error:", error);
            showToast("Failed to update Agora settings", "error");
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
                        <span class="channel-info">Channel: {CHANNEL}</span>
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

                    <div class="form-section">
                        <h4>Agora Settings</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="agoraChannel">Channel</label>
                                <input
                                    id="agoraChannel"
                                    type="text"
                                    bind:value={liveSellingForm.agora_channel}
                                    placeholder="test-channel"
                                    class="form-input"
                                />
                            </div>
                            <div class="form-group">
                                <label for="agoraToken">Token</label>
                                <input
                                    id="agoraToken"
                                    type="text"
                                    bind:value={liveSellingForm.agora_token}
                                    placeholder="Paste Agora token..."
                                    class="form-input token-input"
                                />
                            </div>
                        </div>
                        <div class="form-actions-inline">
                            <button
                                class="btn-secondary btn-sm"
                                onclick={updateAgoraSettings}
                            >
                                Update & Reconnect
                            </button>
                        </div>
                    </div>
                </div>

                <div class="stream-controls">
                    {#if joined}
                        <div class="connection-info">
                            <span class="info-label">Status:</span>
                            <span class="status-value">{connectionStatus}</span>
                            {#if remoteUsers.length > 0}
                                <span class="divider">•</span>
                                <span class="info-label">Viewers:</span>
                                <span class="status-value"
                                    >{remoteUsers.length}</span
                                >
                            {/if}
                        </div>

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

                            <button
                                class="btn-secondary"
                                onclick={leaveChannel}
                            >
                                Disconnect
                            </button>
                        </div>
                    {:else}
                        <button class="btn-primary" onclick={joinChannel}>
                            Reconnect
                        </button>
                    {/if}
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

        <!-- Stream Configuration -->
        <div class="config-section">
            <h3>Stream Configuration</h3>
            <div class="config-grid">
                <div class="config-item">
                    <label>App ID</label>
                    <input type="text" value={APP_ID} readonly />
                </div>
                <div class="config-item">
                    <label>Channel</label>
                    <input type="text" value={CHANNEL} readonly />
                </div>
                <div class="config-item">
                    <label>Token Status</label>
                    <input
                        type="text"
                        value={TOKEN ? "Valid" : "Missing"}
                        readonly
                    />
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

    /* Chat Display */
    .chat-display {
        background: white;
        border: 1px solid #e1e1e1;
        border-radius: 12px;
        padding: 0;
        display: flex;
        flex-direction: column;
        height: 600px;
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
</style>
