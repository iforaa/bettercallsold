<script>
    import { currency } from '$lib/utils/index';
    
    let { salesData = [], loading = false } = $props();
    
    function formatAbsoluteChange(change) {
        if (change === 0) return '-';
        const formatted = currency(Math.abs(change));
        return change > 0 ? `+${formatted}` : `-${formatted}`;
    }
    
    function formatPercentageChange(change) {
        if (change === 0) return '-';
        const formatted = Math.abs(change).toFixed(1);
        return change > 0 ? `+${formatted}%` : `-${formatted}%`;
    }
    
    function getChangeClass(change) {
        if (change > 0) return 'positive';
        if (change < 0) return 'negative';
        return '';
    }
</script>

<div class="table-container">
    <table class="data-table">
        <thead>
            <tr>
                <th>PERIOD</th>
                <th>REVENUE</th>
                <th>CHANGE</th>
            </tr>
        </thead>
        <tbody>
            {#if loading}
                {#each Array(4) as _, i}
                    <tr>
                        <td><div class="skeleton skeleton-text"></div></td>
                        <td><div class="skeleton skeleton-text"></div></td>
                        <td><div class="skeleton skeleton-text"></div></td>
                    </tr>
                {/each}
            {:else if salesData && salesData.length > 0}
                {#each salesData as item}
                    <tr>
                        <td>
                            <div class="period">
                                <span class="period-icon">📅</span>
                                <span>{item.period}</span>
                            </div>
                        </td>
                        <td class="table-amount">{currency(item.revenue || 0)}</td>
                        <td>
                            <div class="change-container">
                                <span class="change change-absolute {getChangeClass(item.changeAbsolute || item.change)}">
                                    {formatAbsoluteChange(item.changeAbsolute || 0)}
                                </span>
                                <span class="change change-percentage {getChangeClass(item.changePercentage || item.change)}">
                                    {formatPercentageChange(item.changePercentage || item.change || 0)}
                                </span>
                            </div>
                        </td>
                    </tr>
                {/each}
            {:else}
                <tr>
                    <td colspan="3" class="table-empty">No sales data available.</td>
                </tr>
            {/if}
        </tbody>
    </table>
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

    .period {
        display: flex;
        align-items: center;
        color: var(--color-text);
        font-size: var(--font-size-sm);
    }

    .period-icon {
        margin-right: var(--space-2);
        opacity: 0.6;
    }

    .change-container {
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
        align-items: flex-start;
    }
    
    .change {
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-medium);
        padding: var(--space-1) var(--space-2);
        border-radius: var(--radius-sm);
        text-align: center;
        min-width: 60px;
        display: inline-block;
    }
    
    .change-absolute {
        font-weight: var(--font-weight-semibold);
        min-width: 70px;
    }
    
    .change-percentage {
        font-size: 10px;
        opacity: 0.8;
        min-width: 50px;
    }

    .change.positive {
        background: var(--color-success-bg);
        color: var(--color-success-text);
    }

    .change.negative {
        background: var(--color-error-bg);
        color: var(--color-error-text);
    }

    @keyframes pulse {
        0% { opacity: 1; }
        100% { opacity: 0.5; }
    }
</style>