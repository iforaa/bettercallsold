<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    
    const dispatch = createEventDispatcher();

    let { show = false } = $props();

    const discountTypes = [
        {
            id: 'amount_off_products',
            title: 'Amount off products',
            description: 'Discount specific products or collections of products',
            icon: '🏷️',
            available: false // Will be implemented later
        },
        {
            id: 'buy_x_get_y', 
            title: 'Buy X get Y',
            description: 'Discount specific products or collections of products',
            icon: '🔄',
            available: false // Will be implemented later
        },
        {
            id: 'amount_off_order',
            title: 'Amount off order',
            description: 'Discount the total order amount',
            icon: '💰',
            available: true // This is what we're implementing first
        },
        {
            id: 'free_shipping',
            title: 'Free shipping',
            description: 'Offer free shipping on an order',
            icon: '🚚',
            available: false // Will be implemented later
        }
    ];

    function handleTypeSelect(discountType) {
        if (!discountType.available) {
            alert('This discount type is not available yet. Only "Amount off order" is currently supported.');
            return;
        }

        dispatch('select', {
            type: discountType.id,
            title: discountType.title
        });
    }

    function handleCancel() {
        dispatch('cancel');
    }

    // Close modal when clicking outside
    function handleOverlayClick(event) {
        if (event.target === event.currentTarget) {
            handleCancel();
        }
    }
</script>

{#if show}
    <div class="modal-overlay" onclick={handleOverlayClick}>
        <div class="modal-content" onclick={(e) => e.stopPropagation()}>
            <div class="modal-header">
                <h2>Select discount type</h2>
                <button class="modal-close" onclick={handleCancel}>×</button>
            </div>
            
            <div class="modal-body">
                <div class="discount-types">
                    {#each discountTypes as discountType}
                        <button 
                            class="discount-type-option {discountType.available ? '' : 'disabled'}"
                            onclick={() => handleTypeSelect(discountType)}
                            disabled={!discountType.available}
                        >
                            <div class="discount-type-content">
                                <div class="discount-type-icon">
                                    {discountType.icon}
                                </div>
                                <div class="discount-type-info">
                                    <div class="discount-type-title">
                                        {discountType.title}
                                        {#if !discountType.available}
                                            <span class="coming-soon">Coming Soon</span>
                                        {/if}
                                    </div>
                                    <div class="discount-type-description">
                                        {discountType.description}
                                    </div>
                                </div>
                                <div class="discount-type-arrow">
                                    {#if discountType.available}
                                        →
                                    {:else}
                                        🔒
                                    {/if}
                                </div>
                            </div>
                        </button>
                    {/each}
                </div>
            </div>

            <div class="modal-footer">
                <button class="btn btn-secondary" onclick={handleCancel}>
                    Cancel
                </button>
            </div>
        </div>
    </div>
{/if}

<style>
    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: var(--space-4);
    }

    .modal-content {
        background: var(--color-surface);
        border-radius: var(--radius-lg);
        width: 100%;
        max-width: 600px;
        max-height: 90vh;
        overflow: auto;
        box-shadow: var(--shadow-lg);
    }

    .modal-header {
        padding: var(--space-6) var(--space-6) var(--space-4);
        border-bottom: 1px solid var(--color-border);
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .modal-header h2 {
        margin: 0;
        font-size: var(--font-size-xl);
        font-weight: var(--font-weight-semibold);
        color: var(--color-text-primary);
    }

    .modal-close {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        color: var(--color-text-secondary);
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--radius-md);
        transition: background-color var(--transition-fast);
    }

    .modal-close:hover {
        background: var(--color-background-secondary);
        color: var(--color-text-primary);
    }

    .modal-body {
        padding: var(--space-4) var(--space-6);
    }

    .discount-types {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
    }

    .discount-type-option {
        width: 100%;
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg);
        padding: var(--space-4);
        cursor: pointer;
        transition: all var(--transition-fast);
        text-align: left;
    }

    .discount-type-option:hover:not(.disabled) {
        border-color: var(--color-primary);
        background: var(--color-primary-50);
        transform: translateY(-1px);
        box-shadow: var(--shadow-md);
    }

    .discount-type-option.disabled {
        opacity: 0.6;
        cursor: not-allowed;
        background: var(--color-background-secondary);
    }

    .discount-type-content {
        display: flex;
        align-items: center;
        gap: var(--space-4);
    }

    .discount-type-icon {
        font-size: 1.5rem;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 48px;
        height: 48px;
        background: var(--color-background-secondary);
        border-radius: var(--radius-lg);
    }

    .discount-type-info {
        flex: 1;
    }

    .discount-type-title {
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-semibold);
        color: var(--color-text-primary);
        margin-bottom: var(--space-1);
        display: flex;
        align-items: center;
        gap: var(--space-2);
    }

    .coming-soon {
        font-size: var(--font-size-xs);
        background: var(--color-warning);
        color: var(--color-warning-text);
        padding: 2px var(--space-1);
        border-radius: var(--radius-sm);
        font-weight: var(--font-weight-medium);
    }

    .discount-type-description {
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
        line-height: 1.4;
    }

    .discount-type-arrow {
        font-size: var(--font-size-lg);
        color: var(--color-text-tertiary);
        flex-shrink: 0;
    }

    .discount-type-option:hover:not(.disabled) .discount-type-arrow {
        color: var(--color-primary);
    }

    .modal-footer {
        padding: var(--space-4) var(--space-6) var(--space-6);
        border-top: 1px solid var(--color-border);
        display: flex;
        justify-content: flex-end;
        gap: var(--space-3);
    }

    @media (max-width: 768px) {
        .modal-overlay {
            padding: var(--space-2);
        }
        
        .modal-header,
        .modal-body,
        .modal-footer {
            padding-left: var(--space-4);
            padding-right: var(--space-4);
        }
        
        .discount-type-content {
            gap: var(--space-3);
        }
        
        .discount-type-icon {
            width: 40px;
            height: 40px;
            font-size: 1.25rem;
        }
        
        .discount-type-title {
            font-size: var(--font-size-base);
        }
    }
</style>