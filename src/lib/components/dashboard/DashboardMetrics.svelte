<script>
    import { currency } from '$lib/utils/index';
    
    let { metrics = [], loading = false } = $props();
    
    function formatMetricValue(metric) {
        if (metric.format === 'currency') {
            return currency(metric.value);
        }
        return metric.value.toLocaleString();
    }
</script>

<div class="metrics-grid">
    {#each metrics as metric}
        <div class="metric-card metric-card-bordered metric-card-{metric.variant}">
            {#if loading}
                <div class="skeleton skeleton-title"></div>
                <div class="metric-card-label">{metric.label}</div>
            {:else}
                <div class="metric-card-value">{formatMetricValue(metric)}</div>
                <div class="metric-card-label">{metric.label}</div>
            {/if}
        </div>
    {/each}
</div>

<style>
    .metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: var(--space-4);
        margin-bottom: var(--space-6);
    }

    .skeleton {
        background: var(--color-border);
        border-radius: var(--radius-sm);
        animation: pulse 1.5s ease-in-out infinite alternate;
    }

    .skeleton-title {
        height: 2.5rem;
        margin-bottom: var(--space-2);
    }

    @keyframes pulse {
        0% { opacity: 1; }
        100% { opacity: 0.5; }
    }
</style>