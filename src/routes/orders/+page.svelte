<script>
    import { goto } from '$app/navigation';
    import { ordersState, ordersActions, getFilteredOrders, getOrderMetrics } from '$lib/state/orders.svelte.js';
    import { createOrdersContext } from '$lib/contexts/orders.svelte.js';
    import { currency, date, orderId, fullOrderId, getStatusColor, formatPaymentMethod } from '$lib/utils/index';
    import LoadingState from '$lib/components/states/LoadingState.svelte';
    import ErrorState from '$lib/components/states/ErrorState.svelte';
    import EmptyState from '$lib/components/states/EmptyState.svelte';

    // Create local context for this component tree
    const { state: localState, actions: localActions } = createOrdersContext();

    // Global state is automatically reactive - don't destructure!
    // Destructuring breaks reactivity in Svelte 5

    // Derived values using $derived with function calls
    const orders = $derived(getFilteredOrders());
    const metrics = $derived(getOrderMetrics());

    // Load data on mount
    $effect(() => {
        ordersActions.loadOrders();
    });

    // Event handlers
    function handleStatusFilter(status) {
        ordersActions.setFilter('status', status);
    }

    function handleSearch(event) {
        ordersActions.setFilter('search', event.target.value);
    }

    function goToOrder(orderId) {
        goto(`/orders/${orderId}`);
    }

    function refreshPage() {
        ordersActions.loadOrders();
    }
</script>

<svelte:head>
    <title>Orders - BetterCallSold</title>
</svelte:head>

<div class="page">
    <div class="page-header">
        <div class="page-header-content">
            <h1 class="page-title">
                <span class="page-icon">📋</span>
                Orders
            </h1>
            <div class="page-actions">
                <!-- Actions removed per requirements -->
            </div>
        </div>
    </div>

    <div class="page-content-padded">
        {#if ordersState.error}
            <ErrorState 
                error={ordersState.error}
                onRetry={ordersActions.retry}
                onBack={refreshPage}
                backLabel="Refresh Page"
            />
        {:else if ordersState.loading}
            <LoadingState message="Loading orders..." size="lg" />
        {:else if orders && orders.length > 0}
            <div class="content-section">

                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Order ID</th>
                                <th>Customer</th>
                                <th>Date</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Payment</th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each orders as order}
                                <tr class="table-row-clickable" onclick={() => goToOrder(order.id)}>
                                    <td class="table-id" title={fullOrderId(order.id)}>
                                        <span class="order-id-display">{orderId(order.id)}</span>
                                    </td>
                                    <td>
                                        <div class="table-cell-content">
                                            <div class="table-cell-details">
                                                <div class="table-cell-title">{order.customer_name}</div>
                                                <div class="table-cell-subtitle">{order.customer_email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="table-cell-text">{date(order.created_at)}</td>
                                    <td class="table-amount">{currency(order.total_amount)}</td>
                                    <td>
                                        <span class="status-badge {getStatusColor(order.status)}">
                                            {order.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div class="payment-method">
                                            {formatPaymentMethod(order.payment_method)}
                                        </div>
                                        {#if order.payment_id && order.payment_id.Valid && order.payment_id.String}
                                            <div class="table-cell-subtitle">{order.payment_id.String.slice(0, 12)}...</div>
                                        {/if}
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            </div>
        {:else}
            <EmptyState 
                icon="📋"
                title="No orders found"
                description="Orders will appear here when customers start making purchases."
                actions={[
                    { label: 'Create First Order', onClick: () => alert('Coming soon!'), primary: true }
                ]}
            />
        {/if}
    </div>
</div>

<style>
    .order-id-display {
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: var(--font-size-xs);
        background: var(--color-border-light);
        padding: var(--space-1) var(--space-2);
        border-radius: var(--radius-sm);
        color: var(--color-text-muted);
        cursor: help;
    }
    
    .payment-method {
        font-size: var(--font-size-sm);
        color: var(--color-text);
        display: flex;
        align-items: center;
        gap: var(--space-1);
    }
    
    /* Ensure order ID column doesn't take too much space */
    .table-id {
        width: 120px;
        min-width: 120px;
        max-width: 120px;
    }
    
    /* Make payment method column responsive */
    @media (max-width: 768px) {
        .table-id {
            width: 100px;
            min-width: 100px;
            max-width: 100px;
        }
        
        .order-id-display {
            font-size: 10px;
            padding: 2px var(--space-1);
        }
    }
</style>