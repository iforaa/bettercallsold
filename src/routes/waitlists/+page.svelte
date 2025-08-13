<script lang="ts">
    import { waitlistsState, waitlistsActions, getFilteredWaitlists, hasCriticalErrors, isAnyLoading } from '$lib/state/waitlists.svelte.js';
    import { createWaitlistsContext } from '$lib/contexts/waitlists.svelte.js';
    import WaitlistsTable from '$lib/components/waitlists/WaitlistsTable.svelte';
    import LoadingState from '$lib/components/states/LoadingState.svelte';
    import ErrorState from '$lib/components/states/ErrorState.svelte';
    import EmptyState from '$lib/components/states/EmptyState.svelte';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();
    
    // Create context for selection management
    const context = createWaitlistsContext();
    
    // Load data on mount using $effect with dependency check
    $effect(() => {
        if (!waitlistsState.lastFetch) {
            waitlistsActions.loadWaitlists();
        }
    });

    // Derived values using $derived with function calls
    const filteredWaitlists = $derived(getFilteredWaitlists());
    const hasErrors = $derived(hasCriticalErrors());
    const loading = $derived(isAnyLoading());

    // Selection handlers
    function handleToggleSelect(waitlistId: string) {
        context.actions.selectWaitlist(waitlistId);
    }

    function handleToggleSelectAll() {
        const waitlistIds = filteredWaitlists.map(w => w.id);
        context.actions.selectAllWaitlists(waitlistIds);
    }

    // Bulk actions
    async function handleBulkAction(action: string, selectedIds: string[]) {
        try {
            if (action === 'authorize') {
                await waitlistsActions.bulkAuthorize(selectedIds);
            } else if (action === 'delete') {
                await waitlistsActions.bulkDelete(selectedIds);
            }
        } catch (error) {
            console.error('Bulk action failed:', error);
            // Error is handled in the state
        }
    }

    // Retry functionality
    function handleRetry() {
        waitlistsActions.retry();
    }

    function refreshWaitlists() {
        waitlistsActions.loadWaitlists();
    }

    // Update context when data changes
    $effect(() => {
        if (filteredWaitlists.length > 0) {
            context.actions.updateSelectAllState(filteredWaitlists.length);
        }
    });
</script>

<svelte:head>
	<title>Waitlists - BetterCallSold</title>
</svelte:head>

<div class="page">
    <div class="page-header">
        <div class="page-header-content">
            <h1 class="page-title">
                <span class="page-icon">⏱️</span>
                Waitlists
            </h1>
            <div class="page-actions">
                {#if context.derived.hasSelection}
                    <div class="bulk-actions">
                        <span class="selection-count">{context.derived.selectionCount} selected</span>
                        <button 
                            class="btn btn-warning" 
                            onclick={() => context.actions.performBulkAction(() => handleBulkAction('authorize', context.state.selectedWaitlists))}
                            disabled={context.derived.isProcessingBulkAction}
                        >
                            {#if context.derived.isProcessingBulkAction && context.state.bulkActions.action === 'authorize'}
                                Authorizing...
                            {:else}
                                Authorize Selected
                            {/if}
                        </button>
                        <button 
                            class="btn btn-error" 
                            onclick={() => context.actions.performBulkAction(() => handleBulkAction('delete', context.state.selectedWaitlists))}
                            disabled={context.derived.isProcessingBulkAction}
                        >
                            {#if context.derived.isProcessingBulkAction && context.state.bulkActions.action === 'delete'}
                                Deleting...
                            {:else}
                                Delete Selected
                            {/if}
                        </button>
                        <button 
                            class="btn btn-secondary" 
                            onclick={() => context.actions.clearSelection()}
                        >
                            Clear Selection
                        </button>
                    </div>
                {/if}
                <!-- Buttons removed per requirements -->
            </div>
        </div>
    </div>

    <div class="page-content-padded">
        <!-- Global Error State -->
        {#if hasErrors}
            <ErrorState 
                error={waitlistsState.errors.waitlists || waitlistsState.errors.current}
                title="Waitlists Error"
                onRetry={handleRetry}
                onBack={refreshWaitlists}
                backLabel="Refresh Waitlists"
            />
        {/if}

        <!-- Global Loading State -->
        {#if loading && !hasErrors}
            <LoadingState message="Loading waitlists..." size="lg" />
        {/if}

        <!-- Waitlists Content -->
        {#if !loading && !hasErrors}
            <!-- Metrics removed per requirements -->
        {/if}

        <!-- Main Content -->
        {#if !loading && !hasErrors}
            {#if filteredWaitlists && filteredWaitlists.length > 0}
                <!-- Waitlists Table -->
                <WaitlistsTable 
                    waitlists={filteredWaitlists}
                    loading={waitlistsState.loading.waitlists}
                    selectedWaitlists={context.state.selectedWaitlists}
                    selectAll={context.state.selectAll}
                    onToggleSelect={handleToggleSelect}
                    onToggleSelectAll={handleToggleSelectAll}
                />

                <!-- Pagination Info -->
                <div class="pagination">
                    <span class="pagination-info">
                        Showing {filteredWaitlists.length} of {waitlistsState.waitlists.length} waitlist entries
                    </span>
                </div>
            {:else}
                <!-- Empty State -->
                <EmptyState 
                    icon="⏱️"
                    title="No waitlists found"
                    description="Waitlist entries will appear here when customers join product waitlists."
                />
            {/if}
        {/if}
    </div>
</div>

<style>
    /* Waitlist page-specific styles */
    
    .bulk-actions {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        margin-right: var(--space-4);
    }
    
    .selection-count {
        font-size: var(--font-size-sm);
        color: var(--color-text-muted);
        font-weight: var(--font-weight-medium);
    }

    .pagination {
        padding: var(--space-4) var(--space-8);
        background: var(--color-surface);
        border-top: 1px solid var(--color-border);
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .pagination-info {
        font-size: var(--font-size-sm);
        color: var(--color-text-muted);
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
        .bulk-actions {
            flex-direction: column;
            align-items: flex-start;
            gap: var(--space-1);
        }
        
        .page-actions {
            flex-direction: column;
            align-items: flex-end;
            gap: var(--space-2);
        }
    }
</style>