<script>
    import { currency } from '$lib/utils/index';
    
    let { metrics = [], loading = false } = $props();
    
    function formatValue(metric) {
        if (metric.format === 'currency') {
            return currency(metric.value);
        }
        if (metric.format === 'percentage') {
            return `${metric.value}%`;
        }
        return metric.value.toLocaleString();
    }
</script>

<div class="metrics-grid">
    {#each metrics as metric}
        <div class="metric-card metric-card-{metric.variant}">
            <div class="metric-card-content">
                {#if loading}
                    <div class="metric-value">
                        <div class="skeleton skeleton-text skeleton-lg"></div>
                    </div>
                    <div class="metric-label">
                        <div class="skeleton skeleton-text skeleton-sm"></div>
                    </div>
                {:else}
                    <div class="metric-value">{formatValue(metric)}</div>
                    <div class="metric-label">{metric.label}</div>
                {/if}
            </div>
        </div>
    {/each}
</div>

<style>
    .skeleton {
        background: var(--color-border);
        border-radius: var(--radius-sm);
        animation: pulse 1.5s ease-in-out infinite alternate;
    }

    .skeleton-text {
        height: 1rem;
        width: 70%;
    }
    
    .skeleton-lg {
        height: 1.5rem;
        width: 50%;
    }
    
    .skeleton-sm {
        height: 0.875rem;
        width: 80%;
    }

    @keyframes pulse {
        0% { opacity: 1; }
        100% { opacity: 0.5; }
    }
</style>