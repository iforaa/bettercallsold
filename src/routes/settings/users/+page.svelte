<script lang="ts">
	import { browser } from '$app/environment';
	import { 
		usersState, 
		usersActions, 
		getFilteredTeamMembers,
		hasSelection,
		getSelectionCount
	} from '$lib/state/users.svelte.js';
	
	// Components
	import LoadingState from '$lib/components/states/LoadingState.svelte';
	import ErrorState from '$lib/components/states/ErrorState.svelte';
	import EmptyState from '$lib/components/states/EmptyState.svelte';
	import UserCard from '$lib/components/users/UserCard.svelte';
	
	// Reactive state from global store
	let loading = $derived(usersState.teamLoading);
	let error = $derived(usersState.teamError);
	let teamMembers = $derived(getFilteredTeamMembers());
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
	function handleUserClick(user: any) {
		console.log('View user details:', user);
		// TODO: Navigate to user details or open modal
	}
	
	function handleUserEdit(user: any) {
		editingUser = user;
		staffForm = {
			name: user.name || user.displayName || '',
			email: user.email || user.displayEmail || '',
			role: user.role || 'staff',
			phone: user.phone || ''
		};
		formErrors = [];
		showEditStaffModal = true;
	}
	
	function handleUserDelete(user: any) {
		if (user.role === 'admin') {
			return; // Prevent admin deletion
		}
		deletingUser = user;
		showDeleteModal = true;
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
	
	
	// Modal states
	let showAddStaffModal = $state(false);
	let showEditStaffModal = $state(false);
	let showDeleteModal = $state(false);
	
	// Form state
	let staffForm = $state({
		name: '',
		email: '',
		role: 'staff',
		phone: ''
	});
	let editingUser = $state(null);
	let deletingUser = $state(null);
	let formErrors = $state([]);
	let isCreating = $state(false);
	let isEditing = $state(false);
	let isDeleting = $state(false);
	
	// Updated add staff handler
	function handleAddStaff() {
		showAddStaffModal = true;
		staffForm = {
			name: '',
			email: '',
			role: 'staff', 
			phone: ''
		};
		formErrors = [];
	}
	
	function closeAddStaffModal() {
		showAddStaffModal = false;
		formErrors = [];
	}
	
	function closeEditStaffModal() {
		showEditStaffModal = false;
		editingUser = null;
		formErrors = [];
	}
	
	function closeDeleteModal() {
		showDeleteModal = false;
		deletingUser = null;
	}
	
	async function submitAddStaff() {
		if (isCreating) return;
		
		// Basic validation
		if (!staffForm.name.trim() || !staffForm.email.trim()) {
			formErrors = ['Name and email are required'];
			return;
		}
		
		isCreating = true;
		formErrors = [];
		
		try {
			const newStaff = await usersActions.addTeamMember(staffForm);
			if (newStaff) {
				closeAddStaffModal();
				// Refresh the team members list
				usersActions.refreshTeam();
			}
		} catch (error) {
			formErrors = [error.message];
		} finally {
			isCreating = false;
		}
	}
	
	async function submitEditStaff() {
		if (isEditing || !editingUser) return;
		
		// Basic validation
		if (!staffForm.name.trim() || !staffForm.email.trim()) {
			formErrors = ['Name and email are required'];
			return;
		}
		
		isEditing = true;
		formErrors = [];
		
		try {
			const updatedStaff = await usersActions.updateUser(editingUser.id, staffForm);
			if (updatedStaff) {
				closeEditStaffModal();
				// Refresh the team members list
				usersActions.refreshTeam();
			}
		} catch (error) {
			formErrors = [error.message];
		} finally {
			isEditing = false;
		}
	}
	
	async function confirmDeleteStaff() {
		if (isDeleting || !deletingUser) return;
		
		isDeleting = true;
		
		try {
			const success = await usersActions.deleteUser(deletingUser.id);
			if (success) {
				closeDeleteModal();
				// Refresh the team members list
				usersActions.refreshTeam();
			}
		} catch (error) {
			console.error('Delete failed:', error);
			// Could show error toast here
		} finally {
			isDeleting = false;
		}
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

	<div class="page-content-padded">
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
					<div class="content-header-main">
						<h3 class="content-title">Staff Accounts</h3>
						<p class="content-description">Manage your team members and their access permissions</p>
					</div>
				</div>
				
				{#if teamMembers.length > 0}
					<!-- Staff Summary Stats -->
					<div class="staff-summary">
						<div class="staff-stat">
							<div class="stat-value">{teamMembers.length}</div>
							<div class="stat-label">Total Staff</div>
						</div>
						<div class="staff-stat">
							<div class="stat-value">{teamMembers.filter(m => m.role === 'admin').length}</div>
							<div class="stat-label">Admins</div>
						</div>
						<div class="staff-stat">
							<div class="stat-value">{teamMembers.filter(m => m.status === 'active').length}</div>
							<div class="stat-label">Active</div>
						</div>
						<div class="staff-stat">
							<div class="stat-value">{teamMembers.filter(m => m.status === 'pending').length}</div>
							<div class="stat-label">Pending</div>
						</div>
					</div>

					<!-- Staff Table -->
					<div class="table-container">
						<table class="data-table">
							<thead>
								<tr>
									<th>
										<input 
											type="checkbox" 
											checked={usersState.selectAll}
											onchange={() => usersActions.selectAllUsers()}
										/>
									</th>
									<th>Staff Member</th>
									<th>Role</th>
									<th>Status</th>
									<th>Added</th>
									<th class="actions-header">Actions</th>
								</tr>
							</thead>
							<tbody>
								{#each teamMembers as member (member.id)}
									<tr class="table-row">
										<td>
											<input 
												type="checkbox" 
												checked={selectedUsers.includes(member.id)}
												onchange={() => handleUserSelect(member.id)}
											/>
										</td>
										<td>
											<div class="user-cell">
												<div class="user-avatar" style="background-color: {member.avatarColor}">
													{member.initials}
												</div>
												<div class="user-info">
													<div class="user-name">{member.displayName}</div>
													<div class="user-email">{member.displayEmail}</div>
												</div>
											</div>
										</td>
										<td>
											<div class="role-cell">
												<span class="role-badge role-{member.role}">
													{member.roleInfo?.icon} {member.roleInfo?.text}
												</span>
											</div>
										</td>
										<td>
											<span class="status-badge status-{member.status}">
												{member.statusInfo?.text}
											</span>
										</td>
										<td class="date-cell">{member.formattedCreatedAt}</td>
										<td>
											<div class="table-actions">
												<button 
													class="btn btn-ghost btn-sm" 
													onclick={() => handleUserEdit(member)}
													title="Edit user"
												>
													✏️
												</button>
												{#if member.role !== 'admin'}
													<button 
														class="btn btn-ghost btn-sm btn-danger" 
														onclick={() => handleUserDelete(member)}
														title="Remove user"
													>
														🗑️
													</button>
												{/if}
											</div>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{:else}
					<EmptyState
						icon="👥"
						title="No staff members found"
						description="Add your first staff member to get started with team management"
						actionLabel="Add Staff"
						onAction={handleAddStaff}
					/>
				{/if}
			</div>
		{/if}
	</div>
</div>

<!-- Add Staff Modal -->
{#if showAddStaffModal}
	<div class="modal-overlay" onclick={closeAddStaffModal}>
		<div class="modal-content" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h3>Add Staff</h3>
				<button class="modal-close" onclick={closeAddStaffModal}>×</button>
			</div>
			
			<div class="modal-body">
				{#if formErrors.length > 0}
					<div class="form-errors">
						{#each formErrors as error}
							<div class="error-message">{error}</div>
						{/each}
					</div>
				{/if}
				
				<form onsubmit={(e) => { e.preventDefault(); submitAddStaff(); }}>
					<div class="form-group">
						<label for="staff-name">Full Name *</label>
						<input 
							id="staff-name"
							type="text" 
							bind:value={staffForm.name}
							placeholder="Enter full name"
							required
							disabled={isCreating}
						/>
					</div>
					
					<div class="form-group">
						<label for="staff-email">Email Address *</label>
						<input 
							id="staff-email"
							type="email" 
							bind:value={staffForm.email}
							placeholder="Enter email address"
							required
							disabled={isCreating}
						/>
					</div>
					
					<div class="form-group">
						<label for="staff-role">Role</label>
						<select 
							id="staff-role"
							bind:value={staffForm.role}
							disabled={isCreating}
						>
							<option value="staff">Staff Member</option>
							<option value="manager">Manager</option>
							<option value="admin">Store Owner</option>
						</select>
					</div>
					
					<div class="form-group">
						<label for="staff-phone">Phone Number</label>
						<input 
							id="staff-phone"
							type="tel" 
							bind:value={staffForm.phone}
							placeholder="Enter phone number (optional)"
							disabled={isCreating}
						/>
					</div>
					
					<div class="modal-actions">
						<button 
							type="button" 
							class="btn btn-secondary" 
							onclick={closeAddStaffModal}
							disabled={isCreating}
						>
							Cancel
						</button>
						<button 
							type="submit" 
							class="btn btn-primary"
							disabled={isCreating}
						>
							{#if isCreating}
								Adding...
							{:else}
								Add Staff
							{/if}
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}

<!-- Edit Staff Modal -->
{#if showEditStaffModal && editingUser}
	<div class="modal-overlay" onclick={closeEditStaffModal}>
		<div class="modal-content" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h3>Edit Staff Member</h3>
				<button class="modal-close" onclick={closeEditStaffModal}>×</button>
			</div>
			
			<div class="modal-body">
				{#if formErrors.length > 0}
					<div class="form-errors">
						{#each formErrors as error}
							<div class="error-message">{error}</div>
						{/each}
					</div>
				{/if}
				
				<form onsubmit={(e) => { e.preventDefault(); submitEditStaff(); }}>
					<div class="form-group">
						<label for="edit-staff-name">Full Name *</label>
						<input 
							id="edit-staff-name"
							type="text" 
							bind:value={staffForm.name}
							placeholder="Enter full name"
							required
							disabled={isEditing}
						/>
					</div>
					
					<div class="form-group">
						<label for="edit-staff-email">Email Address *</label>
						<input 
							id="edit-staff-email"
							type="email" 
							bind:value={staffForm.email}
							placeholder="Enter email address"
							required
							disabled={isEditing}
						/>
					</div>
					
					<div class="form-group">
						<label for="edit-staff-role">Role</label>
						<select 
							id="edit-staff-role"
							bind:value={staffForm.role}
							disabled={isEditing}
						>
							<option value="staff">Staff Member</option>
							<option value="manager">Manager</option>
							<option value="admin">Store Owner</option>
						</select>
					</div>
					
					<div class="form-group">
						<label for="edit-staff-phone">Phone Number</label>
						<input 
							id="edit-staff-phone"
							type="tel" 
							bind:value={staffForm.phone}
							placeholder="Enter phone number (optional)"
							disabled={isEditing}
						/>
					</div>
					
					<div class="modal-actions">
						<button 
							type="button" 
							class="btn btn-secondary" 
							onclick={closeEditStaffModal}
							disabled={isEditing}
						>
							Cancel
						</button>
						<button 
							type="submit" 
							class="btn btn-primary"
							disabled={isEditing}
						>
							{#if isEditing}
								Saving...
							{:else}
								Save Changes
							{/if}
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}

<!-- Delete Confirmation Modal -->
{#if showDeleteModal && deletingUser}
	<div class="modal-overlay" onclick={closeDeleteModal}>
		<div class="modal-content modal-small" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h3>Confirm Deletion</h3>
				<button class="modal-close" onclick={closeDeleteModal}>×</button>
			</div>
			
			<div class="modal-body">
				<div class="delete-confirmation">
					<div class="warning-icon">⚠️</div>
					<p><strong>Are you sure you want to remove this staff member?</strong></p>
					<p>This will permanently remove <strong>{deletingUser.displayName}</strong> from your team.</p>
					<p class="warning-text">This action cannot be undone.</p>
				</div>
				
				<div class="modal-actions">
					<button 
						type="button" 
						class="btn btn-secondary" 
						onclick={closeDeleteModal}
						disabled={isDeleting}
					>
						Cancel
					</button>
					<button 
						type="button" 
						class="btn btn-danger"
						onclick={confirmDeleteStaff}
						disabled={isDeleting}
					>
						{#if isDeleting}
							Removing...
						{:else}
							Remove Staff Member
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

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
	
	/* Content header improvements */
	.content-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-4);
		margin-bottom: var(--space-6);
	}
	
	.content-header-main {
		flex: 1;
	}
	
	.content-header-actions {
		flex-shrink: 0;
	}
	
	/* Staff summary stats */
	.staff-summary {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
		gap: var(--space-4);
		margin-bottom: var(--space-6);
		padding: var(--space-4);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
	}
	
	.staff-stat {
		text-align: center;
		padding: var(--space-2);
	}
	
	.stat-value {
		font-size: var(--font-size-2xl);
		font-weight: var(--font-weight-bold);
		color: var(--color-text);
		margin-bottom: var(--space-1);
	}
	
	.stat-label {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}
	
	/* User cell styling */
	.user-cell {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}
	
	.user-avatar {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		font-weight: var(--font-weight-semibold);
		font-size: var(--font-size-sm);
		flex-shrink: 0;
	}
	
	.user-info {
		flex: 1;
		min-width: 0;
	}
	
	.user-name {
		font-weight: var(--font-weight-medium);
		color: var(--color-text);
		margin-bottom: var(--space-1);
	}
	
	.user-email {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
	}
	
	/* Role badges */
	.role-cell {
		text-align: center;
	}
	
	.role-badge {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius-sm);
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-medium);
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}
	
	.role-admin {
		background: var(--color-error-bg);
		color: var(--color-error-text);
	}
	
	.role-staff {
		background: var(--color-info-bg);
		color: var(--color-info-text);
	}
	
	.role-manager {
		background: var(--color-warning-bg);
		color: var(--color-warning-text);
	}
	
	/* Date cell */
	.date-cell {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
	}
	
	/* Table actions */
	.table-actions {
		display: flex;
		gap: var(--space-1);
		justify-content: center;
	}
	
	.actions-header {
		text-align: center;
		width: 100px;
	}
	
	/* Button improvements */
	.btn-icon {
		margin-right: var(--space-1);
		font-weight: var(--font-weight-bold);
	}
	
	/* Modal styles */
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
		padding: var(--space-4);
	}
	
	.modal-content {
		background: #ffffff;
		border-radius: var(--radius-lg);
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
		width: 100%;
		max-width: 500px;
		max-height: 90vh;
		overflow: hidden;
		position: relative;
		z-index: 1001;
	}
	
	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-6);
		border-bottom: 1px solid var(--color-border);
	}
	
	.modal-header h3 {
		font-size: var(--font-size-lg);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
		margin: 0;
	}
	
	.modal-close {
		background: none;
		border: none;
		font-size: var(--font-size-2xl);
		color: var(--color-text-muted);
		cursor: pointer;
		padding: var(--space-1);
		line-height: 1;
		transition: color var(--transition-fast);
	}
	
	.modal-close:hover {
		color: var(--color-text);
	}
	
	.modal-body {
		padding: var(--space-6);
		overflow-y: auto;
		max-height: calc(90vh - 140px);
	}
	
	.form-errors {
		background: var(--color-error-bg);
		border: 1px solid var(--color-error);
		border-radius: var(--radius-md);
		padding: var(--space-3);
		margin-bottom: var(--space-4);
	}
	
	.error-message {
		color: var(--color-error-text);
		font-size: var(--font-size-sm);
	}
	
	.form-group {
		margin-bottom: var(--space-4);
	}
	
	.form-group label {
		display: block;
		font-weight: var(--font-weight-medium);
		color: var(--color-text);
		margin-bottom: var(--space-2);
		font-size: var(--font-size-sm);
	}
	
	.form-group input,
	.form-group select {
		width: 100%;
		padding: var(--space-3);
		border: 1px solid #d1d5db;
		border-radius: var(--radius-md);
		font-size: var(--font-size-base);
		background: #ffffff;
		color: #374151;
		transition: border-color var(--transition-fast);
	}
	
	.form-group input:focus,
	.form-group select:focus {
		outline: none;
		border-color: var(--color-accent);
		box-shadow: 0 0 0 2px rgba(0, 91, 211, 0.1);
	}
	
	.form-group input:disabled,
	.form-group select:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
	
	.modal-actions {
		display: flex;
		gap: var(--space-3);
		justify-content: flex-end;
		margin-top: var(--space-6);
		padding-top: var(--space-4);
		border-top: 1px solid var(--color-border-light);
	}
	
	/* Delete confirmation modal */
	.modal-small {
		max-width: 400px;
	}
	
	.delete-confirmation {
		text-align: center;
		padding: var(--space-2) 0;
	}
	
	.warning-icon {
		font-size: var(--font-size-4xl);
		margin-bottom: var(--space-4);
	}
	
	.delete-confirmation p {
		margin-bottom: var(--space-3);
		color: var(--color-text);
		line-height: var(--line-height-relaxed);
	}
	
	.warning-text {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
		font-style: italic;
	}
	
	/* Danger button */
	.btn-danger {
		background: var(--color-error);
		color: white;
		border: 1px solid var(--color-error);
	}
	
	.btn-danger:hover:not(:disabled) {
		background: var(--color-error);
		opacity: 0.9;
	}
	
	.btn-danger:disabled {
		opacity: 0.6;
		cursor: not-allowed;
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