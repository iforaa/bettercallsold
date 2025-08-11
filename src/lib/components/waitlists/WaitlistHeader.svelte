<script>
    import { dateTime } from '$lib/utils/index';
    import { getOrderSourceLabel, getOrderSourceColor } from '$lib/utils/status';
    
    let { waitlist, loading = false } = $props();
    
    function formatPosition(position) {
        return position ? `#${position}` : 'N/A';
    }
</script>

<div class="header-card">
    <div class="header-card-content">
        {#if loading}
            <h2 class="header-card-title">
                <div class="skeleton skeleton-title"></div>
            </h2>
            <div class="header-card-meta">
                <div class="skeleton skeleton-meta"></div>
                <div class="skeleton skeleton-meta"></div>
                <div class="skeleton skeleton-badge"></div>
            </div>
        {:else if waitlist}
            <h2 class="header-card-title">Waitlist Entry #{waitlist.id.slice(0, 8)}...</h2>
            <div class="header-card-meta">
                <span class="header-card-date">{dateTime(waitlist.created_at)}</span>
                <span class="variant-item">
                    Position {formatPosition(waitlist.position)}
                </span>
                {#if waitlist.authorized_at}
                    <span class="status-badge authorized">Authorized</span>
                {:else}
                    <span class="status-badge pending">Pending</span>
                {/if}
                <span class="source-badge {getOrderSourceColor(waitlist.order_source)}">
                    {getOrderSourceLabel(waitlist.order_source)}
                </span>
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
        height: 1.75rem;
        width: 60%;
        margin-bottom: var(--space-2);
    }

    .skeleton-meta {
        height: 1rem;
        width: 120px;
        margin-right: var(--space-2);
        display: inline-block;
    }

    .skeleton-badge {
        height: 1.5rem;
        width: 80px;
        border-radius: var(--radius-sm);
        display: inline-block;
        margin-right: var(--space-2);
    }

    /* Source badge colors - platform specific */
    .source-badge {
        padding: var(--space-1) var(--space-2);
        border-radius: var(--radius-sm);
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-medium);
        text-transform: capitalize;
        margin-left: var(--space-2);
    }

    .source-badge.blue {
        background: var(--color-info-bg);
        color: var(--color-info-text);
    }

    .source-badge.purple {
        background: #ede9fe;
        color: #7c3aed;
    }

    .source-badge.green {
        background: var(--color-success-bg);
        color: var(--color-success-text);
    }

    .source-badge.orange {
        background: var(--color-warning-bg);
        color: var(--color-warning-text);
    }

    .source-badge.gray {
        background: var(--color-surface-alt);
        color: var(--color-text-muted);
    }

    /* Status badge colors - waitlist specific */
    .status-badge.authorized {
        background: var(--color-success-bg);
        color: var(--color-success-text);
    }

    .status-badge.pending {
        background: var(--color-warning-bg);
        color: var(--color-warning-text);
    }

    @keyframes pulse {
        0% { opacity: 1; }
        100% { opacity: 0.5; }
    }
</style>