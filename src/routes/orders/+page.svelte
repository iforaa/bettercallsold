<script>
    import { goto } from '$app/navigation';
    import { ordersState, ordersActions, getFilteredOrders, getOrderMetrics } from '$lib/state/orders.svelte.js';
    import { createOrdersContext } from '$lib/contexts/orders.svelte.js';
    import { currency, date, getStatusColor } from '$lib/utils/index';
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
                <button class="btn-secondary">Export</button>
                <a href="/orders/new" class="btn-primary">Create order</a>
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
                <!-- Order metrics using reactive derived values -->
                <div class="metrics-grid">
                    <div class="metric-card metric-card-bordered metric-card-accent">
                        <div class="metric-card-value">{metrics.total}</div>
                        <div class="metric-card-label">Total Orders</div>
                    </div>
                    <div class="metric-card metric-card-bordered metric-card-success">
                        <div class="metric-card-value">{metrics.statusCounts.paid || 0}</div>
                        <div class="metric-card-label">Paid Orders</div>
                    </div>
                    <div class="metric-card metric-card-bordered metric-card-warning">
                        <div class="metric-card-value">{metrics.statusCounts.pending || 0}</div>
                        <div class="metric-card-label">Pending Orders</div>
                    </div>
                    <div class="metric-card metric-card-bordered metric-card-error">
                        <div class="metric-card-value">{currency(metrics.revenue)}</div>
                        <div class="metric-card-label">Total Revenue</div>
                    </div>
                </div>

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
                                    <td class="table-id">{order.id.slice(0, 8)}...</td>
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
                                        <div class="table-cell-text">{order.payment_method}</div>
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

<!-- No additional styles needed - using design system components -->