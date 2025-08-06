<script>
    import { onMount, onDestroy } from 'svelte';

    let { 
        channel = "test-channel",
        isStreamActive = false,
        joined = false,
        onStartLiveSelling = null,
        onStopLiveSelling = null,
        isLiveSelling = false,
        liveSellingForm = {}
    } = $props();
    
    let remoteVideoContainer;

    // Clean up function for video containers
    function clearVideoContainer() {
        if (remoteVideoContainer) {
            remoteVideoContainer.innerHTML = "";
        }
    }

    // Function to handle remote video display
    function displayRemoteVideo(user, videoTrack) {
        if (!remoteVideoContainer) return;
        
        const playerContainer = document.createElement("div");
        playerContainer.id = user.uid.toString();
        playerContainer.style.width = "100%";
        playerContainer.style.height = "100%";
        playerContainer.style.borderRadius = "8px";
        playerContainer.style.overflow = "hidden";
        playerContainer.style.display = "flex";
        playerContainer.style.alignItems = "center";
        playerContainer.style.justifyContent = "center";

        // Clear existing content first
        clearVideoContainer();
        remoteVideoContainer.appendChild(playerContainer);
        
        videoTrack?.play(playerContainer, {
            fit: "contain",
        });
    }

    // Function to display local stream in remote container
    function displayLocalVideo(videoTrack) {
        console.log("StreamDisplay.displayLocalVideo called:", {
            videoTrack: !!videoTrack,
            videoTrackType: typeof videoTrack,
            videoTrackConstructor: videoTrack?.constructor?.name,
            remoteVideoContainer: !!remoteVideoContainer,
            containerInnerHTML: remoteVideoContainer?.innerHTML
        });
        
        if (!videoTrack || !remoteVideoContainer) {
            console.error("Missing videoTrack or remoteVideoContainer");
            return;
        }

        clearVideoContainer();
        console.log("Container cleared");

        const playerContainer = document.createElement("div");
        playerContainer.id = "local-stream";
        playerContainer.style.width = "100%";
        playerContainer.style.height = "100%";
        playerContainer.style.borderRadius = "8px";
        playerContainer.style.overflow = "hidden";
        playerContainer.style.display = "flex";
        playerContainer.style.alignItems = "center";
        playerContainer.style.justifyContent = "center";
        playerContainer.style.background = "red"; // Temporary - to see if container is visible

        remoteVideoContainer.appendChild(playerContainer);
        console.log("Container created and appended:", {
            containerId: playerContainer.id,
            containerStyles: playerContainer.style.cssText,
            parentInnerHTML: remoteVideoContainer.innerHTML
        });

        try {
            console.log("About to call videoTrack.play with:", {
                videoTrackMethods: Object.getOwnPropertyNames(Object.getPrototypeOf(videoTrack)),
                playerContainer: playerContainer
            });
            
            const result = videoTrack.play(playerContainer, {
                fit: "contain",
            });
            
            console.log("videoTrack.play result:", result);
            console.log("Container after play:", {
                innerHTML: playerContainer.innerHTML,
                childNodes: playerContainer.childNodes.length,
                hasVideoElement: !!playerContainer.querySelector('video')
            });
            
        } catch (error) {
            console.error("videoTrack.play failed:", error);
        }
    }

    // Function to remove video container
    function removeVideoContainer(uid) {
        const playerContainer = document.getElementById(uid.toString());
        if (playerContainer) {
            playerContainer.remove();
        }
    }

    // Export functions for parent component
    function getVideoHandlers() {
        return {
            displayRemoteVideo,
            displayLocalVideo,
            removeVideoContainer,
            clearVideoContainer
        };
    }

    onMount(() => {
        // Expose handlers to parent via custom event
        const event = new CustomEvent('video-handlers-ready', { 
            detail: getVideoHandlers() 
        });
        document.dispatchEvent(event);
    });

    onDestroy(() => {
        clearVideoContainer();
    });
</script>

<div class="stream-display">
    <div class="stream-header">
        <h3>Live Stream from Mobile</h3>
        <div class="stream-info">
            <span class="channel-info">Channel: {channel}</span>
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
        <div class="video-placeholder" bind:this={remoteVideoContainer}>
            {#if !joined}
                <div class="placeholder-content">
                    <div class="stream-icon">📱</div>
                    <p>Connecting to channel...</p>
                </div>
            {:else if !isStreamActive}
                <div class="placeholder-content">
                    <div class="stream-icon">📱</div>
                    <p>Waiting for mobile stream...</p>
                    <p class="hint">Start streaming from your mobile app</p>
                </div>
            {/if}
        </div>
    </div>

    <!-- Live Selling Form -->
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
                    <label for="streamDescription">Description</label>
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
                    <button class="btn-primary" onclick={onStartLiveSelling}>
                        🛍️ Start Live Selling
                    </button>
                {:else}
                    <div class="live-selling-active">
                        <span class="live-badge">
                            <span class="live-dot"></span>
                            SELLING LIVE
                        </span>
                        <button class="btn-danger btn-sm" onclick={onStopLiveSelling}>
                            Stop Sale
                        </button>
                    </div>
                {/if}
            {/if}
        </div>
    </div>
</div>

<style>
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

    .placeholder-content {
        text-align: center;
        color: #6d7175;
    }

    .stream-icon {
        font-size: 3rem;
        margin-bottom: 0.5rem;
        opacity: 0.6;
    }

    .placeholder-content p {
        margin: 0.25rem 0;
        font-size: 0.875rem;
    }

    .hint {
        font-size: 0.75rem;
        opacity: 0.8;
    }

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
        transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }

    .form-input:focus {
        outline: none;
        border-color: #005bd3;
        box-shadow: 0 0 0 2px rgba(0, 91, 211, 0.1);
    }

    .stream-controls {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px solid #f0f0f0;
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

    .btn-primary,
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

    .btn-danger {
        background: #d72c0d;
        color: white;
    }

    .btn-danger:hover {
        background: #b8240b;
    }

    .btn-sm {
        padding: 0.5rem 1rem;
        font-size: 0.875rem;
    }

    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.6; }
    }

    @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; }
    }

    @media (max-width: 768px) {
        .form-row {
            grid-template-columns: 1fr;
            gap: 0.75rem;
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
</style>