<script>
    import { dashboardState, dashboardActions, getDashboardMetrics, getRecentOrdersDisplay, hasCriticalErrors, isAnyLoading } from '$lib/state/dashboard.svelte.js';
    import DashboardMetrics from '$lib/components/dashboard/DashboardMetrics.svelte';
    import RecentOrdersTable from '$lib/components/dashboard/RecentOrdersTable.svelte';
    import SalesComparisonTable from '$lib/components/dashboard/SalesComparisonTable.svelte';
    import SystemStatus from '$lib/components/dashboard/SystemStatus.svelte';
    import LoadingState from '$lib/components/states/LoadingState.svelte';
    import ErrorState from '$lib/components/states/ErrorState.svelte';

    // Load data on mount using $effect.once - runs only once
    $effect(() => {
        // Only load if we haven't loaded yet or if there's no recent data
        if (!dashboardState.lastFetch) {
            dashboardActions.loadDashboard();
        }
    });

    // Derived values using $derived with function calls
    const metrics = $derived(getDashboardMetrics());
    const recentOrders = $derived(getRecentOrdersDisplay());
    const hasErrors = $derived(hasCriticalErrors());
    const loading = $derived(isAnyLoading());

    function handleRetry() {
        dashboardActions.retry();
    }

    function refreshDashboard() {
        dashboardActions.loadDashboard();
    }
</script>

<svelte:head>
    <title>Dashboard - BetterCallSold</title>
</svelte:head>

<div class="page">
    <div class="page-header">
        <div class="page-header-content">
            <h1 class="page-title">
                <span class="page-icon">🏠</span>
                Dashboard
            </h1>
            <div class="page-actions"></div>
        </div>
    </div>

    <div class="page-content-padded">
        <!-- Global Error State -->
        {#if hasErrors}
            <ErrorState 
                error={dashboardState.errors.dashboard || dashboardState.errors.stats || dashboardState.errors.orders}
                title="Dashboard Error"
                onRetry={handleRetry}
                onBack={refreshDashboard}
                backLabel="Refresh Dashboard"
            />
        {/if}

        <!-- Global Loading State -->
        {#if loading && !hasErrors}
            <LoadingState message="Loading dashboard..." size="lg" />
        {/if}

        <!-- Dashboard Content -->
        {#if !loading && !hasErrors}
            <!-- Stats Cards -->
            <DashboardMetrics 
                {metrics} 
                loading={dashboardState.loading.stats} 
            />
        {/if}

        <!-- Content Grid -->
        {#if !loading && !hasErrors}
            <div class="content-grid">
                <!-- Latest Orders Section -->
                <RecentOrdersTable 
                    orders={recentOrders}
                    loading={dashboardState.loading.orders}
                    error={dashboardState.errors.orders}
                />

                <!-- Sales Comparison Section -->
                <SalesComparisonTable 
                    salesData={dashboardState.salesComparison}
                    loading={dashboardState.loading.sales}
                />
            </div>
        {/if}

        <!-- Latest Comments Section -->
        {#if !loading && !hasErrors}
            <div class="table-container full-width-card">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>COMMENTS</th>
                            <th>INVOICE STATUS</th>
                            <th>PRODUCT IMAGE</th>
                            <th>PRODUCT NAME</th>
                            <th>MANAGE</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td colspan="5" class="table-empty">There are no comments yet.</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        {/if}

        <!-- System Status -->
        <SystemStatus 
            healthData={dashboardState.healthData} 
            show={!loading && !hasErrors}
        />
    </div>
</div>

<style>
    /* Dashboard-specific styles that can't be abstracted */

    /* Content grid for dashboard tables layout */
    .content-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--space-4);
        margin-bottom: var(--space-8);
    }

    .full-width-card {
        grid-column: 1 / -1;
    }

    /* Responsive design */
    @media (max-width: 1024px) {
        .content-grid {
            grid-template-columns: 1fr;
        }
    }
</style>
