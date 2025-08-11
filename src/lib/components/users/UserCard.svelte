<script lang="ts">
	import type { UserCardProps } from '$lib/types/users';
	
	let { 
		user,
		selected = false,
		showActions = true,
		showMetrics = false,
		compact = false,
		onClick,
		onSelect,
		onEdit,
		onDelete,
		className = ''
	}: UserCardProps = $props();
	
	function handleCardClick() {
		if (onClick) {
			onClick(user);
		}
	}
	
	function handleSelect(e: Event) {
		e.stopPropagation();
		if (onSelect) {
			onSelect(user.id);
		}
	}
	
	function handleEdit(e: Event) {
		e.stopPropagation();
		if (onEdit) {
			onEdit(user);
		}
	}
	
	function handleDelete(e: Event) {
		e.stopPropagation();
		if (onDelete) {
			onDelete(user);
		}
	}
</script>

<div 
	class="user-card {className}"
	class:user-card-compact={compact}
	class:user-card-clickable={!!onClick}
	class:user-card-selected={selected}
	onclick={handleCardClick}
	role={onClick ? 'button' : undefined}
	tabindex={onClick ? 0 : undefined}
>
	<!-- Selection checkbox -->
	{#if onSelect}
		<div class="user-card-select" onclick={(e) => e.stopPropagation()}>
			<input 
				type="checkbox" 
				class="table-checkbox"
				checked={selected}
				onchange={handleSelect}
			/>
		</div>
	{/if}
	
	<!-- User avatar and info -->
	<div class="user-card-header">
		<div class="user-avatar" style="background-color: {user.avatarColor}">
			{#if user.avatar_url}
				<img src={user.avatar_url} alt={user.displayName} />
			{:else}
				<span class="avatar-initials">{user.initials}</span>
			{/if}
		</div>
		
		<div class="user-info">
			<h3 class="user-name">{user.displayName}</h3>
			<p class="user-email">{user.displayEmail}</p>
			{#if !compact && user.phone}
				<p class="user-phone">{user.phone}</p>
			{/if}
		</div>
	</div>
	
	<!-- User details -->
	<div class="user-card-body">
		<div class="user-badges">
			<div class="role-badge {user.roleInfo.class}">
				<span class="role-icon">{user.roleInfo.icon}</span>
				<span class="role-text">{user.roleInfo.text}</span>
			</div>
			
			<div class="status-badge badge-{user.statusInfo.color}">
				{user.statusInfo.text}
			</div>
		</div>
		
		{#if !compact}
			<div class="user-meta">
				<div class="meta-item">
					<span class="meta-label">Joined:</span>
					<span class="meta-value">{user.formattedCreatedAt}</span>
				</div>
				
				{#if user.formattedLastLoginAt}
					<div class="meta-item">
						<span class="meta-label">Last login:</span>
						<span class="meta-value">{user.formattedLastLoginAt}</span>
					</div>
				{/if}
				
				{#if showMetrics && user.tenant_id}
					<div class="meta-item">
						<span class="meta-label">Tenant:</span>
						<span class="meta-value tenant-id">{user.tenant_id.slice(0, 8)}...</span>
					</div>
				{/if}
			</div>
		{/if}
	</div>
	
	<!-- Actions -->
	{#if showActions && (onEdit || onDelete)}
		<div class="user-card-actions">
			{#if onEdit && user.canEdit}
				<button 
					class="btn btn-ghost btn-sm"
					onclick={handleEdit}
					title="Edit user"
				>
					✏️ Edit
				</button>
			{/if}
			
			{#if onDelete && user.canDelete}
				<button 
					class="btn btn-ghost btn-sm btn-danger"
					onclick={handleDelete}
					title="Delete user"
				>
					🗑️ Delete
				</button>
			{/if}
		</div>
	{/if}
</div>

<style>
	.user-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: var(--space-4);
		transition: all var(--transition-fast);
		position: relative;
	}
	
	.user-card:hover {
		border-color: var(--color-border-hover);
		box-shadow: var(--shadow-sm);
	}
	
	.user-card-clickable {
		cursor: pointer;
	}
	
	.user-card-clickable:hover {
		transform: translateY(-1px);
		box-shadow: var(--shadow-md);
	}
	
	.user-card-selected {
		border-color: var(--color-primary);
		box-shadow: 0 0 0 1px var(--color-primary-light);
	}
	
	.user-card-compact {
		padding: var(--space-3);
	}
	
	.user-card-select {
		position: absolute;
		top: var(--space-3);
		right: var(--space-3);
	}
	
	/* Header */
	.user-card-header {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		margin-bottom: var(--space-4);
	}
	
	.user-avatar {
		width: 50px;
		height: 50px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		flex-shrink: 0;
	}
	
	.user-card-compact .user-avatar {
		width: 40px;
		height: 40px;
	}
	
	.user-avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	
	.avatar-initials {
		color: white;
		font-weight: var(--font-weight-semibold);
		font-size: var(--font-size-lg);
	}
	
	.user-card-compact .avatar-initials {
		font-size: var(--font-size-base);
	}
	
	.user-info {
		flex: 1;
		min-width: 0;
	}
	
	.user-name {
		font-size: var(--font-size-base);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
		margin: 0 0 var(--space-1) 0;
		word-break: break-word;
	}
	
	.user-card-compact .user-name {
		font-size: var(--font-size-sm);
	}
	
	.user-email {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
		margin: 0 0 var(--space-1) 0;
		word-break: break-word;
	}
	
	.user-card-compact .user-email {
		font-size: var(--font-size-xs);
	}
	
	.user-phone {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		margin: 0;
	}
	
	/* Body */
	.user-card-body {
		margin-bottom: var(--space-4);
	}
	
	.user-card-compact .user-card-body {
		margin-bottom: var(--space-3);
	}
	
	.user-badges {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		margin-bottom: var(--space-3);
	}
	
	.user-card-compact .user-badges {
		margin-bottom: var(--space-2);
	}
	
	.role-badge {
		display: flex;
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
	
	.status-badge {
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius-full);
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-medium);
	}
	
	/* Meta information */
	.user-meta {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}
	
	.meta-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: var(--font-size-xs);
	}
	
	.meta-label {
		color: var(--color-text-muted);
		font-weight: var(--font-weight-medium);
	}
	
	.meta-value {
		color: var(--color-text);
		font-weight: var(--font-weight-medium);
	}
	
	.tenant-id {
		font-family: var(--font-mono);
		background: var(--color-surface-hover);
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius-sm);
		font-size: var(--font-size-xs);
	}
	
	/* Actions */
	.user-card-actions {
		display: flex;
		gap: var(--space-2);
		border-top: 1px solid var(--color-border-light);
		padding-top: var(--space-3);
	}
	
	.user-card-compact .user-card-actions {
		padding-top: var(--space-2);
	}
	
	.user-card-actions .btn {
		flex: 1;
		justify-content: center;
	}
	
	.btn-danger:hover {
		background: var(--color-error-bg);
		color: var(--color-error-text);
		border-color: var(--color-error);
	}
	
	/* Responsive adjustments */
	@media (max-width: 768px) {
		.user-card {
			padding: var(--space-3);
		}
		
		.user-card-header {
			margin-bottom: var(--space-3);
		}
		
		.user-avatar {
			width: 40px;
			height: 40px;
		}
		
		.avatar-initials {
			font-size: var(--font-size-base);
		}
		
		.user-name {
			font-size: var(--font-size-sm);
		}
		
		.user-email {
			font-size: var(--font-size-xs);
		}
		
		.user-card-actions {
			flex-direction: column;
		}
		
		.user-card-actions .btn {
			width: 100%;
		}
	}
</style>