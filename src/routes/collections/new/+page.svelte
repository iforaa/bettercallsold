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
		<div class="header-main">
			<div class="header-left">
				<button class="back-button" onclick={() => goto('/collections')}>
					←
				</button>
				<h1>Create collection</h1>
				{#if unsavedChanges}
					<span class="unsaved-indicator">● Unsaved collection</span>
				{/if}
			</div>
			<div class="header-actions">
				<button class="btn-secondary" onclick={discardChanges}>
					Discard
				</button>
				<button class="btn-primary" onclick={saveCollection} disabled={saving}>
					{saving ? 'Saving...' : 'Save collection'}
				</button>
			</div>
		</div>
	</div>

	<div class="page-content">
		<div class="content-grid">
			<!-- Main Content -->
			<div class="main-content">
				<!-- Collection Details -->
				<div class="form-section">
					<h3 class="section-title">Collection details</h3>
					
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
					<h3 class="section-title">Collection image</h3>
					<div class="image-upload">
						<div class="upload-area">
							<div class="upload-placeholder">
								📂
							</div>
							<div class="upload-content">
								<h4>Add an image for this collection</h4>
								<p>Upload an image or enter an image URL for this collection</p>
								<div class="upload-buttons">
									<button type="button" class="btn-secondary">Upload image</button>
									<button type="button" class="btn-secondary">Add from URL</button>
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

				<!-- Collection Visibility -->
				<div class="form-section">
					<h3 class="section-title">Collection availability</h3>
					<div class="availability-info">
						<div class="info-row">
							<span class="info-label">Availability</span>
							<span class="info-value">Online Store</span>
						</div>
						<div class="info-row">
							<span class="info-label">Publishing</span>
							<span class="info-value">Published</span>
						</div>
					</div>
				</div>
			</div>

			<!-- Sidebar -->
			<div class="sidebar">
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
					<div class="collection-type">
						<div class="type-option">
							<input type="radio" id="manual" name="collection-type" checked />
							<label for="manual">
								<strong>Manual</strong>
								<span class="type-description">Add products to this collection one by one</span>
							</label>
						</div>
						<div class="type-option">
							<input type="radio" id="automated" name="collection-type" disabled />
							<label for="automated">
								<strong>Automated</strong>
								<span class="type-description">Existing and future products that match the conditions you set will automatically be added</span>
							</label>
						</div>
					</div>
				</div>
			</div>
		</div>
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
		position: sticky;
		top: 0;
		z-index: 100;
	}

	.header-main {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.back-button {
		background: none;
		border: none;
		font-size: 1.25rem;
		cursor: pointer;
		color: #6d7175;
		padding: 0.25rem;
	}

	.header-left h1 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: #202223;
	}

	.unsaved-indicator {
		color: #bf5000;
		font-size: 0.875rem;
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.header-actions {
		display: flex;
		gap: 0.75rem;
	}

	.btn-primary, .btn-secondary {
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-primary {
		background: #202223;
		color: white;
		border: none;
	}

	.btn-primary:hover:not(:disabled) {
		background: #1a1a1a;
	}

	.btn-primary:disabled {
		opacity: 0.6;
		cursor: not-allowed;
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
		padding: 2rem;
	}

	.content-grid {
		display: grid;
		grid-template-columns: 1fr 300px;
		gap: 2rem;
		max-width: 1200px;
		margin: 0 auto;
	}

	.main-content {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.form-section {
		background: white;
		border: 1px solid #e1e1e1;
		border-radius: 8px;
		padding: 1.5rem;
	}

	.section-title {
		font-size: 1rem;
		font-weight: 600;
		color: #202223;
		margin: 0 0 1rem 0;
	}

	.form-field {
		margin-bottom: 1rem;
	}

	.form-field:last-child {
		margin-bottom: 0;
	}

	.form-label {
		display: block;
		font-weight: 500;
		color: #202223;
		margin-bottom: 0.5rem;
		font-size: 0.875rem;
	}

	.form-input, .form-textarea {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid #c9cccf;
		border-radius: 6px;
		font-size: 0.875rem;
		transition: border-color 0.15s ease;
	}

	.form-input:focus, .form-textarea:focus {
		outline: none;
		border-color: #005bd3;
		box-shadow: 0 0 0 2px rgba(0, 91, 211, 0.1);
	}

	.form-textarea {
		resize: vertical;
		min-height: 100px;
	}

	.form-hint {
		color: #6d7175;
		font-size: 0.8125rem;
		margin-top: 0.5rem;
		margin-bottom: 0;
		line-height: 1.4;
	}

	.image-upload {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.upload-area {
		border: 2px dashed #c9cccf;
		border-radius: 8px;
		padding: 3rem 2rem;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	.upload-placeholder {
		font-size: 3rem;
		opacity: 0.4;
	}

	.upload-content h4 {
		margin: 0 0 0.5rem 0;
		color: #202223;
		font-size: 1rem;
	}

	.upload-content p {
		margin: 0 0 1rem 0;
		color: #6d7175;
		font-size: 0.875rem;
	}

	.upload-buttons {
		display: flex;
		gap: 0.5rem;
	}

	.availability-info {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.info-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 0;
		border-bottom: 1px solid #f3f4f6;
	}

	.info-row:last-child {
		border-bottom: none;
	}

	.info-label {
		color: #6d7175;
		font-size: 0.875rem;
	}

	.info-value {
		color: #202223;
		font-size: 0.875rem;
		font-weight: 500;
	}

	.sidebar {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.sidebar-section {
		background: white;
		border: 1px solid #e1e1e1;
		border-radius: 8px;
		padding: 1.5rem;
	}

	.sidebar-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: #202223;
		margin: 0 0 1rem 0;
	}

	.collection-type {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.type-option {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
	}

	.type-option input[type="radio"] {
		margin-top: 0.125rem;
		flex-shrink: 0;
	}

	.type-option label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		cursor: pointer;
		flex: 1;
	}

	.type-option label strong {
		color: #202223;
		font-size: 0.875rem;
	}

	.type-description {
		color: #6d7175;
		font-size: 0.8125rem;
		line-height: 1.4;
	}

	.type-option input:disabled + label {
		opacity: 0.6;
		cursor: not-allowed;
	}

	@media (max-width: 1024px) {
		.content-grid {
			grid-template-columns: 1fr;
			gap: 1.5rem;
		}
		
		.sidebar {
			order: -1;
		}
	}

	@media (max-width: 768px) {
		.page-content {
			padding: 1rem;
		}
		
		.header-main {
			flex-direction: column;
			gap: 1rem;
		}
	}
</style>