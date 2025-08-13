<script>
    import { goto } from '$app/navigation';
    
    let { waitlist, loading = false, waitlistId } = $props();
    
    function navigateToCustomer() {
        if (waitlist?.user_id) {
            goto(`/customers/${waitlist.user_id}?from=waitlist&waitlistId=${waitlistId}`);
        }
    }
</script>

<div class="info-card info-card-clickable">
    <div class="card-header">
        <h3 class="card-title">Customer Information</h3>
    </div>
    <div class="card-body">
        {#if loading}
            <div class="info-section">
                <div class="skeleton skeleton-title"></div>
                <div class="skeleton skeleton-subtitle"></div>
                <div class="skeleton skeleton-meta"></div>
            </div>
        {:else if waitlist}
            <div class="info-section info-section-clickable" onclick={navigateToCustomer}>
                <div class="info-title">{waitlist.user_name || 'Unknown User'}</div>
                <div class="info-subtitle">{waitlist.user_email || 'No email provided'}</div>
                <div class="info-meta">Customer ID: {waitlist.user_id}</div>
                {#if waitlist.local_pickup}
                    <div class="info-badge">
                        <span class="status-badge local-pickup">Local Pickup</span>
                    </div>
                {/if}
            </div>
        {:else}
            <div class="info-section">
                <div class="info-title">No customer data available</div>
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

    .skeleton-title {
        height: 1.25rem;
        width: 70%;
        margin-bottom: var(--space-2);
    }

    .skeleton-subtitle {
        height: 1rem;
        width: 85%;
        margin-bottom: var(--space-2);
    }

    .skeleton-meta {
        height: 0.875rem;
        width: 60%;
    }

    .info-badge {
        margin-top: var(--space-2);
    }

    .status-badge.local-pickup {
        background: var(--color-info-bg);
        color: var(--color-info-text);
        padding: var(--space-1) var(--space-2);
        border-radius: var(--radius-sm);
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-medium);
    }

    @keyframes pulse {
        0% { opacity: 1; }
        100% { opacity: 0.5; }
    }
</style>