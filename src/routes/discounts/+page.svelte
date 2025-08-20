<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { browser } from '$app/environment';
    import DiscountTypeSelector from '$lib/components/discounts/DiscountTypeSelector.svelte';
    import DiscountTable from '$lib/components/discounts/DiscountTable.svelte';
    import { DiscountService } from '$lib/services/DiscountService.js';
    import { getDiscountStatusColor } from '$lib/utils/status';
    import ErrorState from '$lib/components/states/ErrorState.svelte';

    // State management
    let discounts = $state([]);
    let loading = $state(true);
    let error = $state('');
    let selectedItems = $state(new Set());
    let showCreateModal = $state(false);

    // Filters
    let activeFilter = $state('all'); // 'all', 'active', 'scheduled', 'expired'
    let searchQuery = $state('');

    // Pagination
    let currentPage = $state(1);
    let itemsPerPage = $state(50);
    let totalItems = $state(0);

    // Computed
    let hasSelectedItems = $derived(selectedItems.size > 0);
    let isAllSelected = $derived(discounts.length > 0 && selectedItems.size === discounts.length);
    let filteredDiscounts = $derived(
        discounts.filter(discount => {
            // Apply status filter
            if (activeFilter !== 'all' && DiscountService.getDiscountStatus(discount) !== activeFilter) {
                return false;
            }
            
            // Apply search filter
            if (searchQuery && !discount.title.toLowerCase().includes(searchQuery.toLowerCase())) {
                return false;
            }
            
            return true;
        })
    );

    // Load discounts on mount
    onMount(() => {
        if (browser) {
            loadDiscounts();
        }
    });

    // Load discounts from API
    async function loadDiscounts() {
        try {
            loading = true;
            error = '';

            const params = {
                status: activeFilter !== 'all' ? activeFilter : undefined,
                search: searchQuery || undefined,
                limit: itemsPerPage,
                offset: (currentPage - 1) * itemsPerPage
            };

            const data = await DiscountService.getDiscounts(params);
            discounts = data.discounts || [];
            totalItems = data.pagination?.total || 0;

        } catch (err) {
            console.error('Load discounts error:', err);
            error = err.message || 'Failed to load discounts';
        } finally {
            loading = false;
        }
    }


    // Handle filter change
    function handleFilterChange(filter) {
        activeFilter = filter;
        currentPage = 1;
        selectedItems = new Set();
        loadDiscounts();
    }

    // Handle search
    function handleSearch() {
        currentPage = 1;
        selectedItems = new Set();
        loadDiscounts();
    }

    // Handle item selection
    function handleItemSelection(discountId) {
        if (selectedItems.has(discountId)) {
            selectedItems.delete(discountId);
        } else {
            selectedItems.add(discountId);
        }
        selectedItems = new Set(selectedItems);
    }

    // Handle select all
    function handleSelectAll(selected) {
        if (selected) {
            selectedItems = new Set(filteredDiscounts.map(d => d.id));
        } else {
            selectedItems = new Set();
        }
    }

    // Navigate to discount creation
    function handleCreateDiscount() {
        showCreateModal = true;
    }

    // Handle discount type selection
    function handleDiscountTypeSelect(event) {
        const { type, title } = event.detail;
        showCreateModal = false;
        
        // Navigate to discount creation form with selected type
        goto(`/discounts/new?type=${type}&title=${encodeURIComponent(title)}`);
    }

    // Handle modal cancel
    function handleModalCancel() {
        showCreateModal = false;
    }


    // Handle discount deletion
    async function handleDeleteDiscount(discountId) {
        if (!confirm('Are you sure you want to delete this discount?')) {
            return;
        }

        try {
            await DiscountService.deleteDiscount(discountId);
            await loadDiscounts();
            selectedItems.delete(discountId);
            selectedItems = new Set(selectedItems);
        } catch (err) {
            console.error('Delete discount error:', err);
            alert(err.message || 'Failed to delete discount');
        }
    }
</script>

<svelte:head>
    <title>Discounts - BetterCallSold</title>
</svelte:head>

<div class="page">
    <div class="page-header">
        <div class="page-header-content">
            <div class="page-header-nav">
                <div class="breadcrumb" style="margin-bottom: 0; font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold);">
                    <span class="breadcrumb-item current">🏷️ Discounts</span>
                </div>
            </div>
            <div class="page-actions">
                <button class="btn btn-secondary">
                    📤 Export
                </button>
                <button class="btn btn-primary" onclick={handleCreateDiscount}>
                    Create discount
                </button>
            </div>
        </div>
    </div>

    <div class="page-content">
        <!-- Filter tabs -->
        <div class="filter-tabs">
            <button 
                class="filter-tab {activeFilter === 'all' ? 'active' : ''}"
                onclick={() => handleFilterChange('all')}
            >
                All
            </button>
            <button 
                class="filter-tab {activeFilter === 'active' ? 'active' : ''}"
                onclick={() => handleFilterChange('active')}
            >
                Active
            </button>
            <button 
                class="filter-tab {activeFilter === 'scheduled' ? 'active' : ''}"
                onclick={() => handleFilterChange('scheduled')}
            >
                Scheduled
            </button>
            <button 
                class="filter-tab {activeFilter === 'expired' ? 'active' : ''}"
                onclick={() => handleFilterChange('expired')}
            >
                Expired
            </button>
        </div>

        <!-- Search and table controls -->
        <div class="table-controls">
            <div class="search-box">
                <input 
                    type="text" 
                    placeholder="Search discounts..." 
                    bind:value={searchQuery}
                    onkeyup={(e) => e.key === 'Enter' && handleSearch()}
                    class="search-input"
                />
                <button class="search-btn" onclick={handleSearch}>🔍</button>
            </div>
            
            {#if hasSelectedItems}
                <div class="bulk-actions">
                    <span class="selected-count">{selectedItems.size} selected</span>
                    <button class="btn btn-secondary btn-sm">Activate</button>
                    <button class="btn btn-secondary btn-sm">Deactivate</button>
                    <button class="btn btn-danger btn-sm">Delete</button>
                </div>
            {/if}
        </div>

        <!-- Discounts table -->
        {#if error}
            <ErrorState 
                error={error}
                title="Error"
                onRetry={loadDiscounts}
                retryLabel="Retry"
            />
        {:else}
            <DiscountTable 
                discounts={filteredDiscounts}
                {loading}
                selectedItems={selectedItems}
                onItemSelect={handleItemSelection}
                onSelectAll={handleSelectAll}
                onDeleteDiscount={handleDeleteDiscount}
                showSelection={true}
                emptyStateConfig={{
                    title: "No discounts found",
                    description: activeFilter !== 'all' 
                        ? `No ${activeFilter} discounts found. Try changing the filter or creating a new discount.`
                        : searchQuery 
                            ? 'No discounts match your search. Try different keywords or create a new discount.'
                            : 'Create your first discount to start offering deals to customers.',
                    onCreateDiscount: handleCreateDiscount
                }}
            />
        {/if}
    </div>
</div>

<!-- Discount type selector modal -->
<DiscountTypeSelector 
    show={showCreateModal}
    on:select={handleDiscountTypeSelect}
    on:cancel={handleModalCancel}
/>

<style>
    /* Page layout */
    .page-content {
        padding: var(--space-4);
    }

    /* Filter tabs */
    .filter-tabs {
        display: flex;
        gap: var(--space-1);
        margin-bottom: var(--space-4);
        border-bottom: 1px solid var(--color-border);
    }

    .filter-tab {
        background: none;
        border: none;
        padding: var(--space-3) var(--space-4);
        color: var(--color-text-secondary);
        cursor: pointer;
        font-weight: var(--font-weight-medium);
        border-bottom: 2px solid transparent;
        transition: all var(--transition-fast);
    }

    .filter-tab:hover {
        color: var(--color-text-primary);
    }

    .filter-tab.active {
        color: var(--color-primary);
        border-bottom-color: var(--color-primary);
    }

    /* Table controls */
    .table-controls {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--space-4);
        gap: var(--space-4);
    }

    .search-box {
        display: flex;
        align-items: center;
        max-width: 300px;
        flex: 1;
    }

    .search-input {
        flex: 1;
        padding: var(--space-2) var(--space-3);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md) 0 0 var(--radius-md);
        outline: none;
    }

    .search-input:focus {
        border-color: var(--color-primary);
    }

    .search-btn {
        background: var(--color-background-secondary);
        border: 1px solid var(--color-border);
        border-left: none;
        padding: var(--space-2) var(--space-3);
        border-radius: 0 var(--radius-md) var(--radius-md) 0;
        cursor: pointer;
    }

    .search-btn:hover {
        background: var(--color-background-tertiary);
    }

    .bulk-actions {
        display: flex;
        align-items: center;
        gap: var(--space-2);
    }

    .selected-count {
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
        margin-right: var(--space-2);
    }



</style>