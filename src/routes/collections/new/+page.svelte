<script lang="ts">
	import { goto } from '$app/navigation';
	import { env } from '$env/dynamic/public';
	
	let name = $state('');
	let description = $state('');
	let imageUrl = $state('');
	let sortOrder = $state('0');
	let saving = $state(false);
	let unsavedChanges = $state(false);
	
	$effect(() => {
		// Mark as having unsaved changes when any field is modified
		if (name || description || imageUrl) {
			unsavedChanges = true;
		}
	});
	
	async function saveCollection() {
		saving = true;
		
		try {
			const collectionData = {
				name: name,
				description: description,
				image_url: imageUrl,
				sort_order: parseInt(sortOrder) || 0
			};
			
			// Use internal SvelteKit API route
			const response = await fetch('/api/collections', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(collectionData)
			});
			
			if (response.ok) {
				unsavedChanges = false;
				goto('/collections');
			} else {
				throw new Error('Failed to save collection');
			}
		} catch (error) {
			alert('Error saving collection: ' + error.message);
		} finally {
			saving = false;
		}
	}
	
	function discardChanges() {
		if (unsavedChanges && confirm('You have unsaved changes. Are you sure you want to discard them?')) {
			goto('/collections');
		} else if (!unsavedChanges) {
			goto('/collections');
		}
	}
</script>

<svelte:head>
	<title>Create collection - BetterCallSold</title>
</svelte:head>

<div class="page">
	<!-- Header -->
	<div class="page-header">
		<div class="page-header-content">
			<div class="page-header-nav">
				<button class="btn-icon" onclick={() => goto('/collections')}>
					←
				</button>
				<div class="breadcrumb" style="margin-bottom: 0; font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold);">
					<span class="breadcrumb-item">Create collection</span>
					{#if unsavedChanges}
						<span class="badge badge-warning" style="margin-left: var(--space-2);">● Unsaved</span>
					{/if}
				</div>
			</div>
			<div class="page-actions">
				<button class="btn btn-secondary" onclick={discardChanges}>
					Discard
				</button>
				<button class="btn btn-primary" onclick={saveCollection} disabled={saving}>
					{#if saving}
						<span class="loading-spinner"></span>
					{/if}
					{saving ? 'Saving...' : 'Save collection'}
				</button>
			</div>
		</div>
	</div>

	<div class="page-content">
		<div class="content-layout">
			<!-- Main Content -->
			<div class="content-main">
				<!-- Collection Details -->
				<div class="form-section">
					<div class="form-section-header">
						<h3 class="form-section-title">Collection details</h3>
					</div>
					
					<div class="form-field">
						<label class="form-label" for="name">Title</label>
						<input 
							id="name"
							type="text" 
							class="form-input"
							bind:value={name}
							placeholder="e.g. Summer collection, Under $100, Staff picks"
						/>
					</div>

					<div class="form-field">
						<label class="form-label" for="description">Description</label>
						<textarea 
							id="description"
							class="form-textarea"
							bind:value={description}
							rows="4"
							placeholder="Give customers more information about this collection..."
						></textarea>
					</div>
				</div>

				<!-- Collection Image -->
				<div class="form-section">
					<div class="form-section-header">
						<h3 class="form-section-title">Collection image</h3>
					</div>
					<div class="media-upload">
						<div class="media-upload-area">
							<div class="media-upload-content">
								<div class="media-upload-icon">
									📂
								</div>
								<div class="media-upload-text">Add an image for this collection</div>
								<p class="media-upload-hint">Upload an image or enter an image URL for this collection</p>
								<div class="media-upload-actions">
									<button type="button" class="btn btn-secondary btn-sm">Upload image</button>
									<button type="button" class="btn btn-secondary btn-sm">Add from URL</button>
								</div>
							</div>
						</div>
						<div class="form-field">
							<label class="form-label" for="image-url">Image URL (optional)</label>
							<input 
								id="image-url"
								type="url" 
								class="form-input"
								bind:value={imageUrl}
								placeholder="https://example.com/image.jpg"
							/>
						</div>
					</div>
				</div>

				<!-- Collection Availability -->
				<div class="form-section">
					<div class="form-section-header">
						<h3 class="form-section-title">Collection availability</h3>
					</div>
					<div class="form-field-group">
						<div class="form-status-item">
							<span class="form-status-label">Availability</span>
							<span class="form-status-value">Online Store</span>
						</div>
						<div class="form-status-item">
							<span class="form-status-label">Publishing</span>
							<span class="form-status-value">Published</span>
						</div>
					</div>
				</div>
			</div>

			<!-- Sidebar -->
			<div class="content-sidebar">
				<!-- Collection Organization -->
				<div class="sidebar-section">
					<h3 class="sidebar-title">Collection organization</h3>
					
					<div class="form-field">
						<label class="form-label" for="sort-order">Sort order</label>
						<input 
							id="sort-order"
							type="number" 
							class="form-input"
							bind:value={sortOrder}
							placeholder="0"
							min="0"
						/>
						<p class="form-hint">Collections with lower sort order values appear first</p>
					</div>
				</div>

				<!-- Collection Type -->
				<div class="sidebar-section">
					<h3 class="sidebar-title">Collection type</h3>
					<div class="form-field">
						<div class="form-radio-group">
							<div class="form-radio-item">
								<input type="radio" id="manual" name="collection-type" class="form-radio" checked />
								<label for="manual" class="form-radio-label">
									<span class="form-radio-title">Manual</span>
									<span class="form-radio-description">Add products to this collection one by one</span>
								</label>
							</div>
							<div class="form-radio-item">
								<input type="radio" id="automated" name="collection-type" class="form-radio" disabled />
								<label for="automated" class="form-radio-label">
									<span class="form-radio-title">Automated</span>
									<span class="form-radio-description">Existing and future products that match the conditions you set will automatically be added</span>
								</label>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	/* Minimal custom styles - most styling now handled by design system */
	
	/* Content layout specific to collections new page */
	.content-layout {
		grid-template-columns: 1fr 300px;
	}

	/* All header, form, media, sidebar, and other component styles now handled by design system */
	
	/* Responsive adjustments not covered by design system */
	@media (max-width: 1024px) {
		.content-layout {
			grid-template-columns: 1fr;
		}
		
		.content-sidebar {
			order: -1;
		}
	}

	@media (max-width: 768px) {
		.page-content {
			padding: var(--space-4);
		}
	}
</style>