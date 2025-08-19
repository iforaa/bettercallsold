<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import type { PageData } from './$types';
  
  let { data }: { data: PageData } = $props();

  // State management
  let transfers = $state([]);
  let locations = $state([]);
  let loading = $state(true);
  let loadingLocations = $state(true);
  let error = $state("");
  let pagination = $state({});

  // URL parameter values
  let currentPage = $derived(data.currentPage || 1);
  let currentLimit = $derived(data.currentLimit || 50);
  let currentStatus = $derived(data.currentStatus || 'all');
  let currentFromLocation = $derived(data.currentFromLocation || 'all');
  let currentToLocation = $derived(data.currentToLocation || 'all');


  // Load data on mount and when URL changes
  onMount(() => {
    loadTransfers();
    loadLocations();
  });

  $effect(() => {
    if (currentPage || currentStatus || currentFromLocation || currentToLocation) {
      loadTransfers();
    }
  });

  async function loadTransfers() {
    try {
      loading = true;
      error = "";
      
      const offset = (currentPage - 1) * currentLimit;
      const searchParams = new URLSearchParams({
        limit: currentLimit.toString(),
        offset: offset.toString()
      });

      if (currentStatus !== 'all') searchParams.set('status', currentStatus);
      if (currentFromLocation !== 'all') searchParams.set('from_location', currentFromLocation);
      if (currentToLocation !== 'all') searchParams.set('to_location', currentToLocation);

      const response = await fetch(`/api/transfers?${searchParams}`);
      if (response.ok) {
        const data = await response.json();
        transfers = data.transfers || [];
        pagination = data.pagination || {};
      } else {
        throw new Error('Failed to load transfers');
      }
    } catch (err) {
      console.error('Load transfers error:', err);
      error = "Failed to load transfers. Please try again.";
    } finally {
      loading = false;
    }
  }

  async function loadLocations() {
    try {
      const response = await fetch('/api/locations');
      if (response.ok) {
        locations = await response.json();
      }
    } catch (error) {
      console.error('Failed to load locations:', error);
    } finally {
      loadingLocations = false;
    }
  }

  function handleStatusChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    updateUrl({ status: target.value });
  }

  function handleFromLocationChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    updateUrl({ from_location: target.value });
  }

  function handleToLocationChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    updateUrl({ to_location: target.value });
  }

  function updateUrl(params: { [key: string]: string }) {
    const url = new URL($page.url);
    Object.entries(params).forEach(([key, value]) => {
      if (value === 'all') {
        url.searchParams.delete(key);
      } else {
        url.searchParams.set(key, value);
      }
    });
    url.searchParams.delete('page'); // Reset to first page
    goto(url.toString());
  }

  function handlePageChange(newPage: number) {
    const url = new URL($page.url);
    if (newPage > 1) {
      url.searchParams.set('page', newPage.toString());
    } else {
      url.searchParams.delete('page');
    }
    goto(url.toString());
  }


  function goToTransfer(transfer: any) {
    goto(`/transfers/${transfer.id}`);
  }

  function getStatusBadgeClass(status: string) {
    const classes = {
      'pending': 'badge-warning',
      'in_transit': 'badge-info',
      'completed': 'badge-success',
      'cancelled': 'badge-error'
    };
    return classes[status] || 'badge-neutral';
  }

  function getStatusText(status: string) {
    const texts = {
      'pending': 'Pending',
      'in_transit': 'In Transit',
      'completed': 'Completed',
      'cancelled': 'Cancelled'
    };
    return texts[status] || status;
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
</script>

<svelte:head>
  <title>Transfers - BetterCallSold</title>
</svelte:head>

<div class="page">
  <div class="page-header">
    <div class="page-header-content">
      <div class="page-header-nav">
        <div class="breadcrumb" style="margin-bottom: 0; font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold);">
          <span class="breadcrumb-item current">🔄 Transfers</span>
        </div>
      </div>
      <div class="page-header-aside">
        <!-- Filters -->
        <div class="form-field form-field-inline" style="margin-bottom: 0;">
          <label class="form-label form-label-sm">Status</label>
          <select class="form-select form-select-sm" value={currentStatus} onchange={handleStatusChange}>
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="in_transit">In Transit</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div class="form-field form-field-inline" style="margin-bottom: 0;">
          <label class="form-label form-label-sm">From</label>
          <select class="form-select form-select-sm" value={currentFromLocation} onchange={handleFromLocationChange} disabled={loadingLocations}>
            <option value="all">All locations</option>
            {#each locations as location}
              <option value={location.name}>{location.name}</option>
            {/each}
          </select>
        </div>

        <div class="form-field form-field-inline" style="margin-bottom: 0;">
          <label class="form-label form-label-sm">To</label>
          <select class="form-select form-select-sm" value={currentToLocation} onchange={handleToLocationChange} disabled={loadingLocations}>
            <option value="all">All locations</option>
            {#each locations as location}
              <option value={location.name}>{location.name}</option>
            {/each}
          </select>
        </div>

      </div>
    </div>
  </div>

  <div class="page-content">
    {#if error}
      <div class="error-state">
        <div class="error-state-content">
          <div class="error-state-icon">⚠</div>
          <h1 class="error-state-title">Error Loading Transfers</h1>
          <p class="error-state-message">{error}</p>
          <div class="error-state-actions">
            <button onclick={loadTransfers} class="btn-primary">Try Again</button>
          </div>
        </div>
      </div>
    {:else if loading}
      <div class="loading-state">
        <div class="loading-spinner loading-spinner-lg"></div>
        <p class="loading-text">Loading transfers...</p>
      </div>
    {:else if transfers.length > 0}
      <!-- Transfers Table -->
      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th class="table-cell-main">Transfer</th>
              <th class="table-cell-location">From</th>
              <th class="table-cell-location">To</th>
              <th class="table-cell-numeric">Items</th>
              <th class="table-cell-numeric">Quantity</th>
              <th class="table-cell-status">Status</th>
              <th class="table-cell-date">Created</th>
            </tr>
          </thead>
          <tbody>
            {#each transfers as transfer}
              <tr class="table-row table-row-clickable" onclick={() => goToTransfer(transfer)}>
                <td class="table-cell-main">
                  <div class="table-cell-content">
                    <div class="table-cell-details">
                      <div class="table-cell-title">{transfer.transfer_number}</div>
                      {#if transfer.reason}
                        <div class="table-cell-subtitle">{transfer.reason}</div>
                      {/if}
                    </div>
                  </div>
                </td>
                <td class="table-cell-location">
                  <span class="table-cell-text">{transfer.from_location.name}</span>
                </td>
                <td class="table-cell-location">
                  <span class="table-cell-text">{transfer.to_location.name}</span>
                </td>
                <td class="table-cell-numeric">
                  <span class="table-cell-text">{transfer.item_count}</span>
                </td>
                <td class="table-cell-numeric">
                  <span class="table-cell-text">{transfer.total_quantity}</span>
                </td>
                <td class="table-cell-status">
                  <span class="badge {getStatusBadgeClass(transfer.status)}">
                    {getStatusText(transfer.status)}
                  </span>
                </td>
                <td class="table-cell-date">
                  <span class="table-cell-text table-cell-muted">{formatDate(transfer.created_at)}</span>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      {#if pagination.totalPages > 1}
        <div class="pagination">
          <div class="pagination-info">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} transfers
          </div>
          <div class="pagination-controls">
            {#if pagination.hasPrev}
              <button class="btn btn-secondary btn-sm" onclick={() => handlePageChange(pagination.page - 1)}>
                Previous
              </button>
            {/if}
            <span class="pagination-current">Page {pagination.page} of {pagination.totalPages}</span>
            {#if pagination.hasNext}
              <button class="btn btn-secondary btn-sm" onclick={() => handlePageChange(pagination.page + 1)}>
                Next
              </button>
            {/if}
          </div>
        </div>
      {/if}
    {:else}
      <div class="empty-state">
        <div class="empty-state-icon">🔄</div>
        <h1 class="empty-state-title">No transfers found</h1>
        <p class="empty-state-message">
          Create your first transfer to move inventory between locations.
        </p>
        <div class="empty-state-actions">
          <p class="text-muted">Create transfers from the inventory page by selecting items first.</p>
        </div>
      </div>
    {/if}
  </div>
</div>


<style>
  .table-cell-location {
    width: 120px;
    min-width: 100px;
  }

  .table-cell-status {
    width: 100px;
    min-width: 80px;
  }

  .table-cell-date {
    width: 140px;
    min-width: 120px;
  }

  .page-header-aside {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .badge-warning {
    background-color: var(--color-warning-light);
    color: var(--color-warning-dark);
  }

  .badge-info {
    background-color: var(--color-info-light);
    color: var(--color-info-dark);
  }

  .badge-success {
    background-color: var(--color-success-light);
    color: var(--color-success-dark);
  }

  .badge-error {
    background-color: var(--color-error-light);
    color: var(--color-error-dark);
  }

  .pagination {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-4);
    border-top: 1px solid var(--color-border);
    background: var(--color-surface);
  }

  .pagination-info {
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
  }

  .pagination-controls {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .pagination-current {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  @media (max-width: 768px) {
    .page-header-aside {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--space-2);
    }
  }
</style>