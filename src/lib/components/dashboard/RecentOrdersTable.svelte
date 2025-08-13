<script>
    import { goto } from '$app/navigation';
    import { currency, date } from '$lib/utils/index';
    
    let { orders = [], loading = false, error = '' } = $props();
    
    function goToOrder(orderId) {
        goto(`/orders/${orderId}`);
    }
</script>

<div class="table-container">
    <table class="data-table">
        <thead>
            <tr>
                <th>CUSTOMER</th>
                <th>DATE</th>
                <th>AMOUNT</th>
                <th>STATUS</th>
            </tr>
        </thead>
        <tbody>
            {#if loading}
                {#each Array(3) as _, i}
                    <tr>
                        <td><div class="skeleton skeleton-text"></div></td>
                        <td><div class="skeleton skeleton-text"></div></td>
                        <td><div class="skeleton skeleton-text"></div></td>
                        <td><div class="skeleton skeleton-text"></div></td>
                    </tr>
                {/each}
            {:else if error}
                <tr>
                    <td colspan="4" class="table-error">
                        <div class="error-message">
                            <span class="error-icon">⚠️</span>
                            Failed to load recent orders: {error}
                        </div>
                    </td>
                </tr>
            {:else if orders && orders.length > 0}
                {#each orders as order}
                    <tr class="table-row-clickable" onclick={() => goToOrder(order.id)}>
                        <td>
                            <div class="table-cell-content">
                                <div class="table-cell-details">
                                    <div class="table-cell-title">{order.customer_name || 'Guest'}</div>
                                    <div class="table-cell-subtitle">{order.customer_email || 'guest@example.com'}</div>
                                </div>
                            </div>
                        </td>
                        <td class="table-cell-text">{date(order.created_at)}</td>
                        <td class="table-amount">{currency(parseFloat(order.total_amount || 0))}</td>
                        <td>
                            <span class="status-badge status-badge-{order.status}">
                                {order.status}
                            </span>
                        </td>
                    </tr>
                {/each}
            {:else}
                <tr>
                    <td colspan="4" class="table-empty">No recent orders found.</td>
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
        width: 80%;
    }

    .table-error {
        text-align: center;
        padding: var(--space-6);
    }

    .error-message {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--space-2);
        color: var(--color-error-text);
        font-size: var(--font-size-sm);
    }

    .error-icon {
        font-size: var(--font-size-base);
    }

    @keyframes pulse {
        0% { opacity: 1; }
        100% { opacity: 0.5; }
    }
</style>