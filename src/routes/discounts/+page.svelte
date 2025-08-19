<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { browser } from '$app/environment';
    import DiscountTypeSelector from '$lib/components/discounts/DiscountTypeSelector.svelte';

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
            if (activeFilter !== 'all' && getDiscountStatus(discount) !== activeFilter) {
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

            const params = new URLSearchParams();
            if (activeFilter !== 'all') params.append('status', activeFilter);
            if (searchQuery) params.append('search', searchQuery);
            params.append('limit', itemsPerPage.toString());
            params.append('offset', ((currentPage - 1) * itemsPerPage).toString());

            const response = await fetch(`/api/discounts?${params}`);
            
            if (!response.ok) {
                throw new Error('Failed to load discounts');
            }

            const data = await response.json();
            discounts = data.discounts || [];
            totalItems = data.pagination?.total || 0;

        } catch (err) {
            console.error('Load discounts error:', err);
            error = 'Failed to load discounts';
        } finally {
            loading = false;
        }
    }

    // Get discount status based on dates and status
    function getDiscountStatus(discount) {
        const now = new Date();
        const startsAt = new Date(discount.starts_at);
        const endsAt = discount.ends_at ? new Date(discount.ends_at) : null;

        if (discount.status === 'disabled') return 'disabled';
        if (startsAt > now) return 'scheduled';
        if (endsAt && endsAt < now) return 'expired';
        return 'active';
    }

    // Get status badge class
    function getStatusBadgeClass(status) {
        switch (status) {
            case 'active': return 'status-badge-active';
            case 'scheduled': return 'status-badge-scheduled';
            case 'expired': return 'status-badge-expired';
            case 'disabled': return 'status-badge-disabled';
            default: return 'status-badge-active';
        }
    }

    // Get discount type icon
    function getDiscountTypeIcon(discountType) {
        switch (discountType) {
            case 'amount_off_order': return '💰';
            case 'amount_off_products': return '🏷️';
            case 'buy_x_get_y': return '🔄';
            case 'free_shipping': return '🚚';
            default: return '💰';
        }
    }

    // Format discount value for display
    function formatDiscountValue(discount) {
        if (discount.value_type === 'percentage') {
            return `${discount.value}%`;
        } else {
            return `$${discount.value}`;
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
    function toggleItemSelection(discountId) {
        if (selectedItems.has(discountId)) {
            selectedItems.delete(discountId);
        } else {
            selectedItems.add(discountId);
        }
        selectedItems = new Set(selectedItems);
    }

    // Handle select all
    function toggleSelectAll() {
        if (isAllSelected) {
            selectedItems = new Set();
        } else {
            selectedItems = new Set(discounts.map(d => d.id));
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

    // Navigate to discount details
    function handleDiscountClick(discount) {
        goto(`/discounts/${discount.id}`);
    }

    // Handle discount deletion
    async function handleDeleteDiscount(discountId) {
        if (!confirm('Are you sure you want to delete this discount?')) {
            return;
        }

        try {
            const response = await fetch(`/api/discounts/${discountId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                await loadDiscounts();
                selectedItems.delete(discountId);
                selectedItems = new Set(selectedItems);
            } else {
                const data = await response.json();
                alert(data.message || 'Failed to delete discount');
            }
        } catch (err) {
            console.error('Delete discount error:', err);
            alert('Failed to delete discount');
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
        {#if loading}
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Loading discounts...</p>
            </div>
        {:else if error}
            <div class="error-state">
                <div class="error-icon">⚠️</div>
                <h3>Error</h3>
                <p>{error}</p>
                <button class="btn btn-primary" onclick={() => loadDiscounts()}>
                    Retry
                </button>
            </div>
        {:else if filteredDiscounts.length === 0}
            <div class="empty-state">
                <div class="empty-icon">🏷️</div>
                <h3>No discounts found</h3>
                <p>
                    {#if activeFilter !== 'all'}
                        No {activeFilter} discounts found. Try changing the filter or creating a new discount.
                    {:else if searchQuery}
                        No discounts match your search. Try different keywords or create a new discount.
                    {:else}
                        Create your first discount to start offering deals to customers.
                    {/if}
                </p>
                <button class="btn btn-primary" onclick={handleCreateDiscount}>
                    Create discount
                </button>
            </div>
        {:else}
            <div class="table-container">
                <table class="discounts-table">
                    <thead>
                        <tr>
                            <th class="checkbox-column">
                                <input 
                                    type="checkbox" 
                                    checked={isAllSelected}
                                    onchange={toggleSelectAll}
                                />
                            </th>
                            <th>Title</th>
                            <th>Status</th>
                            <th>Method</th>
                            <th>Type</th>
                            <th>Value</th>
                            <th>Used</th>
                            <th class="actions-column">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each filteredDiscounts as discount (discount.id)}
                            {@const status = getDiscountStatus(discount)}
                            <tr class="discount-row" onclick={() => handleDiscountClick(discount)}>
                                <td class="checkbox-column">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedItems.has(discount.id)}
                                        onchange={(e) => {
                                            e.stopPropagation();
                                            toggleItemSelection(discount.id);
                                        }}
                                    />
                                </td>
                                <td class="title-column">
                                    <div class="discount-title-container">
                                        <div class="discount-title">{discount.title}</div>
                                        {#if discount.description}
                                            <div class="discount-description">{discount.description}</div>
                                        {/if}
                                        {#if discount.code}
                                            <div class="discount-code">Code: {discount.code}</div>
                                        {/if}
                                    </div>
                                </td>
                                <td>
                                    <span class="status-badge {getStatusBadgeClass(status)}">
                                        {status.charAt(0).toUpperCase() + status.slice(1)}
                                    </span>
                                </td>
                                <td>{discount.method_display}</td>
                                <td>
                                    <div class="type-container">
                                        <span class="type-icon">{getDiscountTypeIcon(discount.discount_type)}</span>
                                        <span>{discount.type_display}</span>
                                    </div>
                                </td>
                                <td>{formatDiscountValue(discount)}</td>
                                <td>{discount.total_usage_count || 0}</td>
                                <td class="actions-column">
                                    <button 
                                        class="btn-icon btn-icon-danger"
                                        onclick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteDiscount(discount.id);
                                        }}
                                        title="Delete discount"
                                    >
                                        🗑️
                                    </button>
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
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

    /* Table styles */
    .table-container {
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg);
        overflow: hidden;
    }

    .discounts-table {
        width: 100%;
        border-collapse: collapse;
    }

    .discounts-table th,
    .discounts-table td {
        padding: var(--space-3) var(--space-4);
        text-align: left;
        border-bottom: 1px solid var(--color-border);
    }

    .discounts-table th {
        background: var(--color-background-secondary);
        font-weight: var(--font-weight-semibold);
        color: var(--color-text-secondary);
        font-size: var(--font-size-sm);
    }

    .discount-row {
        cursor: pointer;
        transition: background-color var(--transition-fast);
    }

    .discount-row:hover {
        background: var(--color-background-secondary);
    }

    .checkbox-column {
        width: 40px;
    }

    .actions-column {
        width: 80px;
    }

    .title-column {
        min-width: 250px;
    }

    .discount-title {
        font-weight: var(--font-weight-medium);
        color: var(--color-text-primary);
        margin-bottom: var(--space-1);
    }

    .discount-description {
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
        margin-bottom: var(--space-1);
    }

    .discount-code {
        font-size: var(--font-size-xs);
        color: var(--color-text-tertiary);
        font-family: var(--font-mono);
        background: var(--color-background-secondary);
        padding: 2px var(--space-1);
        border-radius: var(--radius-sm);
        display: inline-block;
    }

    /* Status badges */
    .status-badge {
        padding: 4px var(--space-2);
        border-radius: var(--radius-sm);
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-medium);
        text-transform: capitalize;
    }

    .status-badge-active {
        background: #dcfce7;
        color: #166534;
    }

    .status-badge-scheduled {
        background: #fef3c7;
        color: #92400e;
    }

    .status-badge-expired {
        background: #fef2f2;
        color: #dc2626;
    }

    .status-badge-disabled {
        background: #f3f4f6;
        color: #6b7280;
    }

    .type-container {
        display: flex;
        align-items: center;
        gap: var(--space-2);
    }

    .type-icon {
        font-size: var(--font-size-sm);
    }

    /* Button styles */
    .btn-icon {
        background: none;
        border: none;
        padding: var(--space-1);
        cursor: pointer;
        border-radius: var(--radius-sm);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color var(--transition-fast);
    }

    .btn-icon:hover {
        background: var(--color-background-secondary);
    }

    .btn-icon-danger:hover {
        background: #fef2f2;
        color: #dc2626;
    }

    /* States */
    .loading-state,
    .error-state,
    .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: var(--space-8);
        text-align: center;
        color: var(--color-text-secondary);
    }

    .loading-spinner {
        width: 32px;
        height: 32px;
        border: 3px solid var(--color-border);
        border-top-color: var(--color-primary);
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: var(--space-4);
    }

    .error-icon,
    .empty-icon {
        font-size: 3rem;
        margin-bottom: var(--space-4);
        opacity: 0.6;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }

</style>