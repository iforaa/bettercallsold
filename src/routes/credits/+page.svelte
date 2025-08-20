<script>
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  
  // Data
  let customers = [];
  let stats = null;
  let loading = true;
  let error = null;
  
  // Modal state
  let showAssignModal = false;
  let selectedCustomer = null;
  let assignForm = {
    amount: '',
    description: '',
    expires_at: ''
  };
  let assigning = false;
  
  // Load data
  onMount(async () => {
    await Promise.all([loadCustomers(), loadStats()]);
    loading = false;
  });
  
  async function loadCustomers() {
    try {
      const response = await fetch('/api/admin/credits/customers');
      const data = await response.json();
      if (data.success) {
        customers = data.customers;
      } else {
        throw new Error('Failed to load customers');
      }
    } catch (err) {
      error = err.message;
    }
  }
  
  async function loadStats() {
    try {
      const response = await fetch('/api/admin/credits/stats');
      const data = await response.json();
      if (data.success) {
        stats = data.stats;
      } else {
        throw new Error('Failed to load stats');
      }
    } catch (err) {
      error = err.message;
    }
  }
  
  function openAssignModal(customer) {
    selectedCustomer = customer;
    assignForm = { amount: '', description: '', expires_at: '' };
    showAssignModal = true;
  }
  
  function closeAssignModal() {
    showAssignModal = false;
    selectedCustomer = null;
    assignForm = { amount: '', description: '', expires_at: '' };
  }
  
  async function handleAssignCredits() {
    if (!assignForm.amount || !assignForm.description) {
      alert('Please fill in all required fields');
      return;
    }
    
    assigning = true;
    try {
      const response = await fetch('/api/admin/credits/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selectedCustomer.user_id,
          amount: parseFloat(assignForm.amount),
          description: assignForm.description,
          expires_at: assignForm.expires_at || null
        })
      });
      
      const result = await response.json();
      if (result.success) {
        alert(`Successfully assigned $${assignForm.amount} credits to ${selectedCustomer.name}`);
        closeAssignModal();
        await loadCustomers();
        await loadStats();
      } else {
        throw new Error(result.error || 'Failed to assign credits');
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      assigning = false;
    }
  }
  
  function formatDate(dateStr) {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString();
  }
  
  function formatCurrency(amount) {
    return `$${parseFloat(amount).toFixed(2)}`;
  }
</script>

<svelte:head>
  <title>Credits Management - BetterCallSold</title>
</svelte:head>

<div class="credits-page">
  <div class="page-header">
    <h1>Account Credits Management</h1>
    <p>Assign and manage customer store credits</p>
  </div>
  
  {#if loading}
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading credits data...</p>
    </div>
  {:else if error}
    <div class="error-state">
      <p>Error: {error}</p>
      <button on:click={() => window.location.reload()}>Retry</button>
    </div>
  {:else}
    <!-- Stats Cards -->
    {#if stats}
      <div class="stats-grid" transition:fade>
        <div class="stat-card">
          <h3>Total Outstanding</h3>
          <div class="stat-value">{formatCurrency(stats.total_outstanding_balance)}</div>
          <p class="stat-label">Active credit balances</p>
        </div>
        
        <div class="stat-card">
          <h3>Credits Issued</h3>
          <div class="stat-value">{formatCurrency(stats.total_credits_issued)}</div>
          <p class="stat-label">All-time total</p>
        </div>
        
        <div class="stat-card">
          <h3>Credits Used</h3>
          <div class="stat-value">{formatCurrency(stats.total_credits_used)}</div>
          <p class="stat-label">{stats.utilization_rate}% utilization</p>
        </div>
        
        <div class="stat-card">
          <h3>Customers with Credits</h3>
          <div class="stat-value">{stats.total_customers_with_credits}</div>
          <p class="stat-label">Active balances</p>
        </div>
      </div>
    {/if}
    
    <!-- Customer Credits Table -->
    <div class="table-section" transition:fade>
      <div class="table-header">
        <h2>Customer Credit Balances</h2>
        <div class="table-actions">
          <button class="btn btn-primary" on:click={() => loadCustomers()}>
            Refresh
          </button>
        </div>
      </div>
      
      {#if customers.length === 0}
        <div class="empty-state">
          <p>No customers found</p>
        </div>
      {:else}
        <div class="table-container">
          <table class="credits-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Current Balance</th>
                <th>Total Earned</th>
                <th>Total Spent</th>
                <th>Last Activity</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {#each customers as customer (customer.user_id)}
                <tr>
                  <td>
                    <div class="customer-info">
                      <div class="customer-avatar">
                        {customer.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div class="customer-name">{customer.name}</div>
                        <div class="customer-email">{customer.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span class="balance" class:positive={customer.balance > 0}>
                      {formatCurrency(customer.balance)}
                    </span>
                  </td>
                  <td>{formatCurrency(customer.total_earned)}</td>
                  <td>{formatCurrency(customer.total_spent)}</td>
                  <td>{formatDate(customer.last_transaction_date)}</td>
                  <td>
                    <div class="action-buttons">
                      <button 
                        class="btn btn-sm btn-secondary" 
                        on:click={() => openAssignModal(customer)}
                      >
                        Assign Credits
                      </button>
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  {/if}
</div>

<!-- Assign Credits Modal -->
{#if showAssignModal}
  <div class="modal-overlay" transition:fade>
    <div class="modal">
      <div class="modal-header">
        <h3>Assign Credits to {selectedCustomer?.name}</h3>
        <button class="modal-close" on:click={closeAssignModal}>&times;</button>
      </div>
      
      <div class="modal-body">
        <div class="form-group">
          <label for="amount">Amount ($) *</label>
          <input 
            id="amount"
            type="number" 
            step="0.01" 
            min="0.01" 
            bind:value={assignForm.amount}
            placeholder="25.00"
            required 
          />
        </div>
        
        <div class="form-group">
          <label for="description">Description *</label>
          <input 
            id="description"
            type="text" 
            bind:value={assignForm.description}
            placeholder="e.g., Customer service credit"
            required 
          />
        </div>
        
        <div class="form-group">
          <label for="expires_at">Expiration Date (Optional)</label>
          <input 
            id="expires_at"
            type="date" 
            bind:value={assignForm.expires_at}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>
        
        {#if selectedCustomer}
          <div class="balance-preview">
            <div class="preview-row">
              <span>Current Balance:</span>
              <span class="current">{formatCurrency(selectedCustomer.balance)}</span>
            </div>
            {#if assignForm.amount}
              <div class="preview-row">
                <span>New Balance:</span>
                <span class="new">{formatCurrency(selectedCustomer.balance + parseFloat(assignForm.amount || 0))}</span>
              </div>
            {/if}
          </div>
        {/if}
      </div>
      
      <div class="modal-actions">
        <button 
          class="btn btn-primary" 
          on:click={handleAssignCredits}
          disabled={assigning || !assignForm.amount || !assignForm.description}
        >
          {assigning ? 'Assigning...' : 'Assign Credits'}
        </button>
        <button class="btn btn-secondary" on:click={closeAssignModal}>
          Cancel
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .credits-page {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }
  
  .page-header {
    margin-bottom: 2rem;
  }
  
  .page-header h1 {
    font-size: 2rem;
    font-weight: 600;
    color: #1a1a1a;
    margin: 0 0 0.5rem 0;
  }
  
  .page-header p {
    color: #6b7280;
    margin: 0;
  }
  
  .loading-state, .error-state {
    text-align: center;
    padding: 3rem;
  }
  
  .spinner {
    width: 2rem;
    height: 2rem;
    border: 3px solid #f3f4f6;
    border-top: 3px solid #00a96e;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }
  
  .stat-card {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 1.5rem;
    text-align: center;
  }
  
  .stat-card h3 {
    font-size: 0.9rem;
    font-weight: 500;
    color: #6b7280;
    margin: 0 0 0.5rem 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .stat-value {
    font-size: 2rem;
    font-weight: 700;
    color: #00a96e;
    margin-bottom: 0.25rem;
  }
  
  .stat-label {
    font-size: 0.8rem;
    color: #9ca3af;
    margin: 0;
  }
  
  .table-section {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    overflow: hidden;
  }
  
  .table-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid #e5e7eb;
    background: #f9fafb;
  }
  
  .table-header h2 {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0;
    color: #1a1a1a;
  }
  
  .table-container {
    overflow-x: auto;
  }
  
  .credits-table {
    width: 100%;
    border-collapse: collapse;
  }
  
  .credits-table th {
    background: #f9fafb;
    padding: 0.75rem 1rem;
    text-align: left;
    font-weight: 500;
    color: #374151;
    font-size: 0.875rem;
    border-bottom: 1px solid #e5e7eb;
  }
  
  .credits-table td {
    padding: 1rem;
    border-bottom: 1px solid #f3f4f6;
    vertical-align: middle;
  }
  
  .credits-table tbody tr:hover {
    background: #f9fafb;
  }
  
  .customer-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  .customer-avatar {
    width: 2.5rem;
    height: 2.5rem;
    background: #00a96e;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 0.875rem;
  }
  
  .customer-name {
    font-weight: 500;
    color: #1a1a1a;
    margin-bottom: 0.25rem;
  }
  
  .customer-email {
    font-size: 0.875rem;
    color: #6b7280;
  }
  
  .balance {
    font-weight: 600;
    font-size: 1rem;
  }
  
  .balance.positive {
    color: #00a96e;
  }
  
  .action-buttons {
    display: flex;
    gap: 0.5rem;
  }
  
  .btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }
  
  .btn-primary {
    background: #00a96e;
    color: white;
  }
  
  .btn-primary:hover:not(:disabled) {
    background: #059669;
  }
  
  .btn-secondary {
    background: #f3f4f6;
    color: #374151;
  }
  
  .btn-secondary:hover:not(:disabled) {
    background: #e5e7eb;
  }
  
  .btn-sm {
    padding: 0.375rem 0.75rem;
    font-size: 0.8rem;
  }
  
  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  
  .modal {
    background: white;
    border-radius: 12px;
    width: 90%;
    max-width: 500px;
    max-height: 90vh;
    overflow: hidden;
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
  }
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid #e5e7eb;
  }
  
  .modal-header h3 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #1a1a1a;
  }
  
  .modal-close {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #6b7280;
    padding: 0.25rem;
  }
  
  .modal-close:hover {
    color: #374151;
  }
  
  .modal-body {
    padding: 1.5rem;
  }
  
  .form-group {
    margin-bottom: 1.5rem;
  }
  
  .form-group:last-child {
    margin-bottom: 0;
  }
  
  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: #374151;
  }
  
  .form-group input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 1rem;
    transition: border-color 0.2s;
  }
  
  .form-group input:focus {
    outline: none;
    border-color: #00a96e;
    box-shadow: 0 0 0 3px rgba(0, 169, 110, 0.1);
  }
  
  .balance-preview {
    background: #f9fafb;
    padding: 1rem;
    border-radius: 6px;
    margin-top: 1rem;
  }
  
  .preview-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }
  
  .preview-row:last-child {
    margin-bottom: 0;
  }
  
  .preview-row .current {
    font-weight: 500;
    color: #6b7280;
  }
  
  .preview-row .new {
    font-weight: 600;
    color: #00a96e;
    font-size: 1.1rem;
  }
  
  .modal-actions {
    padding: 1.5rem;
    border-top: 1px solid #e5e7eb;
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
  }
  
  .empty-state {
    text-align: center;
    padding: 3rem;
    color: #6b7280;
  }
</style>