<script>
    import { currency } from '$lib/utils/index';
    import { goto } from '$app/navigation';
    
    let { waitlist, loading = false, waitlistId } = $props();
    
    function navigateToProduct() {
        if (waitlist?.product_id) {
            goto(`/products/${waitlist.product_id}?from=waitlist&waitlistId=${waitlistId}`);
        }
    }
</script>

<div class="card">
    <div class="card-header">
        <h3 class="card-title">Product Information</h3>
    </div>
    <div class="card-body">
        {#if loading}
            <div class="product-card">
                <div class="product-card-image">
                    <div class="skeleton skeleton-image"></div>
                </div>
                <div class="product-card-content">
                    <div class="skeleton skeleton-title"></div>
                    <div class="skeleton skeleton-price"></div>
                    <div class="skeleton skeleton-variants"></div>
                    <div class="skeleton skeleton-meta"></div>
                </div>
            </div>
        {:else if waitlist}
            <div class="product-card clickable" onclick={navigateToProduct}>
                <div class="product-card-image">
                    {#if waitlist.product_images && waitlist.product_images.length > 0}
                        <img src="{waitlist.product_images[0].url}" alt="{waitlist.product_name}" />
                    {:else}
                        <div class="product-card-placeholder">📦</div>
                    {/if}
                </div>
                <div class="product-card-content">
                    <div class="product-card-title">{waitlist.product_name || 'Unknown Product'}</div>
                    {#if waitlist.product_price}
                        <div class="product-card-price">{currency(waitlist.product_price)}</div>
                    {/if}
                    {#if waitlist.color || waitlist.size}
                        <div class="product-card-variants">
                            {#if waitlist.color}<span class="variant-item">{waitlist.color}</span>{/if}
                            {#if waitlist.size}<span class="variant-item">{waitlist.size}</span>{/if}
                        </div>
                    {/if}
                    {#if waitlist.inventory_quantity !== null && waitlist.inventory_quantity !== undefined}
                        <div class="product-card-meta">
                            Available: {waitlist.inventory_quantity}
                            {#if waitlist.inventory_quantity === 0}
                                <span class="out-of-stock">Out of Stock</span>
                            {:else if waitlist.inventory_quantity < 5}
                                <span class="low-stock">Low Stock</span>
                            {/if}
                        </div>
                    {/if}
                </div>
            </div>
        {:else}
            <div class="product-card">
                <div class="product-card-content">
                    <div class="product-card-title">No product data available</div>
                </div>
            </div>
        {/if}
    </div>
</div>

<style>
    /* Skeleton styles */
    .skeleton {
        background: var(--color-border);
        border-radius: var(--radius-sm);
        animation: pulse 1.5s ease-in-out infinite alternate;
    }

    .skeleton-image {
        width: 80px;
        height: 80px;
        border-radius: var(--radius-md);
    }

    .skeleton-title {
        height: 1.25rem;
        width: 80%;
        margin-bottom: var(--space-2);
    }

    .skeleton-price {
        height: 1rem;
        width: 40%;
        margin-bottom: var(--space-2);
    }

    .skeleton-variants {
        height: 1.5rem;
        width: 60%;
        margin-bottom: var(--space-2);
    }

    .skeleton-meta {
        height: 0.875rem;
        width: 50%;
    }

    .product-card-placeholder {
        width: 80px;
        height: 80px;
        background: var(--color-surface-hover);
        border-radius: var(--radius-md);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2rem;
        border: 1px solid var(--color-border);
        opacity: 0.6;
    }

    .product-card-image img {
        width: 80px;
        height: 80px;
        object-fit: cover;
        border-radius: var(--radius-md);
        border: 1px solid var(--color-border);
    }

    .out-of-stock {
        color: var(--color-error-text);
        font-weight: var(--font-weight-medium);
        margin-left: var(--space-2);
    }

    .low-stock {
        color: var(--color-warning-text);
        font-weight: var(--font-weight-medium);
        margin-left: var(--space-2);
    }

    @keyframes pulse {
        0% { opacity: 1; }
        100% { opacity: 0.5; }
    }
</style>