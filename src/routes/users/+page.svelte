<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	
	let users = $derived(data.users);
	let error = $derived(data.error);
	
	function getRoleColor(role: string) {
		switch(role) {
			case 'admin': return 'admin-role';
			case 'customer': return 'customer-role';
			default: return 'default-role';
		}
	}
	
	function getInitials(name: string) {
		return name.split(' ').map(n => n[0]).join('').toUpperCase();
	}
</script>

<svelte:head>
	<title>Users - BetterCallSold</title>
</svelte:head>

<nav class="breadcrumb">
	<a href="/">← Dashboard</a>
</nav>

<div class="page-header">
	<div class="header-content">
		<h1>Users</h1>
		<p>Manage users across all tenant stores</p>
	</div>
	<button class="btn-primary" onclick={() => alert('Add user coming soon!')}>
		+ Add User
	</button>
</div>

{#if error}
	<div class="error">
		<p>{error}</p>
	</div>
{:else if users && users.length > 0}
	<div class="users-grid">
		{#each users as user}
			<div class="user-card">
				<div class="user-avatar">
					<div class="avatar-circle">
						{getInitials(user.name)}
					</div>
					<div class="user-info">
						<h3>{user.name}</h3>
						<p class="email">{user.email}</p>
					</div>
				</div>
				
				<div class="user-details">
					<div class="role-badge {getRoleColor(user.role)}">
						{user.role}
					</div>
					
					<div class="user-meta">
						<p class="tenant-info">
							<strong>Tenant ID:</strong> 
							<span class="tenant-id">{user.tenant_id.slice(0, 8)}...</span>
						</p>
					</div>
				</div>

				<div class="user-actions">
					<button class="btn-secondary" onclick={() => alert('Edit user coming soon!')}>
						Edit
					</button>
					<a href="/users/{user.id}" class="btn-primary">
						View Details
					</a>
				</div>
			</div>
		{/each}
	</div>
	
	<div class="summary">
		<div class="summary-stats">
			<div class="stat">
				<span class="stat-number">{users.length}</span>
				<span class="stat-label">Total Users</span>
			</div>
			<div class="stat">
				<span class="stat-number">{users.filter((u: any) => u.role === 'admin').length}</span>
				<span class="stat-label">Admins</span>
			</div>
			<div class="stat">
				<span class="stat-number">{users.filter((u: any) => u.role === 'customer').length}</span>
				<span class="stat-label">Customers</span>
			</div>
		</div>
	</div>
{:else}
	<div class="empty-state">
		<div class="empty-icon">👥</div>
		<h3>No users found</h3>
		<p>Start by adding your first user to the system.</p>
		<button class="btn-primary" onclick={() => alert('Add user coming soon!')}>
			Add First User
		</button>
	</div>
{/if}

<style>
	.breadcrumb {
		margin-bottom: 1rem;
	}
	
	.breadcrumb a {
		text-decoration: none;
		color: #1e40af;
		font-size: 0.9rem;
	}

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid #e5e7eb;
	}

	.header-content h1 {
		margin: 0 0 0.5rem 0;
	}

	.header-content p {
		margin: 0;
		color: #6b7280;
	}

	.error {
		background: #fee;
		border: 1px solid #fcc;
		padding: 1rem;
		border-radius: 8px;
		color: #c33;
		margin: 1rem 0;
	}

	.users-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1.5rem;
		margin-bottom: 2rem;
	}
	
	.user-card {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 12px;
		padding: 1.5rem;
		box-shadow: 0 1px 3px rgba(0,0,0,0.1);
		transition: box-shadow 0.2s;
	}
	
	.user-card:hover {
		box-shadow: 0 4px 8px rgba(0,0,0,0.15);
	}

	.user-avatar {
		display: flex;
		align-items: center;
		margin-bottom: 1rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid #f3f4f6;
	}

	.avatar-circle {
		width: 50px;
		height: 50px;
		border-radius: 50%;
		background: #1e40af;
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 600;
		font-size: 1.1rem;
		margin-right: 1rem;
	}

	.user-info h3 {
		margin: 0 0 0.25rem 0;
		color: #111827;
		font-size: 1.1rem;
	}

	.email {
		margin: 0;
		color: #6b7280;
		font-size: 0.9rem;
	}

	.user-details {
		margin-bottom: 1.5rem;
	}

	.role-badge {
		display: inline-block;
		padding: 0.25rem 0.75rem;
		border-radius: 20px;
		font-size: 0.8rem;
		font-weight: 500;
		text-transform: uppercase;
		margin-bottom: 1rem;
	}

	.role-badge.admin-role {
		background: #fecaca;
		color: #991b1b;
	}

	.role-badge.customer-role {
		background: #dbeafe;
		color: #1e40af;
	}

	.role-badge.default-role {
		background: #f3f4f6;
		color: #6b7280;
	}

	.user-meta p {
		margin: 0.5rem 0;
		font-size: 0.9rem;
		color: #6b7280;
	}

	.tenant-id {
		font-family: monospace;
		font-size: 0.8rem;
		background: #f3f4f6;
		padding: 0.2rem 0.4rem;
		border-radius: 4px;
	}

	.user-actions {
		display: flex;
		gap: 0.5rem;
	}

	.btn-primary, .btn-secondary {
		flex: 1;
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 6px;
		font-size: 0.9rem;
		font-weight: 500;
		cursor: pointer;
		transition: background 0.2s;
		text-decoration: none;
		text-align: center;
		display: inline-block;
	}

	.btn-primary {
		background: #1e40af;
		color: white;
	}

	.btn-primary:hover {
		background: #1d4ed8;
	}

	.btn-secondary {
		background: #f8fafc;
		color: #64748b;
		border: 1px solid #e2e8f0;
	}

	.btn-secondary:hover {
		background: #f1f5f9;
	}

	.summary {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 12px;
		padding: 1.5rem;
	}

	.summary-stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 2rem;
	}

	.stat {
		text-align: center;
	}

	.stat-number {
		display: block;
		font-size: 1.5rem;
		font-weight: 600;
		color: #1e40af;
	}

	.stat-label {
		color: #6b7280;
		font-size: 0.9rem;
	}

	.empty-state {
		text-align: center;
		padding: 4rem 2rem;
		background: #f9fafb;
		border-radius: 12px;
		margin: 2rem 0;
	}

	.empty-icon {
		font-size: 4rem;
		margin-bottom: 1rem;
		opacity: 0.5;
	}

	.empty-state h3 {
		color: #374151;
		margin-bottom: 0.5rem;
	}

	.empty-state p {
		color: #6b7280;
		margin-bottom: 2rem;
	}
</style>