<script lang="ts">
    import { waitlistsState, waitlistsActions, getCurrentWaitlistDisplay, hasCriticalErrors, isAnyLoading } from '$lib/state/waitlists.svelte.js';
    import WaitlistHeader from '$lib/components/waitlists/WaitlistHeader.svelte';
    import CustomerSection from '$lib/components/waitlists/CustomerSection.svelte';
    import ProductSection from '$lib/components/waitlists/ProductSection.svelte';
    import LoadingState from '$lib/components/states/LoadingState.svelte';
    import ErrorState from '$lib/components/states/ErrorState.svelte';
    import { dateTime } from '$lib/utils/index';
    import { getOrderSourceLabel, getOrderSourceColor } from '$lib/utils/status';
    import { goto } from '$app/navigation';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();
    
    // Load waitlist entry using $effect with proper dependency check
    $effect(() => {
        if (data.waitlistId && (!waitlistsState.currentWaitlist || waitlistsState.currentWaitlist.id !== data.waitlistId)) {
            waitlistsActions.loadWaitlist(data.waitlistId);
        }
    });

    // Derived values using $derived with function calls
    const waitlistDisplay = $derived(getCurrentWaitlistDisplay());
    const hasErrors = $derived(hasCriticalErrors());
    const loading = $derived(isAnyLoading());

    function goBack() {
        goto('/waitlists');
    }

    function handleRetry() {
        if (data.waitlistId) {
            waitlistsActions.loadWaitlist(data.waitlistId);
        }
    }

    function handleAuthorize() {
        if (waitlistsState.currentWaitlist) {
            waitlistsActions.authorizeWaitlist(waitlistsState.currentWaitlist.id);
        }
    }

    function handleEdit() {
        alert('Edit waitlist functionality coming soon!');
    }

    // Clean up when leaving the page
    $effect(() => {
        return () => {
            waitlistsActions.clearCurrentWaitlist();
        };
    });
</script>

<svelte:head>
	<title>Waitlist Details - BetterCallSold</title>
</svelte:head>

<div class="page">
    <div class="page-header">
        <div class="page-header-content">
            <div class="flex-header">
                <button class="btn btn-secondary" onclick={goBack}>
                    ← Back to Waitlists
                </button>
                <h1 class="page-title">
                    <span class="page-icon">⏱️</span>
                    Waitlist Details
                </h1>
            </div>
            <div class="page-actions">
                {#if waitlistsState.currentWaitlist && !waitlistsState.currentWaitlist?.authorized_at}
                    <button 
                        class="btn btn-warning" 
                        onclick={handleAuthorize}
                        disabled={waitlistsState.loading.current}
                    >
                        {#if waitlistsState.loading.current}
                            Authorizing...
                        {:else}
                            Authorize Entry
                        {/if}
                    </button>
                {/if}
                <button class="btn btn-primary" onclick={handleEdit}>
                    Edit Entry
                </button>
            </div>
        </div>
    </div>

    <div class="page-content-padded">
        <!-- Global Error State -->
        {#if hasErrors}
            <ErrorState 
                error={waitlistsState.errors.current}
                title="Waitlist Error"
                onRetry={handleRetry}
                onBack={goBack}
                backLabel="Back to Waitlists"
            />
        {/if}

        <!-- Global Loading State -->
        {#if loading && !hasErrors}
            <LoadingState 
                message="Loading waitlist details..." 
                size="lg" 
            />
        {/if}

        <!-- Waitlist Details Content -->
        {#if !loading && !hasErrors && waitlistsState.currentWaitlist}
            <div class="content-max-width">
                <!-- Header Card -->
                <WaitlistHeader 
                    waitlist={waitlistsState.currentWaitlist} 
                    loading={waitlistsState.loading.current} 
                />

                <!-- Content Cards -->
                <div class="card-group">
                    <!-- Customer Information -->
                    <CustomerSection 
                        waitlist={waitlistsState.currentWaitlist} 
                        loading={waitlistsState.loading.current} 
                    />

                    <!-- Product Information -->
                    <ProductSection 
                        waitlist={waitlistsState.currentWaitlist} 
                        loading={waitlistsState.loading.current} 
                    />

                    <!-- Waitlist Details Summary -->
                    <div class="summary-card">
                        <div class="summary-card-section">
                            <h3 class="summary-card-title">Waitlist Details</h3>
                            <div class="detail-list">
                                <div class="detail-row">
                                    <span class="detail-label">Entry ID:</span>
                                    <span class="detail-value detail-value-mono">{waitlistsState.currentWaitlist?.id}</span>
                                </div>
                                <div class="detail-row">
                                    <span class="detail-label">Position:</span>
                                    <span class="detail-value position-highlight">
                                        #{waitlistsState.currentWaitlist?.position || 'N/A'}
                                    </span>
                                </div>
                                <div class="detail-row">
                                    <span class="detail-label">Source:</span>
                                    <span class="detail-value">
                                        <span class="source-badge {getOrderSourceColor(waitlistsState.currentWaitlist?.order_source)}">
                                            {getOrderSourceLabel(waitlistsState.currentWaitlist?.order_source)}
                                        </span>
                                    </span>
                                </div>
                                <div class="detail-row">
                                    <span class="detail-label">Created:</span>
                                    <span class="detail-value">{dateTime(waitlistsState.currentWaitlist?.created_at)}</span>
                                </div>
                                {#if waitlistsState.currentWaitlist?.authorized_at}
                                    <div class="detail-row">
                                        <span class="detail-label">Authorized:</span>
                                        <span class="detail-value">
                                            {dateTime(new Date((waitlistsState.currentWaitlist?.authorized_at || 0) * 1000).toISOString())}
                                        </span>
                                    </div>
                                {/if}
                                {#if waitlistsState.currentWaitlist?.comment_id}
                                    <div class="detail-row">
                                        <span class="detail-label">Comment ID:</span>
                                        <span class="detail-value detail-value-mono">{waitlistsState.currentWaitlist?.comment_id}</span>
                                    </div>
                                {/if}
                                {#if waitlistsState.currentWaitlist?.instagram_comment_id}
                                    <div class="detail-row">
                                        <span class="detail-label">Instagram Comment:</span>
                                        <span class="detail-value detail-value-mono">{waitlistsState.currentWaitlist?.instagram_comment_id}</span>
                                    </div>
                                {/if}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        {/if}
    </div>
</div>

<style>
    /* Waitlist details page-specific styles */
    
    .position-highlight {
        font-family: monospace;
        font-weight: var(--font-weight-semibold);
        color: var(--color-text);
    }

    /* Source badge colors - platform specific */
    .source-badge {
        padding: var(--space-1) var(--space-2);
        border-radius: var(--radius-sm);
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-medium);
        text-transform: capitalize;
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

    /* Responsive adjustments */
    @media (max-width: 768px) {
        .flex-header {
            flex-direction: column;
            align-items: flex-start;
            gap: var(--space-2);
        }

        .page-actions {
            justify-content: flex-end;
            width: 100%;
            gap: var(--space-2);
        }
    }
</style>