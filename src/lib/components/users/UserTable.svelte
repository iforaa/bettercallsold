<script lang="ts">
	import type { UserTableProps } from '$lib/types/users';
	
	let { 
		users,
		selectedUsers = [],
		sortBy = 'created_at',
		sortDirection = 'desc',
		loading = false,
		onUserClick,
		onUserSelect,
		onSort,
		onSelectAll,
		showActions = true,
		showSelection = true,
		className = ''
	}: UserTableProps = $props();
	
	function handleSort(field: string) {
		if (onSort) {
			const newDirection = sortBy === field && sortDirection === 'asc' ? 'desc' : 'asc';
			onSort(field, newDirection);
		}
	}
	
	function handleUserClick(user: any) {
		if (onUserClick) {
			onUserClick(user);
		}
	}
	
	function handleUserSelect(userId: string) {
		if (onUserSelect) {
			onUserSelect(userId);
		}
	}
	
	function handleSelectAll() {
		if (onSelectAll) {
			onSelectAll();
		}
	}
	
	function getSortIcon(field: string) {
		if (sortBy !== field) return '↕️';
		return sortDirection === 'asc' ? '↑' : '↓';
	}
	
	// Check if all visible users are selected
	let allSelected = $derived.by(() => {
		if (!users.length) return false;
		return users.every(user => selectedUsers.includes(user.id));
	});
</script>

<div class="table-container {className}">
	<table class="table">
		<thead>
			<tr>
				{#if showSelection}
					<th class="table-cell-checkbox">
						<input 
							type="checkbox" 
							class="table-checkbox"
							checked={allSelected}
							onchange={handleSelectAll}
							disabled={loading}
						/>
					</th>
				{/if}
				
				<th class="table-cell-main sortable" onclick={() => handleSort('name')}>
					<div class="sort-header">
						<span>User</span>
						<span class="sort-icon">{getSortIcon('name')}</span>
					</div>
				</th>
				
				<th class="sortable" onclick={() => handleSort('role')}>
					<div class="sort-header">
						<span>Role</span>
						<span class="sort-icon">{getSortIcon('role')}</span>
					</div>
				</th>
				
				<th class="sortable" onclick={() => handleSort('status')}>
					<div class="sort-header">
						<span>Status</span>
						<span class="sort-icon">{getSortIcon('status')}</span>
					</div>
				</th>
				
				<th class="sortable" onclick={() => handleSort('created_at')}>
					<div class="sort-header">
						<span>Joined</span>
						<span class="sort-icon">{getSortIcon('created_at')}</span>
					</div>
				</th>
				
				<th class="sortable" onclick={() => handleSort('last_login_at')}>
					<div class="sort-header">
						<span>Last Login</span>
						<span class="sort-icon">{getSortIcon('last_login_at')}</span>
					</div>
				</th>
				
				{#if showActions}
					<th>Actions</th>
				{/if}
			</tr>
		</thead>
		<tbody>
			{#if loading}
				<!-- Loading skeleton rows -->
				{#each Array(5) as _, i}
					<tr class="table-row-loading">
						{#if showSelection}
							<td class="table-cell-checkbox">
								<div class="skeleton skeleton-checkbox"></div>
							</td>
						{/if}
						<td class="table-cell-main">
							<div class="table-cell-content">
								<div class="table-cell-media">
									<div class="skeleton skeleton-avatar"></div>
								</div>
								<div class="table-cell-details">
									<div class="skeleton skeleton-text skeleton-text-lg"></div>
									<div class="skeleton skeleton-text skeleton-text-sm"></div>
								</div>
							</div>
						</td>
						<td><div class="skeleton skeleton-badge"></div></td>
						<td><div class="skeleton skeleton-badge"></div></td>
						<td><div class="skeleton skeleton-text"></div></td>
						<td><div class="skeleton skeleton-text"></div></td>
						{#if showActions}
							<td>
								<div class="skeleton skeleton-button"></div>
							</td>
						{/if}
					</tr>
				{/each}
			{:else if users.length === 0}
				<tr class="table-row-empty">
					<td colspan={showSelection ? (showActions ? 7 : 6) : (showActions ? 6 : 5)}>
						<div class="table-empty-state">
							<div class="empty-icon">👥</div>
							<p>No users found</p>
						</div>
					</td>
				</tr>
			{:else}
				{#each users as user (user.id)}
					<tr 
						class="table-row table-row-clickable" 
						class:table-row-selected={selectedUsers.includes(user.id)}
						onclick={() => handleUserClick(user)}
					>
						{#if showSelection}
							<td class="table-cell-checkbox" onclick={(e) => e.stopPropagation()}>
								<input 
									type="checkbox" 
									class="table-checkbox"
									checked={selectedUsers.includes(user.id)}
									onchange={() => handleUserSelect(user.id)}
								/>
							</td>
						{/if}
						
						<td class="table-cell-main">
							<div class="table-cell-content">
								<div class="table-cell-media">
									<div class="user-avatar" style="background-color: {user.avatarColor}">
										{#if user.avatar_url}
											<img src={user.avatar_url} alt={user.displayName} />
										{:else}
											<span class="avatar-initials">{user.initials}</span>
										{/if}
									</div>
								</div>
								<div class="table-cell-details">
									<span class="table-cell-title">{user.displayName}</span>
									<span class="table-cell-subtitle">{user.displayEmail}</span>
								</div>
							</div>
						</td>
						
						<td>
							<div class="role-badge {user.roleInfo.class}">
								<span class="role-icon">{user.roleInfo.icon}</span>
								<span class="role-text">{user.roleInfo.text}</span>
							</div>
						</td>
						
						<td>
							<span class="badge badge-{user.statusInfo.color}">
								{user.statusInfo.text}
							</span>
						</td>
						
						<td>
							<span class="table-cell-text">{user.formattedCreatedAt}</span>
						</td>
						
						<td>
							<span class="table-cell-text">
								{user.formattedLastLoginAt || 'Never'}
							</span>
						</td>
						
						{#if showActions}
							<td onclick={(e) => e.stopPropagation()}>
								<div class="table-actions">
									{#if user.canEdit}
										<button 
											class="btn btn-ghost btn-sm"
											onclick={() => console.log('Edit user', user)}
											title="Edit user"
										>
											✏️
										</button>
									{/if}
									
									{#if user.canDelete}
										<button 
											class="btn btn-ghost btn-sm btn-danger"
											onclick={() => console.log('Delete user', user)}
											title="Delete user"
										>
											🗑️
										</button>
									{/if}
								</div>
							</td>
						{/if}
					</tr>
				{/each}
			{/if}
		</tbody>
	</table>
</div>

<style>
	.table-container {
		width: 100%;
		overflow-x: auto;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
	}
	
	.table {
		width: 100%;
		border-collapse: separate;
		border-spacing: 0;
	}
	
	.table th {
		background: var(--color-surface-hover);
		padding: var(--space-3);
		text-align: left;
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
		border-bottom: 1px solid var(--color-border);
		font-size: var(--font-size-sm);
		white-space: nowrap;
	}
	
	.table th:first-child {
		border-top-left-radius: var(--radius-lg);
	}
	
	.table th:last-child {
		border-top-right-radius: var(--radius-lg);
	}
	
	.table td {
		padding: var(--space-3);
		border-bottom: 1px solid var(--color-border-light);
		vertical-align: middle;
	}
	
	.table-row:last-child td {
		border-bottom: none;
	}
	
	.table-row:last-child td:first-child {
		border-bottom-left-radius: var(--radius-lg);
	}
	
	.table-row:last-child td:last-child {
		border-bottom-right-radius: var(--radius-lg);
	}
	
	/* Sortable headers */
	.sortable {
		cursor: pointer;
		user-select: none;
		transition: background var(--transition-fast);
	}
	
	.sortable:hover {
		background: var(--color-surface-secondary);
	}
	
	.sort-header {
		display: flex;
		align-items: center;
		gap: var(--space-1);
	}
	
	.sort-icon {
		font-size: var(--font-size-xs);
		opacity: 0.6;
	}
	
	/* Row states */
	.table-row-clickable {
		cursor: pointer;
		transition: background var(--transition-fast);
	}
	
	.table-row-clickable:hover {
		background: var(--color-surface-hover);
	}
	
	.table-row-selected {
		background: var(--color-primary-bg);
	}
	
	.table-row-loading {
		pointer-events: none;
	}
	
	.table-row-empty {
		pointer-events: none;
	}
	
	/* Cell types */
	.table-cell-checkbox {
		width: 40px;
		text-align: center;
	}
	
	.table-cell-main {
		min-width: 200px;
	}
	
	.table-cell-content {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}
	
	.table-cell-media {
		flex-shrink: 0;
	}
	
	.user-avatar {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
	}
	
	.user-avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	
	.avatar-initials {
		color: white;
		font-weight: var(--font-weight-semibold);
		font-size: var(--font-size-sm);
	}
	
	.table-cell-details {
		flex: 1;
		min-width: 0;
	}
	
	.table-cell-title {
		display: block;
		font-weight: var(--font-weight-medium);
		color: var(--color-text);
		font-size: var(--font-size-sm);
		margin-bottom: var(--space-1);
		word-break: break-word;
	}
	
	.table-cell-subtitle {
		display: block;
		color: var(--color-text-muted);
		font-size: var(--font-size-xs);
		word-break: break-word;
	}
	
	.table-cell-text {
		font-size: var(--font-size-sm);
		color: var(--color-text);
	}
	
	/* Role badge */
	.role-badge {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius-full);
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-medium);
	}
	
	.role-badge.admin-role {
		background: var(--color-error-bg);
		color: var(--color-error-text);
	}
	
	.role-badge.staff-role {
		background: var(--color-info-bg);
		color: var(--color-info-text);
	}
	
	.role-badge.manager-role {
		background: var(--color-warning-bg);
		color: var(--color-warning-text);
	}
	
	.role-badge.customer-role {
		background: var(--color-success-bg);
		color: var(--color-success-text);
	}
	
	.role-badge.guest-role {
		background: var(--color-surface-hover);
		color: var(--color-text-muted);
	}
	
	.role-icon {
		font-size: var(--font-size-xs);
	}
	
	/* Actions */
	.table-actions {
		display: flex;
		gap: var(--space-1);
	}
	
	.table-actions .btn {
		padding: var(--space-1);
		min-width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	
	.btn-danger:hover {
		background: var(--color-error-bg);
		color: var(--color-error-text);
		border-color: var(--color-error);
	}
	
	/* Empty state */
	.table-empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: var(--space-8);
		text-align: center;
	}
	
	.empty-icon {
		font-size: var(--font-size-3xl);
		margin-bottom: var(--space-4);
		opacity: 0.6;
	}
	
	.table-empty-state p {
		color: var(--color-text-muted);
		margin: 0;
	}
	
	/* Loading skeletons */
	.skeleton {
		background: var(--color-surface-hover);
		border-radius: var(--radius-sm);
		animation: pulse 2s infinite;
	}
	
	.skeleton-checkbox {
		width: 16px;
		height: 16px;
	}
	
	.skeleton-avatar {
		width: 40px;
		height: 40px;
		border-radius: 50%;
	}
	
	.skeleton-text {
		height: 16px;
	}
	
	.skeleton-text-lg {
		height: 18px;
		width: 120px;
		margin-bottom: var(--space-1);
	}
	
	.skeleton-text-sm {
		height: 14px;
		width: 80px;
	}
	
	.skeleton-badge {
		height: 20px;
		width: 60px;
		border-radius: var(--radius-full);
	}
	
	.skeleton-button {
		height: 32px;
		width: 60px;
	}
	
	@keyframes pulse {
		0%, 100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}
	
	/* Responsive adjustments */
	@media (max-width: 768px) {
		.table {
			min-width: 700px;
		}
		
		.table th,
		.table td {
			padding: var(--space-2);
		}
		
		.user-avatar {
			width: 32px;
			height: 32px;
		}
		
		.avatar-initials {
			font-size: var(--font-size-xs);
		}
		
		.table-cell-title {
			font-size: var(--font-size-xs);
		}
		
		.table-cell-subtitle {
			font-size: var(--font-size-2xs);
		}
		
		.table-actions .btn {
			min-width: 28px;
			height: 28px;
		}
	}
</style>