<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	
	let team = $derived(data.team);
	let error = $derived(data.error);
	
	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString();
	}
</script>

<svelte:head>
	<title>Team - BetterCallSold</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<div class="header-main">
			<h1>
				<span class="page-icon">👨‍💼</span>
				Team
			</h1>
			<div class="header-actions">
				<button class="btn-secondary">Export</button>
				<button class="btn-primary">Invite member</button>
			</div>
		</div>
	</div>

	<div class="page-content">
		{#if error}
			<div class="error-state">
				<p>{error}</p>
			</div>
		{:else if team && team.length > 0}
			<div class="table-container">
				<table class="team-table">
					<thead>
						<tr>
							<th>Team Member</th>
							<th>Email</th>
							<th>Role</th>
							<th>Status</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each team as member}
							<tr class="team-row">
								<td>
									<div class="member-info">
										<div class="member-avatar">
											{member.name.charAt(0).toUpperCase()}
										</div>
										<div class="member-details">
											<div class="member-name">{member.name}</div>
											<div class="member-id">ID: {member.id.slice(0, 8)}...</div>
										</div>
									</div>
								</td>
								<td>{member.email}</td>
								<td>
									<span class="role-badge admin">
										{member.role}
									</span>
								</td>
								<td>
									<span class="status-badge active">
										Active
									</span>
								</td>
								<td>
									<div class="actions">
										<button class="action-btn">View</button>
										<button class="action-btn">Edit</button>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			
			<div class="pagination">
				<span class="pagination-info">Showing {team.length} team members</span>
			</div>
		{:else}
			<div class="empty-state">
				<div class="empty-content">
					<div class="empty-icon">👨‍💼</div>
					<h3>No team members yet</h3>
					<p>Invite team members to help manage your business</p>
					<button class="btn-primary">Invite member</button>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.page {
		min-height: 100vh;
		background: #f6f6f7;
	}

	.page-header {
		background: white;
		border-bottom: 1px solid #e1e1e1;
		padding: 1rem 2rem;
	}

	.header-main {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.header-main h1 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: #202223;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.page-icon {
		font-size: 1rem;
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.btn-primary, .btn-secondary {
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		transition: all 0.15s ease;
		border: none;
	}

	.btn-primary {
		background: #202223;
		color: white;
	}

	.btn-primary:hover {
		background: #1a1a1a;
	}

	.btn-secondary {
		background: white;
		color: #6d7175;
		border: 1px solid #c9cccf;
	}

	.btn-secondary:hover {
		background: #f6f6f7;
	}

	.page-content {
		padding: 0;
	}

	.table-container {
		background: white;
		overflow-x: auto;
	}

	.team-table {
		width: 100%;
		border-collapse: collapse;
	}

	.team-table th {
		background: #fafbfb;
		padding: 0.75rem 1rem;
		text-align: left;
		font-weight: 500;
		font-size: 0.75rem;
		color: #6d7175;
		text-transform: uppercase;
		letter-spacing: 0.025em;
		border-bottom: 1px solid #e1e1e1;
	}

	.team-table td {
		padding: 1rem;
		border-bottom: 1px solid #e1e1e1;
		vertical-align: middle;
	}

	.member-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.member-avatar {
		width: 40px;
		height: 40px;
		background: #10b981;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 600;
		color: white;
		font-size: 0.875rem;
	}

	.member-details {
		flex: 1;
	}

	.member-name {
		font-weight: 500;
		color: #202223;
		font-size: 0.875rem;
		margin-bottom: 0.25rem;
	}

	.member-id {
		color: #6d7175;
		font-size: 0.8125rem;
	}

	.role-badge {
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: capitalize;
	}

	.role-badge.admin {
		background: #fef3c7;
		color: #92400e;
	}

	.status-badge {
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: capitalize;
	}

	.status-badge.active {
		background: #d1fae5;
		color: #047857;
	}

	.actions {
		display: flex;
		gap: 0.5rem;
	}

	.action-btn {
		padding: 0.25rem 0.5rem;
		border: 1px solid #c9cccf;
		background: white;
		color: #6d7175;
		border-radius: 4px;
		font-size: 0.75rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.action-btn:hover {
		background: #f6f6f7;
	}

	.pagination {
		padding: 1rem 2rem;
		background: white;
		border-top: 1px solid #e1e1e1;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.pagination-info {
		font-size: 0.875rem;
		color: #6d7175;
	}

	.empty-state {
		background: white;
		padding: 4rem 2rem;
		text-align: center;
	}

	.empty-content {
		max-width: 400px;
		margin: 0 auto;
	}

	.empty-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
		opacity: 0.4;
	}

	.empty-state h3 {
		color: #202223;
		font-size: 1.25rem;
		margin-bottom: 0.5rem;
		font-weight: 600;
	}

	.empty-state p {
		color: #6d7175;
		margin-bottom: 2rem;
		line-height: 1.5;
	}

	.error-state {
		background: #fef2f2;
		border: 1px solid #fecaca;
		color: #991b1b;
		padding: 1rem 2rem;
		margin: 1rem 2rem;
		border-radius: 6px;
	}

	.team-row:hover {
		background: #fafbfb;
	}

	@media (max-width: 768px) {
		.header-main {
			flex-direction: column;
			gap: 1rem;
			align-items: stretch;
		}
		
		.header-actions {
			justify-content: flex-end;
		}
		
		.team-table {
			min-width: 800px;
		}
	}
</style>