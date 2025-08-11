<script lang="ts">
	import { browser } from '$app/environment';
	import { 
		usersState, 
		usersActions, 
		getFilteredTeamMembers,
		getUserAnalytics,
		hasSelection,
		getSelectionCount
	} from '$lib/state/users.svelte.js';
	
	// Components
	import LoadingState from '$lib/components/states/LoadingState.svelte';
	import ErrorState from '$lib/components/states/ErrorState.svelte';
	import EmptyState from '$lib/components/states/EmptyState.svelte';
	import UserCard from '$lib/components/users/UserCard.svelte';
	import UserMetrics from '$lib/components/users/UserMetrics.svelte';
	
	// Reactive state from global store
	let loading = $derived(usersState.teamLoading);
	let error = $derived(usersState.teamError);
	let teamMembers = $derived(getFilteredTeamMembers());
	let analytics = $derived(getUserAnalytics());
	let selectedUsers = $derived(usersState.selectedUsers);
	let hasSelectionDerived = $derived(hasSelection());
	let selectionCount = $derived(getSelectionCount());
	
	// Initialize team data
	$effect(() => {
		if (browser) {
			// Load team members if not already loaded
			if (!usersState.teamLastFetch) {
				usersActions.loadTeamMembers();
			}
		}
	});
	
	// Event handlers
	function handleAddStaff() {
		usersActions.openUserModal();
	}
	
	function handleUserClick(user: any) {
		console.log('View user details:', user);
		// TODO: Navigate to user details or open modal
	}
	
	function handleUserEdit(user: any) {
		usersActions.openUserModal(user);
	}
	
	function handleUserDelete(user: any) {
		usersActions.openDeleteModal(user);
	}
	
	function handleUserSelect(userId: string) {
		usersActions.selectUser(userId);
	}
	
	function handleRetry() {
		usersActions.retry();
	}
	
	function handleClearError() {
		usersState.teamError = '';
	}
	
	function handleManagePermissions() {
		console.log('Manage permissions - coming soon!');
		// TODO: Open permissions management modal
	}
</script>

<svelte:head>
	<title>Users and permissions - BetterCallSold Settings</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<div class="page-header-content">
			<div class="page-header-nav">
				<div class="breadcrumb">
					<span class="breadcrumb-item">Settings</span>
					<span class="breadcrumb-separator">›</span>
					<span class="breadcrumb-item current">👥 Users and permissions</span>
				</div>
			</div>
			<div class="page-actions">
				<button class="btn btn-primary" onclick={handleAddStaff}>
					+ Add Staff
				</button>
			</div>
		</div>
		<p class="page-description">
			Manage your team members and configure role-based permissions.
		</p>
	</div>

	<div class="page-content">
		<!-- Global Error State -->
		{#if error}
			<ErrorState 
				message="Error Loading Staff Members"
				errorText={error}
				onRetry={handleRetry}
				onBack={handleClearError}
				backLabel="Clear Error"
				showBackButton={true}
			/>
		{:else if loading}
			<!-- Global Loading State -->
			<LoadingState 
				message="Loading staff members..."
				subMessage="Fetching your team information"
			/>
		{:else}
			<!-- Analytics Overview -->
			{#if teamMembers.length > 0}
				<UserMetrics 
					users={teamMembers}
					showDetailed={false}
				/>
			{/if}

			<!-- Selection Actions -->
			{#if hasSelectionDerived}
				<div class="selection-banner">
					<div class="selection-info">
						<strong>{selectionCount}</strong> staff member{selectionCount === 1 ? '' : 's'} selected
					</div>
					<div class="selection-actions">
						<button class="btn btn-ghost btn-sm" onclick={() => usersActions.clearSelection()}>
							Clear Selection
						</button>
						<button class="btn btn-secondary btn-sm" onclick={() => usersActions.openBulkModal('deactivate')}>
							Deactivate Selected
						</button>
					</div>
				</div>
			{/if}

			<!-- Staff Members Section -->
			<div class="content-section">
				<div class="content-header">
					<h3 class="content-title">Staff Accounts</h3>
					<p class="content-description">Manage your team members and their access permissions</p>
				</div>
				
				{#if teamMembers.length > 0}
					<div class="staff-grid">
						{#each teamMembers as member (member.id)}
							<UserCard
								user={member}
								selected={selectedUsers.includes(member.id)}
								onClick={handleUserClick}
								onSelect={handleUserSelect}
								onEdit={handleUserEdit}
								onDelete={handleUserDelete}
								showActions={true}
								showMetrics={false}
							/>
						{/each}
					</div>
				{:else}
					<EmptyState
						icon="👥"
						title="No staff members found"
						description="Add your first staff member to get started with team management"
						actionLabel="Add Staff Member"
						onAction={handleAddStaff}
					/>
				{/if}
			</div>

			<!-- Permissions Section -->
			<div class="content-section">
				<div class="content-header">
					<h3 class="content-title">Role-Based Permissions</h3>
					<p class="content-description">Configure what your staff members can access and modify</p>
				</div>
				
				<div class="permissions-overview">
					<div class="permission-card">
						<div class="permission-icon">🔐</div>
						<div class="permission-content">
							<h4>Access Control</h4>
							<p>Control what sections of your store staff can access</p>
						</div>
					</div>
					
					<div class="permission-card">
						<div class="permission-icon">✏️</div>
						<div class="permission-content">
							<h4>Edit Permissions</h4>
							<p>Define what staff can modify (products, orders, customers)</p>
						</div>
					</div>
					
					<div class="permission-card">
						<div class="permission-icon">📊</div>
						<div class="permission-content">
							<h4>Reports Access</h4>
							<p>Grant access to analytics and sensitive business data</p>
						</div>
					</div>
				</div>
				
				<div class="permissions-actions">
					<button class="btn btn-secondary" onclick={handleManagePermissions}>
						⚙️ Manage Permissions
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	/* Custom page description styling */
	.page-description {
		margin: var(--space-2) 0 0 0;
		color: var(--color-text-muted);
		font-size: var(--font-size-sm);
		padding: 0 var(--space-8);
	}
	
	/* Selection banner */
	.selection-banner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-4);
		background: var(--color-info-bg);
		border: 1px solid var(--color-info);
		border-radius: var(--radius-md);
		margin-bottom: var(--space-6);
	}
	
	.selection-info {
		color: var(--color-info-text);
		font-size: var(--font-size-sm);
	}
	
	.selection-actions {
		display: flex;
		gap: var(--space-2);
	}
	
	/* Staff grid */
	.staff-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: var(--space-6);
	}
	
	/* Permissions section */
	.permissions-overview {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: var(--space-4);
		margin-bottom: var(--space-6);
	}
	
	.permission-card {
		display: flex;
		align-items: center;
		gap: var(--space-4);
		padding: var(--space-4);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		transition: all var(--transition-fast);
	}
	
	.permission-card:hover {
		border-color: var(--color-border-hover);
		box-shadow: var(--shadow-sm);
	}
	
	.permission-icon {
		font-size: var(--font-size-2xl);
		flex-shrink: 0;
		opacity: 0.8;
	}
	
	.permission-content {
		flex: 1;
		min-width: 0;
	}
	
	.permission-content h4 {
		font-size: var(--font-size-base);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
		margin: 0 0 var(--space-1) 0;
	}
	
	.permission-content p {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
		margin: 0;
		line-height: var(--line-height-normal);
	}
	
	.permissions-actions {
		display: flex;
		justify-content: center;
		padding-top: var(--space-4);
		border-top: 1px solid var(--color-border-light);
	}
	
	/* Responsive adjustments */
	@media (max-width: 768px) {
		.page-description {
			padding: 0;
		}
		
		.selection-banner {
			flex-direction: column;
			gap: var(--space-3);
			align-items: stretch;
		}
		
		.selection-actions {
			justify-content: center;
		}
		
		.staff-grid {
			grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
			gap: var(--space-4);
		}
		
		.permissions-overview {
			grid-template-columns: 1fr;
		}
		
		.permission-card {
			flex-direction: column;
			text-align: center;
		}
	}
	
	@media (max-width: 480px) {
		.staff-grid {
			grid-template-columns: 1fr;
		}
		
		.selection-actions {
			flex-direction: column;
		}
	}
</style>