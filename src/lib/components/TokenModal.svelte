<script>
    let { 
        show = $bindable(false), 
        isTokenExpired = false,
        onSubmit = null,
        onCancel = null,
        onGenerateToken = null
    } = $props();
    
    let tokenInput = $state("");
    let isGenerating = $state(false);
    let generationError = $state("");
    let showManualInput = $state(false);
    
    function handleSubmit() {
        if (onSubmit && tokenInput.trim()) {
            onSubmit(tokenInput.trim());
        }
    }
    
    function handleCancel() {
        tokenInput = "";
        generationError = "";
        showManualInput = false;
        show = false;
        if (onCancel) {
            onCancel();
        }
    }
    
    async function handleGenerateToken() {
        if (!onGenerateToken) return;
        
        isGenerating = true;
        generationError = "";
        
        try {
            const success = await onGenerateToken();
            if (success) {
                show = false;
                tokenInput = "";
                showManualInput = false;
            }
        } catch (error) {
            console.error('Token generation error:', error);
            if (error.code === 'MISSING_APP_CERTIFICATE') {
                generationError = 'Configuration needed: ' + error.error;
            } else {
                generationError = error.message || "Failed to generate token";
            }
        } finally {
            isGenerating = false;
        }
    }
    
    function toggleManualInput() {
        showManualInput = !showManualInput;
        if (!showManualInput) {
            tokenInput = "";
            generationError = "";
        }
    }
    
    function handleKeydown(event) {
        if (event.key === 'Escape') {
            handleCancel();
        } else if (event.key === 'Enter' && event.ctrlKey && showManualInput) {
            handleSubmit();
        }
    }
</script>

{#if show}
    <div class="token-modal-overlay" role="dialog" aria-modal="true">
        <div class="token-modal">
            <div class="token-modal-header">
                <h3>
                    {isTokenExpired ? "🔑 Token Expired" : "🔑 Enter Agora Token"}
                </h3>
                <button class="close-btn" onclick={handleCancel} aria-label="Close">×</button>
            </div>
            
            <div class="token-modal-content">
                <p class="token-message">
                    {#if isTokenExpired}
                        Your Agora token has expired and needs to be updated to continue streaming.
                    {:else}
                        Your Agora token is required to start streaming.
                    {/if}
                </p>
                
                {#if generationError}
                    <div class="error-message">
                        <span class="error-icon">⚠️</span>
                        {generationError}
                    </div>
                {/if}
                
                {#if !showManualInput}
                    <!-- Automatic Token Generation (Default) -->
                    <div class="generation-section">
                        <div class="generation-info">
                            <h4>🔄 Automatic Token Generation</h4>
                            <p>We can automatically generate a new Agora token for you that will be valid for 24 hours.</p>
                        </div>
                        
                        <div class="token-actions">
                            <button class="btn-secondary" onclick={handleCancel}>
                                Cancel
                            </button>
                            <button class="btn-secondary-outline" onclick={toggleManualInput}>
                                Enter Manually
                            </button>
                            <button 
                                class="btn-primary" 
                                onclick={handleGenerateToken}
                                disabled={isGenerating}
                            >
                                {#if isGenerating}
                                    <span class="loading-spinner"></span>
                                    Generating...
                                {:else}
                                    🔑 Generate New Token
                                {/if}
                            </button>
                        </div>
                    </div>
                {:else}
                    <!-- Manual Token Input (Fallback) -->
                    <div class="manual-input-section">
                        <div class="token-input-group">
                            <label for="tokenInput">Agora Token</label>
                            <textarea
                                id="tokenInput"
                                bind:value={tokenInput}
                                placeholder="Paste your Agora token here..."
                                class="token-textarea"
                                rows="4"
                                onkeydown={handleKeydown}
                                autofocus
                            ></textarea>
                            <p class="token-help">
                                Get your token from the Agora Console or generate one using your App ID and Channel.
                            </p>
                        </div>
                        
                        <div class="token-actions">
                            <button class="btn-secondary" onclick={handleCancel}>
                                Cancel
                            </button>
                            <button class="btn-secondary-outline" onclick={toggleManualInput}>
                                Back to Auto
                            </button>
                            <button 
                                class="btn-primary" 
                                onclick={handleSubmit}
                                disabled={!tokenInput.trim()}
                            >
                                Save & Connect
                            </button>
                        </div>
                    </div>
                {/if}
            </div>
        </div>
    </div>
{/if}

<style>
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

    .btn-primary,
    .btn-secondary,
    .btn-secondary-outline {
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s ease;
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
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

    .btn-secondary {
        background: white;
        color: #6d7175;
        border: 1px solid #c9cccf;
    }

    .btn-secondary:hover {
        background: #f6f6f7;
    }

    .btn-secondary-outline {
        background: transparent;
        color: #005bd3;
        border: 1px solid #005bd3;
    }

    .btn-secondary-outline:hover {
        background: #f0f6ff;
    }

    /* New UI Elements */
    .error-message {
        background: #fef2f2;
        border: 1px solid #fecaca;
        color: #991b1b;
        padding: 0.75rem;
        border-radius: 8px;
        margin-bottom: 1.5rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
    }

    .error-icon {
        flex-shrink: 0;
    }

    .generation-section,
    .manual-input-section {
        margin-bottom: 1rem;
    }

    .generation-info h4 {
        margin: 0 0 0.5rem 0;
        font-size: 1rem;
        font-weight: 600;
        color: #202223;
    }

    .generation-info p {
        margin: 0 0 1.5rem 0;
        color: #6d7175;
        line-height: 1.5;
        font-size: 0.875rem;
    }

    .loading-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid transparent;
        border-top: 2px solid currentColor;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
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
</style>