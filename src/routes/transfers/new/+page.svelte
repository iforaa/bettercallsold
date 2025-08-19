<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import type { PageData } from './$types';
  
  let { data }: { data: PageData } = $props();

  // State management
  let locations = $state([]);
  let loading = $state(true);
  let creating = $state(false);
  let error = $state("");

  // Form state
  let fromLocationId = $state('');
  let toLocationId = $state('');
  let reason = $state('');
  let notes = $state('');

  // Pre-selected items from inventory page
  let preSelectedItems = $state([]);
  let transferItems = $state([]);

  // Real-time inventory checking
  let checkingInventory = $state(false);
  let locationInventory = $state(new Map());

  onMount(() => {
    loadLocations();
    loadPreSelectedItems();
  });

  async function loadLocations() {
    try {
      const response = await fetch('/api/locations');
      if (response.ok) {
        locations = await response.json();
      } else {
        throw new Error('Failed to load locations');
      }
    } catch (err) {
      console.error('Load locations error:', err);
      error = "Failed to load locations. Please try again.";
    } finally {
      loading = false;
    }
  }

  function loadPreSelectedItems() {
    const itemsParam = $page.url.searchParams.get('items');
    if (itemsParam) {
      try {
        const decodedParam = decodeURIComponent(itemsParam);
        preSelectedItems = JSON.parse(decodedParam);
        
        transferItems = preSelectedItems.map(item => {
          // Clean up product name - remove extra quotes and normalize spaces
          let productName = (item.product_name || '').replace(/\\"/g, '"').replace(/\+/g, ' ').trim();
          if (!productName) productName = 'Unknown Product';
          
          // Ensure we have valid numeric values
          const availableQty = Math.max(0, parseInt(item.available_quantity) || 0);
          const defaultQty = availableQty > 0 ? 1 : 0;
          
          return {
            variant_id: item.variant_id || '',
            product_name: productName,
            variant_title: item.variant_title || '',
            sku: item.sku || '',
            location_id: item.location_id || '',
            location_name: item.location_name || '',
            available_quantity: availableQty,
            on_hand_quantity: Math.max(0, parseInt(item.on_hand_quantity) || 0),
            quantity: defaultQty,
            image: item.image || null,
            origin_available: 0 // Will be updated when checking inventory
          };
        });
        
        // Filter out items with missing required data
        transferItems = transferItems.filter(item => 
          item.variant_id && 
          item.product_name !== 'Unknown Product' && 
          item.available_quantity >= 0
        );
        
      } catch (e) {
        console.error('Error parsing pre-selected items:', e, 'Raw param:', itemsParam);
        error = 'Error loading selected items. Please go back and try again.';
      }
    }
  }

  async function checkInventoryAtLocation(locationId: string) {
    if (!locationId || transferItems.length === 0) return;

    try {
      checkingInventory = true;
      
      for (let item of transferItems) {
        // Check inventory level for this variant at the selected location
        const response = await fetch(`/api/inventory-levels?variant_id=${item.variant_id}&location_id=${locationId}`);
        if (response.ok) {
          const inventoryData = await response.json();
          item.origin_available = inventoryData.available || 0;
          
          // Adjust quantity if it exceeds available
          if (item.quantity > item.origin_available) {
            item.quantity = Math.max(0, item.origin_available);
          }
        }
      }
    } catch (err) {
      console.error('Error checking inventory:', err);
    } finally {
      checkingInventory = false;
    }
  }

  // Watch for origin location changes to check inventory
  $effect(() => {
    if (fromLocationId) {
      checkInventoryAtLocation(fromLocationId);
    }
  });

  async function createTransfer() {
    if (!fromLocationId || !toLocationId || transferItems.length === 0) {
      error = "Please select both locations and add at least one item.";
      return;
    }

    if (fromLocationId === toLocationId) {
      error = "From and To locations cannot be the same.";
      return;
    }

    // Validate quantities against origin location
    for (const item of transferItems) {
      if (item.quantity <= 0) {
        error = `Please set a valid quantity for ${item.product_name}.`;
        return;
      }
      if (item.quantity > item.origin_available) {
        error = `Cannot transfer ${item.quantity} of ${item.product_name}. Only ${item.origin_available} available at origin location.`;
        return;
      }
    }

    try {
      creating = true;
      error = "";

      const transferData = {
        from_location_id: fromLocationId,
        to_location_id: toLocationId,
        reason: reason || null,
        notes: notes || null,
        items: transferItems.map(item => ({
          variant_id: item.variant_id,
          quantity: item.quantity
        }))
      };

      const response = await fetch('/api/transfers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transferData)
      });

      if (response.ok) {
        const result = await response.json();
        goto(`/transfers/${result.id}`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create transfer');
      }
    } catch (err) {
      console.error('Create transfer error:', err);
      error = err.message || "Failed to create transfer. Please try again.";
    } finally {
      creating = false;
    }
  }

  function updateQuantity(index: number, newQuantity: number) {
    const item = transferItems[index];
    const maxQuantity = item.origin_available;
    if (newQuantity >= 0 && newQuantity <= maxQuantity) {
      transferItems[index].quantity = newQuantity;
    }
  }

  function removeItem(index: number) {
    transferItems = transferItems.filter((_, i) => i !== index);
  }

  function goBack() {
    goto('/transfers');
  }

  function getLocationById(id: string) {
    return locations.find(l => l.id === id);
  }

  function getLocationAddress(location: any): string {
    if (!location) return '';
    const parts = [
      location.address_line_1,
      location.city,
      location.province || location.state
    ].filter(Boolean);
    return parts.join(', ');
  }
</script>

<svelte:head>
  <title>Create New Transfer - BetterCallSold</title>
</svelte:head>

<div class="page">
  <!-- Header -->
  <div class="page-header">
    <div class="page-header-content">
      <div class="page-header-nav">
        <button class="btn-icon" onclick={goBack}>←</button>
        <div class="breadcrumb" style="margin-bottom: 0; font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold);">
          <span class="breadcrumb-item">Transfers</span>
          <span class="breadcrumb-separator">›</span>
          <span class="breadcrumb-item current">Create transfer</span>
        </div>
      </div>
      <div class="page-actions">
        <button class="btn btn-secondary" onclick={goBack} disabled={creating}>Cancel</button>
        <button class="btn btn-primary" onclick={createTransfer} disabled={creating || !fromLocationId || !toLocationId || transferItems.length === 0}>
          {creating ? 'Creating...' : 'Create transfer'}
        </button>
      </div>
    </div>
  </div>

  <div class="page-content">
    {#if loading}
      <div class="loading-state">
        <div class="loading-spinner loading-spinner-lg"></div>
        <p class="loading-text">Loading locations...</p>
      </div>
    {:else}
      <div class="transfer-layout">
        <!-- Left Column: Transfer Configuration -->
        <div class="transfer-main">
          <!-- Origin and Destination -->
          <div class="location-grid">
            <div class="location-card">
              <h3 class="location-title">Origin</h3>
              <select class="location-select" bind:value={fromLocationId}>
                <option value="">Select origin location...</option>
                {#each locations as location}
                  <option value={location.id}>{location.name}</option>
                {/each}
              </select>
              {#if fromLocationId}
                {@const originLocation = getLocationById(fromLocationId)}
                {#if originLocation}
                  <div class="location-address">{getLocationAddress(originLocation)}</div>
                {/if}
              {/if}
            </div>

            <div class="location-card">
              <h3 class="location-title">Destination</h3>
              <select class="location-select" bind:value={toLocationId}>
                <option value="">Select destination location...</option>
                {#each locations as location}
                  <option value={location.id}>{location.name}</option>
                {/each}
              </select>
              {#if toLocationId}
                {@const destLocation = getLocationById(toLocationId)}
                {#if destLocation}
                  <div class="location-address">{getLocationAddress(destLocation)}</div>
                {/if}
              {/if}
            </div>
          </div>

          <!-- Products Section -->
          <div class="products-section">
            <div class="products-header">
              <h3 class="products-title">Add products</h3>
              <div class="products-actions">
                <input type="text" placeholder="Search products" class="search-input" disabled />
                <button class="btn btn-secondary" disabled>Browse</button>
                <button class="btn btn-secondary" disabled>Import</button>
                <button class="btn-icon" disabled>⚙️</button>
              </div>
            </div>

            {#if error}
              <div class="alert alert-error">
                {error}
              </div>
            {/if}

            {#if transferItems.length === 0}
              <div class="empty-products">
                <p>No items available for transfer.</p>
                <button class="btn btn-secondary" onclick={() => goto('/inventory')}>
                  Select from Inventory
                </button>
              </div>
            {:else}
              <!-- Products Table -->
              <div class="products-table">
                <div class="table-header">
                  <div class="col-product">Products</div>
                  <div class="col-sku">SKU</div>
                  <div class="col-origin">At origin</div>
                  <div class="col-quantity">Quantity</div>
                  <div class="col-actions"></div>
                </div>

                {#each transferItems as item, index}
                  <div class="table-row {item.origin_available === 0 ? 'row-not-stocked' : ''}">
                    <div class="col-product">
                      <div class="product-info">
                        <div class="product-image">
                          {#if item.image}
                            <img src={item.image} alt={item.product_name} />
                          {:else}
                            <div class="product-placeholder">📦</div>
                          {/if}
                        </div>
                        <div class="product-details">
                          <div class="product-name">{item.product_name}</div>
                          <div class="product-variant">{item.variant_title}</div>
                        </div>
                      </div>
                    </div>
                    <div class="col-sku">{item.sku || '-'}</div>
                    <div class="col-origin">
                      {#if checkingInventory}
                        <span class="loading-text">...</span>
                      {:else if item.origin_available === 0}
                        <span class="not-stocked">Not stocked at {getLocationById(fromLocationId)?.name || 'origin'}</span>
                      {:else}
                        {item.origin_available}
                      {/if}
                    </div>
                    <div class="col-quantity">
                      <input 
                        type="number" 
                        class="quantity-input" 
                        bind:value={item.quantity}
                        oninput={(e) => updateQuantity(index, parseInt(e.target.value) || 0)}
                        min="0"
                        max={item.origin_available}
                        disabled={item.origin_available === 0}
                      />
                    </div>
                    <div class="col-actions">
                      <button class="btn-icon" onclick={() => removeItem(index)}>×</button>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>

        <!-- Right Column: Notes and Details -->
        <div class="transfer-sidebar">
          <!-- Notes Section -->
          <div class="sidebar-section">
            <div class="sidebar-header">
              <h3 class="sidebar-title">Notes</h3>
              <button class="btn-icon">✏️</button>
            </div>
            <div class="sidebar-content">
              <textarea 
                class="notes-textarea" 
                bind:value={notes} 
                placeholder="No notes"
                rows="4"
              ></textarea>
            </div>
          </div>

          <!-- Transfer Details Section -->
          <div class="sidebar-section">
            <div class="sidebar-header">
              <h3 class="sidebar-title">Transfer details</h3>
            </div>
            <div class="sidebar-content">
              <div class="form-field">
                <label class="form-label">Reason</label>
                <select class="form-select" bind:value={reason}>
                  <option value="">Select reason (optional)...</option>
                  <option value="restock">Restocking</option>
                  <option value="demand">High demand</option>
                  <option value="return">Customer return</option>
                  <option value="damage">Damaged inventory</option>
                  <option value="cycle_count">Cycle count correction</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .transfer-layout {
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: var(--space-6);
    min-height: 600px;
  }

  .transfer-main {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  /* Location Cards */
  .location-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-4);
  }

  .location-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-4);
    min-height: 120px;
  }

  .location-title {
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-medium);
    color: var(--color-text);
    margin: 0 0 var(--space-2) 0;
  }

  .location-select {
    width: 100%;
    padding: var(--space-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-medium);
    background: var(--color-surface);
    color: var(--color-text);
    margin-bottom: var(--space-2);
  }

  .location-address {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    line-height: var(--line-height-tight);
  }

  /* Products Section */
  .products-section {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  .products-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4);
    border-bottom: 1px solid var(--color-border);
  }

  .products-title {
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-medium);
    color: var(--color-text);
    margin: 0;
  }

  .products-actions {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .search-input {
    width: 200px;
    padding: var(--space-1) var(--space-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
  }

  /* Products Table */
  .products-table {
    min-height: 300px;
  }

  .table-header {
    display: grid;
    grid-template-columns: 1fr 100px 80px 80px 40px;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    background: var(--color-surface-hover);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .table-row {
    display: grid;
    grid-template-columns: 1fr 100px 80px 80px 40px;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--color-border);
    align-items: center;
  }

  .row-not-stocked {
    background: var(--color-surface-hover);
  }

  .product-info {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .product-image {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-md);
    overflow: hidden;
    flex-shrink: 0;
  }

  .product-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .product-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-surface-hover);
    font-size: var(--font-size-sm);
  }

  .product-name {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text);
    line-height: var(--line-height-tight);
  }

  .product-variant {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    line-height: var(--line-height-tight);
  }

  .not-stocked {
    font-size: var(--font-size-xs);
    color: var(--color-error);
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }

  .not-stocked::before {
    content: '⚠';
    font-size: var(--font-size-sm);
  }

  .quantity-input {
    width: 60px;
    padding: var(--space-1);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    text-align: center;
    font-size: var(--font-size-sm);
  }

  /* Sidebar */
  .transfer-sidebar {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .sidebar-section {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4);
    border-bottom: 1px solid var(--color-border);
  }

  .sidebar-title {
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-medium);
    color: var(--color-text);
    margin: 0;
  }

  .sidebar-content {
    padding: var(--space-4);
  }

  .notes-textarea {
    width: 100%;
    border: none;
    background: transparent;
    resize: none;
    font-family: inherit;
    font-size: var(--font-size-sm);
    color: var(--color-text);
    line-height: var(--line-height-normal);
  }

  .notes-textarea::placeholder {
    color: var(--color-text-muted);
  }

  .notes-textarea:focus {
    outline: none;
  }

  .empty-products {
    padding: var(--space-8);
    text-align: center;
    color: var(--color-text-muted);
  }

  .alert {
    margin: var(--space-4);
    padding: var(--space-3);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
  }

  .alert-error {
    background: var(--color-error-surface);
    color: var(--color-error);
    border: 1px solid var(--color-error-border);
  }

  /* Responsive */
  @media (max-width: 1024px) {
    .transfer-layout {
      grid-template-columns: 1fr;
      gap: var(--space-4);
    }

    .location-grid {
      grid-template-columns: 1fr;
    }

    .products-actions {
      flex-wrap: wrap;
    }

    .search-input {
      width: 100%;
    }
  }

  @media (max-width: 768px) {
    .table-header,
    .table-row {
      grid-template-columns: 1fr 60px 60px 60px 30px;
      font-size: var(--font-size-xs);
    }

    .products-actions {
      flex-direction: column;
      align-items: stretch;
      gap: var(--space-2);
    }
  }
</style>