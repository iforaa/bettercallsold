<script>
    import { toastService } from '$lib/services/ToastService.js';

    let { 
        agoraService = null,
        joined = false 
    } = $props();
    
    let isCameraActive = $state(false);
    let isLocalStreaming = $state(false);
    let localStreamError = $state("");
    let localVideoContainer;
    
    async function startCamera() {
        if (!agoraService) {
            localStreamError = "Agora service not available";
            return;
        }

        if (!joined) {
            localStreamError = "Please connect to the channel first";
            return;
        }

        try {
            localStreamError = "";

            const { videoTrack, audioTrack } = await agoraService.startLocalCamera();
            
            isCameraActive = true;

        } catch (error) {
            console.error("Failed to start local camera:", error);
            localStreamError = `Failed to start camera: ${error.message}`;
            isCameraActive = false;
        }
    }

    async function startBroadcasting() {
        if (!agoraService) {
            localStreamError = "Agora service not available";
            return;
        }

        try {
            localStreamError = "";

            // Start streaming
            await agoraService.startLocalStreaming();

            // Notify parent component about local stream
            const event = new CustomEvent('local-stream-started', {
                detail: { 
                    videoTrack: agoraService.localVideoTrack,
                    isLocalStreaming: true 
                }
            });
            document.dispatchEvent(event);

            isLocalStreaming = true;

        } catch (error) {
            console.error("Failed to start broadcasting:", error);
            localStreamError = `Failed to start streaming: ${error.message}`;
        }
    }

    async function stopCamera() {
        if (!agoraService) return;

        try {
            await agoraService.stopLocalStreaming();

            // Notify parent component
            const event = new CustomEvent('local-stream-stopped');
            document.dispatchEvent(event);

            isLocalStreaming = false;
            isCameraActive = false;
            localStreamError = "";

        } catch (error) {
            console.error("Failed to stop camera:", error);
            localStreamError = `Failed to stop camera: ${error.message}`;
        }
    }
</script>

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
        <div class="camera-status-display">
            {#if !isCameraActive}
                <div class="status-content">
                    <div class="camera-icon">📹</div>
                    <p>Click "Start Camera" to activate</p>
                    <p class="hint">This will use your computer's camera</p>
                </div>
            {:else if !isLocalStreaming}
                <div class="status-content">
                    <div class="camera-icon active">📹</div>
                    <p class="status-active">Camera is active</p>
                    <p class="hint">Ready to broadcast to the channel</p>
                </div>
            {:else}
                <div class="status-content">
                    <div class="streaming-icon">🔴</div>
                    <p class="status-streaming">Broadcasting live</p>
                    <p class="hint">Video is being sent to the channel</p>
                </div>
            {/if}
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
                        onclick={startCamera}
                        disabled={!joined}
                    >
                        📹 Start Camera
                    </button>
                {:else if !isLocalStreaming}
                    <button
                        class="btn-success"
                        onclick={startBroadcasting}
                    >
                        📡 Start Broadcasting
                    </button>
                    <button
                        class="btn-secondary"
                        onclick={stopCamera}
                    >
                        Stop Camera
                    </button>
                {:else}
                    <span class="streaming-info">
                        🔴 Broadcasting live
                    </span>
                    <button
                        class="btn-danger"
                        onclick={stopCamera}
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

<style>
    .test-camera-section {
        background: white;
        border: 1px solid #e1e1e1;
        border-radius: 12px;
        padding: 1.5rem;
        border-left: 4px solid #ffa500;
    }

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

    .section-icon {
        font-size: 1.125rem;
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

    .camera-status-display {
        width: 100%;
        height: 200px;
        background: #f9fafb;
        border: 2px dashed #c9cccf;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .status-content {
        text-align: center;
        color: #6d7175;
    }

    .camera-icon {
        font-size: 3rem;
        margin-bottom: 0.5rem;
        opacity: 0.6;
    }

    .camera-icon.active {
        opacity: 1;
        color: #00a96e;
    }

    .streaming-icon {
        font-size: 3rem;
        margin-bottom: 0.5rem;
        animation: pulse 2s infinite;
    }

    .status-content p {
        margin: 0.25rem 0;
        font-size: 0.875rem;
    }

    .status-active {
        color: #00a96e;
        font-weight: 600;
    }

    .status-streaming {
        color: #ef4444;
        font-weight: 600;
    }

    .hint {
        font-size: 0.75rem;
        opacity: 0.8;
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

    .error-icon {
        font-size: 1.25rem;
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

    .btn-primary:hover:not(:disabled) {
        background: #004bb5;
    }

    .btn-primary:disabled {
        background: #c9cccf;
        cursor: not-allowed;
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


    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.6; }
    }

    @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; }
    }

    @media (max-width: 640px) {
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