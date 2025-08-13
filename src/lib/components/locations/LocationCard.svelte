<script>
	import { LocationService } from '$lib/services/LocationService.js';

	let { 
		location,
		selected = false,
		selectable = false,
		showActions = true,
		compact = false,
		onSelect,
		onEdit,
		onToggleStatus,
		onSetDefault,
		className = ''
	} = $props();
	
	function handleCardClick() {
		if (onSelect && selectable) {
			onSelect(location.id);
		}
	}
	
	function handleSelect(e) {
		e.stopPropagation();
		if (onSelect) {
			onSelect(location.id);
		}
	}
	
	function handleEdit(e) {
		e.stopPropagation();
		if (onEdit) {
			onEdit(location);
		}
	}
	
	function handleToggleStatus(e) {
		e.stopPropagation();
		if (onToggleStatus) {
			onToggleStatus(location);
		}
	}
	
	function handleSetDefault(e) {
		e.stopPropagation();
		if (onSetDefault) {
			onSetDefault(location);
		}
	}
	
	// Computed values
	const formattedAddress = $derived(LocationService.formatSingleLineAddress(location));
	const statusInfo = $derived(LocationService.getStatusInfo(location.status));
	const typeInfo = $derived(LocationService.getLocationTypeInfo(location.location_type));
	const capabilities = $derived(() => {
		const caps = [];
		if (location.is_pickup_location) caps.push('Pickup');
		if (location.is_fulfillment_center) caps.push('Fulfillment');
		if (location.is_default) caps.push('Default');
		return caps;
	});
</script>

<div 
	class="location-card {className}"
	class:location-card-compact={compact}
	class:location-card-clickable={selectable}
	class:location-card-selected={selected}
	onclick={handleCardClick}
	role={selectable ? 'button' : undefined}
	tabindex={selectable ? 0 : undefined}
>
	<!-- Selection checkbox -->
	{#if selectable}
		<div class="location-card-select" onclick={(e) => e.stopPropagation()}>
			<input 
				type="checkbox" 
				class="table-checkbox"
				checked={selected}
				onchange={handleSelect}
			/>
		</div>
	{/if}
	
	<!-- Location header -->
	<div class="location-card-header">
		<div class="location-icon" title={typeInfo.description}>
			{typeInfo.icon}
		</div>
		
		<div class="location-info">
			<h3 class="location-name">
				{location.name}
				{#if location.is_default}
					<span class="default-badge">Default</span>
				{/if}
			</h3>
			<p class="location-address">{formattedAddress}</p>
			{#if !compact && location.description}
				<p class="location-description">{location.description}</p>
			{/if}
		</div>
	</div>
	
	<!-- Location details -->
	<div class="location-card-body">
		<div class="location-badges">
			<div class="type-badge {typeInfo.class}">
				<span class="type-icon">{typeInfo.icon}</span>
				<span class="type-text">{typeInfo.label}</span>
			</div>
			
			<div class="status-badge {statusInfo.class}">
				{statusInfo.label}
			</div>
		</div>
		
		{#if capabilities().length > 0}
			<div class="capability-badges">
				{#each capabilities() as capability}
					<span class="capability-badge capability-{capability.toLowerCase()}">
						{capability}
					</span>
				{/each}
			</div>
		{/if}
		
		{#if !compact}
			<div class="location-meta">
				{#if location.phone}
					<div class="meta-item">
						<span class="meta-label">Phone:</span>
						<span class="meta-value">{location.phone}</span>
					</div>
				{/if}
				
				{#if location.email}
					<div class="meta-item">
						<span class="meta-label">Email:</span>
						<span class="meta-value">{location.email}</span>
					</div>
				{/if}
				
				<div class="meta-item">
					<span class="meta-label">Created:</span>
					<span class="meta-value">{new Date(location.created_at).toLocaleDateString()}</span>
				</div>
			</div>
		{/if}
	</div>
	
	<!-- Actions -->
	{#if showActions && (onEdit || onToggleStatus || onSetDefault)}
		<div class="location-card-actions">
			{#if onSetDefault && !location.is_default}
				<button 
					class="btn-ghost btn-sm"
					onclick={handleSetDefault}
					title="Set as default location"
				>
					⭐ Set Default
				</button>
			{/if}
			
			{#if onEdit}
				<button 
					class="btn-ghost btn-sm"
					onclick={handleEdit}
					title="Edit location"
				>
					✏️ Edit
				</button>
			{/if}
			
			{#if onToggleStatus}
				<button 
					class="btn-ghost btn-sm {location.status === 'active' ? 'btn-warning' : 'btn-success'}"
					onclick={handleToggleStatus}
					title={location.status === 'active' ? 'Deactivate location' : 'Activate location'}
				>
					{location.status === 'active' ? '⏸️ Deactivate' : '▶️ Activate'}
				</button>
			{/if}
		</div>
	{/if}
</div>

<style>
	.location-card {
		background: white;
		border: 1px solid #e1e1e1;
		border-radius: 12px;
		padding: 1.5rem;
		transition: all 0.15s ease;
		position: relative;
	}
	
	.location-card:hover {
		border-color: #d1d5db;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}
	
	.location-card-clickable {
		cursor: pointer;
	}
	
	.location-card-clickable:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}
	
	.location-card-selected {
		border-color: #1a73e8;
		box-shadow: 0 0 0 1px #e1e7f5;
	}
	
	.location-card-compact {
		padding: 1rem;
	}
	
	.location-card-select {
		position: absolute;
		top: 1rem;
		right: 1rem;
	}
	
	/* Header */
	.location-card-header {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		margin-bottom: 1rem;
	}
	
	.location-icon {
		width: 48px;
		height: 48px;
		border-radius: 8px;
		background: #f6f6f7;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.5rem;
		flex-shrink: 0;
	}
	
	.location-card-compact .location-icon {
		width: 40px;
		height: 40px;
		font-size: 1.25rem;
	}
	
	.location-info {
		flex: 1;
		min-width: 0;
	}
	
	.location-name {
		font-size: 1rem;
		font-weight: 600;
		color: #202223;
		margin: 0 0 0.25rem 0;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	
	.location-card-compact .location-name {
		font-size: 0.875rem;
	}
	
	.location-address {
		font-size: 0.875rem;
		color: #6d7175;
		margin: 0 0 0.25rem 0;
		line-height: 1.4;
	}
	
	.location-card-compact .location-address {
		font-size: 0.8125rem;
	}
	
	.location-description {
		font-size: 0.8125rem;
		color: #9ca3af;
		margin: 0;
		line-height: 1.4;
	}
	
	.default-badge {
		background: #e1e7f5;
		color: #1a73e8;
		font-size: 0.6875rem;
		font-weight: 500;
		padding: 0.125rem 0.375rem;
		border-radius: 4px;
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}
	
	/* Body */
	.location-card-body {
		margin-bottom: 1rem;
	}
	
	.location-card-compact .location-card-body {
		margin-bottom: 0.75rem;
	}
	
	.location-badges {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}
	
	.location-card-compact .location-badges {
		margin-bottom: 0.5rem;
	}
	
	.type-badge {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.25rem 0.5rem;
		border-radius: 6px;
		font-size: 0.75rem;
		font-weight: 500;
		background: #f6f6f7;
		color: #6d7175;
	}
	
	.type-badge.store-type {
		background: #e1e7f5;
		color: #1a73e8;
	}
	
	.type-badge.warehouse-type {
		background: #fef3c7;
		color: #d97706;
	}
	
	.type-badge.pickup_point-type {
		background: #d1f2eb;
		color: #0d7462;
	}
	
	.type-badge.office-type {
		background: #ede9fe;
		color: #7c3aed;
	}
	
	.type-icon {
		font-size: 0.75rem;
	}
	
	.status-badge {
		padding: 0.25rem 0.5rem;
		border-radius: 6px;
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: capitalize;
	}
	
	.status-badge.status-active {
		background: #d1f2eb;
		color: #0d7462;
	}
	
	.status-badge.status-inactive {
		background: #fed7d7;
		color: #c53030;
	}
	
	.status-badge.status-temporarily_closed {
		background: #fef3c7;
		color: #d97706;
	}
	
	.capability-badges {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		margin-bottom: 0.75rem;
	}
	
	.capability-badge {
		font-size: 0.6875rem;
		font-weight: 500;
		padding: 0.125rem 0.375rem;
		border-radius: 4px;
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}
	
	.capability-pickup {
		background: #fef3c7;
		color: #d97706;
	}
	
	.capability-fulfillment {
		background: #e1e7f5;
		color: #1a73e8;
	}
	
	.capability-default {
		background: #d1f2eb;
		color: #0d7462;
	}
	
	/* Meta information */
	.location-meta {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	
	.meta-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.75rem;
	}
	
	.meta-label {
		color: #6d7175;
		font-weight: 500;
	}
	
	.meta-value {
		color: #202223;
		font-weight: 500;
	}
	
	/* Actions */
	.location-card-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		border-top: 1px solid #f0f0f0;
		padding-top: 0.75rem;
	}
	
	.location-card-compact .location-card-actions {
		padding-top: 0.5rem;
	}
	
	.location-card-actions .btn-ghost {
		flex: 1;
		min-width: fit-content;
		justify-content: center;
		font-size: 0.75rem;
	}
	
	.btn-success:hover {
		background: #d1f2eb;
		color: #0d7462;
		border-color: #0d7462;
	}
	
	.btn-warning:hover {
		background: #fef3c7;
		color: #d97706;
		border-color: #d97706;
	}
	
	/* Responsive adjustments */
	@media (max-width: 768px) {
		.location-card {
			padding: 1rem;
		}
		
		.location-card-header {
			margin-bottom: 0.75rem;
		}
		
		.location-icon {
			width: 40px;
			height: 40px;
			font-size: 1.25rem;
		}
		
		.location-name {
			font-size: 0.875rem;
		}
		
		.location-address {
			font-size: 0.8125rem;
		}
		
		.location-card-actions {
			flex-direction: column;
		}
		
		.location-card-actions .btn-ghost {
			width: 100%;
		}
	}
</style>