<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import type { PageData } from './$types';
  
  let { data }: { data: PageData } = $props();

  // State management
  let transfer = $state(null);
  let loading = $state(true);
  let error = $state("");
  let updating = $state(false);

  // Form state for status updates
  let statusNotes = $state("");
  let receivedQuantities = $state({});

  onMount(() => {
    loadTransfer();
  });

  async function loadTransfer() {
    try {
      loading = true;
      error = "";
      
      const response = await fetch(`/api/transfers/${data.transferId}`);
      if (response.ok) {
        transfer = await response.json();
        initializeReceivedQuantities();
      } else if (response.status === 404) {
        error = "Transfer not found";
      } else {
        throw new Error('Failed to load transfer');
      }
    } catch (err) {
      console.error('Load transfer error:', err);
      error = "Failed to load transfer. Please try again.";
    } finally {
      loading = false;
    }
  }

  function initializeReceivedQuantities() {
    if (transfer?.line_items) {
      const quantities = {};
      transfer.line_items.forEach(item => {
        quantities[item.variant_id] = item.received_quantity || item.quantity;
      });
      receivedQuantities = quantities;
    }
  }

  async function updateTransferStatus(newStatus: string) {
    if (!transfer) return;

    try {
      updating = true;
      const updateData = {
        status: newStatus,
        notes: statusNotes
      };

      // Include received quantities for completion
      if (newStatus === 'completed') {
        updateData.received_quantities = receivedQuantities;
      }

      const response = await fetch(`/api/transfers/${transfer.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        await loadTransfer(); // Reload to get updated data
        statusNotes = "";
      } else {
        throw new Error('Failed to update transfer status');
      }
    } catch (error) {
      alert(`Error updating transfer: ${error.message}`);
    } finally {
      updating = false;
    }
  }

  async function deleteTransfer() {
    if (!transfer || transfer.status !== 'pending') return;

    if (confirm('Are you sure you want to delete this transfer? This action cannot be undone.')) {
      try {
        const response = await fetch(`/api/transfers/${transfer.id}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          goto('/transfers');
        } else {
          throw new Error('Failed to delete transfer');
        }
      } catch (error) {
        alert(`Error deleting transfer: ${error.message}`);
      }
    }
  }

  function goBack() {
    goto('/transfers');
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
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function canUpdateStatus(currentStatus: string, newStatus: string) {
    const validTransitions = {
      'pending': ['in_transit', 'cancelled'],
      'in_transit': ['completed', 'cancelled'],
      'completed': [],
      'cancelled': []
    };
    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  function getFirstImage(product: any): string | null {
    try {
      if (!product?.images) return null;

      let images = product.images;
      if (typeof images === 'string') {
        images = JSON.parse(images);
      }

      if (Array.isArray(images) && images.length > 0) {
        const firstImage = images[0];
        if (typeof firstImage === 'string') {
          return firstImage;
        } else if (firstImage && typeof firstImage === 'object' && firstImage.url) {
          return firstImage.url;
        }
      }

      return null;
    } catch (e) {
      return null;
    }
  }
</script>

<svelte:head>
  <title>Transfer {transfer?.transfer_number || data.transferId} - BetterCallSold</title>
</svelte:head>

{#if loading}
  <div class="page">
    <div class="page-header">
      <div class="page-header-content">
        <div class="page-header-nav">
          <button class="btn-icon" onclick={goBack}>←</button>
          <div class="skeleton skeleton-text skeleton-lg"></div>
        </div>
      </div>
    </div>
    <div class="page-content">
      <div class="loading-state">
        <div class="loading-spinner loading-spinner-lg"></div>
        <p class="loading-text">Loading transfer details...</p>
      </div>
    </div>
  </div>
{:else if error}
  <div class="error-state">
    <div class="error-state-content">
      <div class="error-state-icon">⚠</div>
      <h1 class="error-state-title">Error Loading Transfer</h1>
      <p class="error-state-message">{error}</p>
      <div class="error-state-actions">
        <button onclick={loadTransfer} class="btn-primary">Try Again</button>
        <button onclick={goBack} class="btn-secondary">Go Back</button>
      </div>
    </div>
  </div>
{:else if transfer}
  <div class="page">
    <!-- Header -->
    <div class="page-header">
      <div class="page-header-content">
        <div class="page-header-nav">
          <button class="btn-icon" onclick={goBack}>←</button>
          <div class="breadcrumb" style="margin-bottom: 0; font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold);">
            <span class="breadcrumb-item">Transfers</span>
            <span class="breadcrumb-separator">›</span>
            <span class="breadcrumb-item current">{transfer.transfer_number}</span>
          </div>
        </div>
        <div class="page-actions">
          {#if transfer.status === 'pending'}
            <button class="btn btn-danger" onclick={deleteTransfer}>Delete</button>
            <button class="btn btn-secondary" onclick={() => updateTransferStatus('cancelled')} disabled={updating}>
              Cancel Transfer
            </button>
            <button class="btn btn-primary" onclick={() => updateTransferStatus('in_transit')} disabled={updating}>
              Ship Transfer
            </button>
          {:else if transfer.status === 'in_transit'}
            <button class="btn btn-secondary" onclick={() => updateTransferStatus('cancelled')} disabled={updating}>
              Cancel Transfer
            </button>
            <button class="btn btn-primary" onclick={() => updateTransferStatus('completed')} disabled={updating}>
              Mark as Received
            </button>
          {/if}
        </div>
      </div>
    </div>

    <div class="page-content">
      <div class="content-layout">
        <!-- Transfer Overview -->
        <div class="content-section">
          <div class="content-header">
            <h3 class="content-title">Transfer Overview</h3>
            <span class="badge {getStatusBadgeClass(transfer.status)}">
              {getStatusText(transfer.status)}
            </span>
          </div>
          <div class="content-body">
            <div class="transfer-details">
              <div class="detail-row">
                <span class="detail-label">Transfer Number:</span>
                <span class="detail-value">{transfer.transfer_number}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">From:</span>
                <span class="detail-value">{transfer.from_location.name}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">To:</span>
                <span class="detail-value">{transfer.to_location.name}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Total Quantity:</span>
                <span class="detail-value">{transfer.total_quantity}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Reason:</span>
                <span class="detail-value">{transfer.reason || 'N/A'}</span>
              </div>
              {#if transfer.notes}
                <div class="detail-row">
                  <span class="detail-label">Notes:</span>
                  <span class="detail-value">{transfer.notes}</span>
                </div>
              {/if}
            </div>
          </div>
        </div>

        <!-- Timeline -->
        <div class="content-section">
          <div class="content-header">
            <h3 class="content-title">Transfer Timeline</h3>
          </div>
          <div class="content-body">
            <div class="timeline">
              <div class="timeline-item {transfer.created_at ? 'completed' : ''}">
                <div class="timeline-marker"></div>
                <div class="timeline-content">
                  <div class="timeline-title">Transfer Created</div>
                  <div class="timeline-date">{formatDate(transfer.created_at)}</div>
                </div>
              </div>
              <div class="timeline-item {transfer.shipped_at ? 'completed' : (transfer.status === 'in_transit' || transfer.status === 'completed' ? 'active' : '')}">
                <div class="timeline-marker"></div>
                <div class="timeline-content">
                  <div class="timeline-title">In Transit</div>
                  <div class="timeline-date">{formatDate(transfer.shipped_at)}</div>
                </div>
              </div>
              <div class="timeline-item {transfer.received_at ? 'completed' : (transfer.status === 'completed' ? 'active' : '')}">
                <div class="timeline-marker"></div>
                <div class="timeline-content">
                  <div class="timeline-title">Received</div>
                  <div class="timeline-date">{formatDate(transfer.received_at)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Line Items -->
        <div class="content-section">
          <div class="content-header">
            <h3 class="content-title">Items ({transfer.line_items.length})</h3>
          </div>
          <div class="content-body">
            <div class="table-container">
              <table class="table">
                <thead>
                  <tr>
                    <th class="table-cell-main">Product</th>
                    <th class="table-cell-numeric">Quantity</th>
                    {#if transfer.status === 'in_transit'}
                      <th class="table-cell-numeric">Received</th>
                    {/if}
                  </tr>
                </thead>
                <tbody>
                  {#each transfer.line_items as item}
                    <tr class="table-row">
                      <td class="table-cell-main">
                        <div class="table-cell-content">
                          <div class="table-cell-media">
                            {#if getFirstImage(item.product)}
                              <img 
                                src={getFirstImage(item.product)} 
                                alt={item.product.name}
                                class="table-cell-image"
                              />
                            {:else}
                              <div class="table-cell-placeholder">📦</div>
                            {/if}
                          </div>
                          <div class="table-cell-details">
                            <div class="table-cell-title">{item.product.name}</div>
                            <div class="table-cell-subtitle">
                              {item.variant.title} • SKU: {item.variant.sku || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td class="table-cell-numeric">
                        <span class="table-cell-text">{item.quantity}</span>
                      </td>
                      {#if transfer.status === 'in_transit'}
                        <td class="table-cell-numeric">
                          <input 
                            type="number" 
                            class="form-input form-input-sm table-input" 
                            bind:value={receivedQuantities[item.variant_id]}
                            min="0"
                            max={item.quantity}
                          />
                        </td>
                      {/if}
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Status Update Section -->
        {#if transfer.status === 'pending' || transfer.status === 'in_transit'}
          <div class="content-section">
            <div class="content-header">
              <h3 class="content-title">Add Notes</h3>
            </div>
            <div class="content-body">
              <div class="form-field">
                <label class="form-label" for="status-notes">Notes (Optional)</label>
                <textarea 
                  id="status-notes"
                  class="form-textarea" 
                  bind:value={statusNotes} 
                  placeholder="Add notes about this transfer..."
                ></textarea>
              </div>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
{:else}
  <div class="error-state">
    <div class="error-state-content">
      <div class="error-state-icon">📦</div>
      <h1 class="error-state-title">Transfer Not Found</h1>
      <p class="error-state-message">The transfer you're looking for doesn't exist or has been removed.</p>
      <div class="error-state-actions">
        <button onclick={goBack} class="btn-primary">Back to Transfers</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .content-layout {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-6);
    max-width: 1000px;
    margin: 0 auto;
  }

  .transfer-details {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--space-4);
  }

  .detail-row {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .detail-label {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    font-weight: var(--font-weight-medium);
  }

  .detail-value {
    font-size: var(--font-size-base);
    color: var(--color-text);
    font-weight: var(--font-weight-normal);
  }

  .timeline {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .timeline-item {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
    position: relative;
  }

  .timeline-item:not(:last-child)::after {
    content: '';
    position: absolute;
    left: 8px;
    top: 24px;
    bottom: -16px;
    width: 2px;
    background-color: var(--color-border);
  }

  .timeline-item.completed::after {
    background-color: var(--color-success);
  }

  .timeline-item.active::after {
    background-color: var(--color-primary);
  }

  .timeline-marker {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background-color: var(--color-border);
    border: 3px solid var(--color-surface);
    flex-shrink: 0;
    margin-top: 2px;
  }

  .timeline-item.completed .timeline-marker {
    background-color: var(--color-success);
  }

  .timeline-item.active .timeline-marker {
    background-color: var(--color-primary);
  }

  .timeline-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .timeline-title {
    font-weight: var(--font-weight-medium);
    color: var(--color-text);
  }

  .timeline-date {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  .table-input {
    max-width: 80px;
  }

  .table-cell-image {
    width: 40px;
    height: 40px;
    border-radius: var(--radius-md);
    object-fit: cover;
    border: 1px solid var(--color-border);
  }

  .table-cell-media {
    width: 40px;
    height: 40px;
    background: var(--color-surface-hover);
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--font-size-base);
    overflow: hidden;
    border: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .table-cell-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-surface-hover);
    color: var(--color-text-muted);
  }

  .table-cell-content {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .table-cell-details {
    flex: 1;
    min-width: 0;
  }

  .table-cell-title {
    font-weight: var(--font-weight-normal);
    font-size: var(--font-size-sm);
    color: var(--color-text);
    line-height: var(--line-height-tight);
    word-wrap: break-word;
    word-break: break-word;
    hyphens: auto;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    margin-bottom: 0;
  }

  .table-cell-subtitle {
    font-weight: normal;
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    line-height: var(--line-height-tight);
  }

  @media (max-width: 768px) {
    .transfer-details {
      grid-template-columns: 1fr;
    }

    .content-layout {
      gap: var(--space-4);
    }
  }
</style>