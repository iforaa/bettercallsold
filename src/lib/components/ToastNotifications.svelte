<script>
    import { onMount, onDestroy } from 'svelte';
    import { toastService } from '$lib/services/ToastService.js';
    
    let toasts = $state([]);
    let unsubscribe;
    
    onMount(() => {
        // Subscribe to toast updates
        unsubscribe = toastService.subscribe((updatedToasts) => {
            toasts = updatedToasts;
        });
        
        // Initialize with current toasts
        toasts = toastService.getToasts();
    });
    
    onDestroy(() => {
        if (unsubscribe) {
            unsubscribe();
        }
    });
    
    function removeToast(id) {
        toastService.remove(id);
    }
</script>

{#if toasts.length > 0}
    <div class="toast-container">
        {#each toasts as toast (toast.id)}
            <div class="toast toast-{toast.type}">
                <div class="toast-content">
                    {#if toast.type === "success"}
                        <span class="toast-icon">✓</span>
                    {:else if toast.type === "error"}
                        <span class="toast-icon">⚠</span>
                    {:else if toast.type === "warning"}
                        <span class="toast-icon">⚠</span>
                    {:else}
                        <span class="toast-icon">ℹ</span>
                    {/if}
                    <span class="toast-message">{toast.message}</span>
                </div>
                <button
                    class="toast-close"
                    onclick={() => removeToast(toast.id)}>×</button>
            </div>
        {/each}
    </div>
{/if}

<style>
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
    
    .toast-warning {
        border-left: 4px solid #ffa500;
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

    .toast-error .toast-icon,
    .toast-warning .toast-icon {
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
</style>