<script lang="ts">
	import { goto } from '$app/navigation';
	import type { ProductFormData, Collection } from '$lib/types/products';

	interface Props {
		formData: ProductFormData;
		collections?: Collection[];
		uploading?: boolean;
		existingImages?: string[];
		currentProduct?: any;
		onSubmit: (data: ProductFormData) => void;
		onFormChange: (data: Partial<ProductFormData>) => void;
	}

	let {
		formData,
		collections = [],
		uploading = false,
		existingImages = [],
		currentProduct,
		onSubmit,
		onFormChange
	}: Props = $props();

	// Log image count for debugging (reduced logging)
	$effect(() => {
		console.log(`ProductForm - Received ${existingImages?.length || 0} existing images`);
	});

	// Local state for UI interactions
	let showCollectionDropdown = $state(false);
	let collectionSearchTerm = $state('');
	let selectedCollections = $state(formData?.collections || []);
	
	// Sync selectedCollections with formData changes (prevent infinite loops)
	$effect(() => {
		const formCollections = formData?.collections || [];
		if (JSON.stringify(selectedCollections) !== JSON.stringify(formCollections)) {
			selectedCollections = [...formCollections];
			console.log('ProductForm - Synced collections:', selectedCollections.length, 'items');
		}
	});

	// Computed properties
	let filteredCollections = $derived(
		collections.filter(collection => 
			collection.name.toLowerCase().includes(collectionSearchTerm.toLowerCase())
		)
	);

	// Handle form field changes
	function updateField(field: keyof ProductFormData, value: any) {
		const updatedData = { ...formData, [field]: value };
		onFormChange(updatedData);
	}

	// Image handling
	function handleImageUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files) {
			const images = Array.from(input.files);
			updateField('images', images);
		}
	}
	
	function removeImage(index: number) {
		const updatedImages = formData.images.filter((_, i) => i !== index);
		updateField('images', updatedImages);
	}

	// Collection management
	function toggleCollectionDropdown() {
		showCollectionDropdown = !showCollectionDropdown;
		if (showCollectionDropdown) {
			collectionSearchTerm = '';
		}
	}
	
	function toggleCollection(collection: Collection) {
		const isSelected = selectedCollections.includes(collection.id);
		let newSelection;
		
		if (isSelected) {
			newSelection = selectedCollections.filter(id => id !== collection.id);
		} else {
			newSelection = [...selectedCollections, collection.id];
		}
		
		selectedCollections = newSelection;
		updateField('collections', newSelection);
	}
	
	function removeCollection(collectionId: string) {
		const newSelection = selectedCollections.filter(id => id !== collectionId);
		selectedCollections = newSelection;
		updateField('collections', newSelection);
	}

	// Get collection name by ID
	function getCollectionName(collectionId: string): string {
		const collection = collections.find(c => c.id === collectionId);
		return collection?.name || 'Unknown Collection';
	}

	// Get actual image URL from either string or object format
	function getImageUrl(image: any): string {
		if (typeof image === 'string') {
			return image;
		} else if (image && typeof image === 'object' && image.url) {
			return image.url;
		}
		return '';
	}

	// Get image alt text
	function getImageAlt(image: any, index: number): string {
		if (typeof image === 'object' && image.alt) {
			return image.alt;
		}
		return `Product image ${index + 1}`;
	}

	// Get image source type
	function getImageSource(image: any): string {
		const imageUrl = getImageUrl(image);
		if (!imageUrl) return 'Unknown';
		
		try {
			const url = new URL(imageUrl);
			const hostname = url.hostname.toLowerCase();
			
			if (hostname.includes('commentsold.com') || hostname.includes('commentcorp.com')) {
				return 'CommentSold';
			} else if (hostname.includes('cloudflare') || hostname.includes('workers.dev')) {
				return 'Cloudflare';
			} else if (hostname.includes('amazonaws.com') || hostname.includes('s3')) {
				return 'AWS S3';
			} else if (hostname === 'localhost' || hostname.startsWith('192.168')) {
				return 'Local';
			} else {
				return 'External';
			}
		} catch {
			return 'Unknown';
		}
	}

	// Handle form submission
	function handleSubmit() {
		onSubmit(formData);
	}

	// Close dropdown when clicking outside
	function handleClickOutside(event: Event) {
		const target = event.target as Element;
		if (!target.closest('.collection-dropdown-container')) {
			showCollectionDropdown = false;
		}
	}
	
	$effect(() => {
		if (showCollectionDropdown) {
			document.addEventListener('click', handleClickOutside);
			return () => document.removeEventListener('click', handleClickOutside);
		}
	});
</script>

<div class="form-container">
	<!-- Main Content -->
	<div class="form-main">
		<!-- Title -->
		<div class="form-section">
			<div class="form-field">
				<label class="form-label" for="title">Title</label>
				<input 
					id="title"
					type="text" 
					class="form-input"
					value={formData.title}
					oninput={(e) => updateField('title', e.target.value)}
					placeholder="Short sleeve t-shirt"
				/>
			</div>
		</div>

		<!-- Description -->
		<div class="form-section">
			<div class="form-field">
				<label class="form-label" for="description">Description</label>
				<div class="form-toolbar">
					<select class="form-toolbar-select">
						<option>Paragraph</option>
					</select>
					<div class="form-toolbar-buttons">
						<button type="button" class="form-toolbar-btn"><strong>B</strong></button>
						<button type="button" class="form-toolbar-btn"><em>I</em></button>
						<button type="button" class="form-toolbar-btn"><u>U</u></button>
						<button type="button" class="form-toolbar-btn">•</button>
						<button type="button" class="form-toolbar-btn">≡</button>
						<button type="button" class="form-toolbar-btn">🔗</button>
						<button type="button" class="form-toolbar-btn">📷</button>
						<button type="button" class="form-toolbar-btn">⚙️</button>
						<button type="button" class="form-toolbar-btn">&lt;/&gt;</button>
					</div>
				</div>
				<textarea 
					id="description"
					class="form-textarea"
					value={formData.description}
					oninput={(e) => updateField('description', e.target.value)}
					rows="6"
					placeholder="Describe your product..."
				></textarea>
			</div>
		</div>

		<!-- Media -->
		<div class="form-section">
			<div class="form-field">
				<label class="form-label">Media</label>
				<div class="media-upload">
					<!-- Existing Images -->
					{#if existingImages && existingImages.length > 0}
						<div class="media-section">
							<div class="media-section-title">
								Current Images
								<span class="media-section-badge">{existingImages.length}</span>
							</div>
							<div class="image-preview-grid">
								{#each existingImages as image, index}
									<div class="image-preview">
										<img 
											src={getImageUrl(image)} 
											alt={getImageAlt(image, index)} 
											onerror={(e) => {
												e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRkZGRkZGIiBzdHJva2U9IiNEREREREQiIHN0cm9rZS13aWR0aD0iMiIvPgo8dGV4dCB4PSIxMDAiIHk9IjEwNSIgZmlsbD0iIzk5OTk5OSIgZm9udC1zaXplPSIxNCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+SW1hZ2UgVW5hdmFpbGFibGU8L3RleHQ+Cjwvc3ZnPgo=';
												e.target.parentElement.classList.add('image-error');
											}}
										/>
										<div class="image-controls">
											<button type="button" class="image-control-btn" title="View full size" onclick={() => window.open(getImageUrl(image), '_blank')}>👁️</button>
										</div>
										<div class="image-info">
											<div class="image-name">{getImageSource(image)} - Image {index + 1}</div>
											<div class="image-status">Saved</div>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<!-- New Images to Upload -->
					{#if formData.images && formData.images.length > 0}
						<div class="media-section">
							<div class="media-section-title">
								Images to Upload
								<span class="media-section-badge">{formData.images.length}</span>
							</div>
							<div class="image-preview-grid">
								{#each formData.images as image, index}
									<div class="image-preview">
										<img src={URL.createObjectURL(image)} alt="Preview" />
										<div class="image-controls">
											<button type="button" class="image-control-btn danger" onclick={() => removeImage(index)}>×</button>
										</div>
										<div class="image-info">
											<div class="image-name">{image.name}</div>
											<div class="image-status">Pending upload</div>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Upload Area -->
					<input type="file" id="image-upload" multiple accept="image/*" onchange={handleImageUpload} class="form-file-input" />
					<label for="image-upload" class="form-file-label">
						<div class="form-file-content">
							<div class="form-file-icon">📷</div>
							<div class="form-file-text">Click to upload images</div>
							<div class="form-file-hint">Supports PNG, JPG, GIF up to 10MB each</div>
						</div>
					</label>
				</div>
			</div>
		</div>

		<!-- Pricing -->
		<div class="form-section">
			<div class="form-section-header">
				<h3 class="form-section-title">Pricing</h3>
			</div>
			<div class="form-field-group">
				<div class="form-field">
					<label class="form-label" for="price">Price</label>
					<div class="currency-input">
						<span class="currency-symbol">$</span>
						<input 
							id="price"
							type="number" 
							class="form-input currency-input-field"
							value={formData.price}
							oninput={(e) => updateField('price', e.target.value)}
							placeholder="0.00"
							step="0.01"
						/>
					</div>
				</div>
				<div class="form-field">
					<label class="form-label" for="compare-price">Compare-at price</label>
					<div class="currency-input">
						<span class="currency-symbol">$</span>
						<input 
							id="compare-price"
							type="number" 
							class="form-input currency-input-field"
							value={formData.comparePrice || ''}
							oninput={(e) => updateField('comparePrice', e.target.value)}
							placeholder="0.00"
							step="0.01"
						/>
					</div>
				</div>
			</div>
			<div class="form-field">
				<div class="form-checkbox-field">
					<input 
						id="charge-tax"
						type="checkbox" 
						class="form-checkbox"
						checked={formData.chargesTax}
						onchange={(e) => updateField('chargesTax', e.target.checked)}
					/>
					<label for="charge-tax" class="form-checkbox-label">Charge tax on this product</label>
				</div>
			</div>
		</div>
	</div>

	<!-- Sidebar -->
	<div class="form-sidebar">
		<!-- Status -->
		<div class="sidebar-section">
			<div class="sidebar-header">
				<h3 class="sidebar-title">Status</h3>
			</div>
			<div class="form-field">
				<select 
					class="form-select" 
					value={formData.status}
					onchange={(e) => updateField('status', e.target.value)}
				>
					<option value="active">Active</option>
					<option value="draft">Draft</option>
					<option value="archived">Archived</option>
				</select>
			</div>
		</div>

		<!-- Product organization -->
		<div class="sidebar-section">
			<h3 class="sidebar-title">Product organization</h3>
			
			<div class="form-field">
				<label class="form-label" for="tags">Tags</label>
				<input 
					id="tags"
					type="text" 
					class="form-input"
					value={formData.tags}
					oninput={(e) => updateField('tags', e.target.value)}
					placeholder="Vintage, cotton, summer"
				/>
			</div>
			
			<!-- Collections -->
			<div class="form-field collection-dropdown-container">
				<label class="form-label">Collections</label>
				<!-- Debug info -->
				{#if selectedCollections.length === 0 && collections.length === 0}
					<div class="collections-debug">
						<small class="text-muted">No collections available. <a href="/collections" class="link">Create collections</a> to organize your products.</small>
					</div>
				{:else if selectedCollections.length === 0}
					<div class="collections-debug">
						<small class="text-muted">{collections.length} collections available</small>
					</div>
				{/if}
				<div class="dropdown dropdown-multiselect dropdown-full" class:active={showCollectionDropdown}>
					<!-- Selected Collections -->
					{#if selectedCollections.length > 0}
						<div class="dropdown-selected">
							{#each selectedCollections as collectionId}
								<div class="dropdown-tag">
									<span>{getCollectionName(collectionId)}</span>
									<button type="button" class="dropdown-tag-remove" onclick={() => removeCollection(collectionId)}>×</button>
								</div>
							{/each}
						</div>
					{:else}
						<div class="dropdown-placeholder">
							<span class="text-muted">No collections selected</span>
						</div>
					{/if}
					
					<button 
						type="button" 
						class="dropdown-trigger"
						onclick={toggleCollectionDropdown}
					>
						<span>Add to collection</span>
						<span class="dropdown-icon">▼</span>
					</button>
					
					<div class="dropdown-content">
						<div class="dropdown-create" onclick={() => {/* Add new collection logic */}}>
							<div class="dropdown-create-icon">+</div>
							<span>Add new collection</span>
						</div>
						
						<!-- Collection list -->
						{#if filteredCollections.length > 0}
							{#each filteredCollections as collection}
								<div class="dropdown-item">
									<input 
										type="checkbox" 
										id="collection-{collection.id}"
										checked={selectedCollections.includes(collection.id)}
										onchange={() => toggleCollection(collection)}
									/>
									<label for="collection-{collection.id}" class="dropdown-item-text">
										{collection.name}
									</label>
								</div>
							{/each}
						{:else}
							<div class="dropdown-empty">
								<div class="dropdown-empty-icon">📁</div>
								No collections found
							</div>
						{/if}
						
						<!-- Search input -->
						<div class="dropdown-search">
							<input 
								type="text" 
								placeholder="Search collections"
								value={collectionSearchTerm}
								oninput={(e) => collectionSearchTerm = e.target.value}
								class="dropdown-search-input"
							/>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Product Info -->
		{#if currentProduct}
			<div class="sidebar-section">
				<h3 class="sidebar-title">Product Info</h3>
				<div class="details">
					<div class="detail-item">
						<span class="detail-label">Created:</span>
						<span class="detail-value">{new Date(currentProduct.created_at).toLocaleDateString()}</span>
					</div>
					<div class="detail-item">
						<span class="detail-label">Updated:</span>
						<span class="detail-value">{new Date(currentProduct.updated_at).toLocaleDateString()}</span>
					</div>
					<div class="detail-item">
						<span class="detail-label">ID:</span>
						<span class="detail-value">{currentProduct.id}</span>
					</div>
					{#if currentProduct.inventory_items && currentProduct.inventory_items.length > 0}
						<div class="detail-item">
							<span class="detail-label">Total Inventory:</span>
							<span class="detail-value">
								{currentProduct.inventory_items.reduce((total, item) => total + (item.quantity || 0), 0)} available
							</span>
						</div>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Variants List -->
		{#if currentProduct?.inventory_items && currentProduct.inventory_items.length > 0}
			<div class="sidebar-section">
				<h3 class="sidebar-title">Variants</h3>
				<div class="variants-list">
					{#each currentProduct.inventory_items as variant}
						<div class="variant-item" onclick={() => goto(`/products/${currentProduct.id}/variants/${variant.id}`)}>
							<div class="variant-info">
								<div class="variant-title">
									{#if variant.title && variant.title !== 'Default Title'}
										{variant.title}
									{:else if variant.variant_combination?.color && variant.variant_combination?.size}
										{variant.variant_combination.color} / {variant.variant_combination.size}
									{:else if variant.variant_combination?.color}
										{variant.variant_combination.color}
									{:else if variant.variant_combination?.size}
										{variant.variant_combination.size}
									{:else}
										Default variant
									{/if}
								</div>
								<div class="variant-meta">
									{variant.quantity || 0} available
								</div>
							</div>
							<div class="variant-action">
								→
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

	</div>
</div>

<style>
	.form-container {
		display: grid;
		grid-template-columns: 1fr 300px;
		gap: var(--space-6);
	}

	.form-main {
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
	}

	.form-sidebar {
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
	}

	/* Image status styling */
	.image-status {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		margin-top: var(--space-1);
	}

	.media-section {
		margin-bottom: var(--space-4);
	}

	.media-section-title {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-weight: var(--font-weight-medium);
		color: var(--color-text);
		margin-bottom: var(--space-3);
	}

	.media-section-badge {
		background: var(--color-bg-secondary);
		color: var(--color-text-muted);
		font-size: var(--font-size-xs);
		padding: var(--space-1) var(--space-2);
		border-radius: var(--border-radius-sm);
	}

	/* Image error handling */
	.image-error img {
		opacity: 0.6;
		border: 2px dashed var(--color-border);
	}

	.image-error .image-info {
		opacity: 0.7;
	}

	/* Product Info styles */
	.details {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.detail-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-2) 0;
		border-bottom: 1px solid var(--color-border-light);
	}

	.detail-item:last-child {
		border-bottom: none;
	}

	.detail-label {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
		font-weight: var(--font-weight-medium);
	}

	.detail-value {
		font-size: var(--font-size-sm);
		color: var(--color-text);
		font-weight: var(--font-weight-medium);
	}

	/* Variants list styles */
	.variants-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.variant-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-3);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.variant-item:hover {
		background: var(--color-surface-hover);
		border-color: var(--color-border-hover);
	}

	.variant-info {
		flex: 1;
	}

	.variant-title {
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		color: var(--color-text);
		margin-bottom: var(--space-1);
	}

	.variant-meta {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
	}

	.variant-action {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
		margin-left: var(--space-2);
	}

	/* Responsive adjustments */
	@media (max-width: 1024px) {
		.form-container {
			grid-template-columns: 1fr;
		}
		
		.form-sidebar {
			order: -1;
		}
	}
	
	/* Mobile improvements */
	@media (max-width: 768px) {
		.form-container {
			gap: var(--space-4);
			padding: 0;
		}
		
		.form-main,
		.form-sidebar {
			gap: var(--space-4);
		}
		
		/* Fix form toolbar buttons to wrap on mobile */
		.form-toolbar {
			flex-wrap: wrap;
		}
		
		.form-toolbar-buttons {
			flex-wrap: wrap;
			gap: var(--space-1);
		}
		
		.form-toolbar-btn {
			min-width: var(--mobile-touch-target);
			min-height: var(--mobile-touch-target);
		}
		
		/* Make image grid more mobile-friendly */
		.image-preview-grid {
			grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
			gap: var(--space-3);
		}
		
		.image-preview {
			aspect-ratio: 1;
		}
		
		/* Stack currency inputs on mobile */
		.form-field-group {
			grid-template-columns: 1fr;
		}
		
		/* Make dropdowns full width */
		.dropdown {
			width: 100%;
		}
		
		/* Better spacing for mobile */
		.sidebar-section {
			background: var(--color-surface);
			border: 1px solid var(--color-border);
			border-radius: var(--radius-lg);
			padding: var(--mobile-padding);
		}
		
		/* Variant items more touch-friendly */
		.variant-item {
			min-height: var(--mobile-touch-target);
			padding: var(--space-3) var(--space-4);
		}
		
		/* Detail items more readable */
		.detail-item {
			flex-direction: column;
			align-items: flex-start;
			gap: var(--space-1);
			padding: var(--space-3) 0;
		}
		
		.detail-label {
			font-size: var(--font-size-xs);
			text-transform: uppercase;
			letter-spacing: 0.5px;
		}
		
		.detail-value {
			font-size: var(--font-size-sm);
			word-break: break-all;
		}
	}
	
	@media (max-width: 480px) {
		.form-container {
			gap: var(--space-3);
		}
		
		.form-main,
		.form-sidebar {
			gap: var(--space-3);
		}
		
		.image-preview-grid {
			grid-template-columns: repeat(2, 1fr);
		}
		
		.sidebar-section {
			padding: var(--space-3);
		}
		
		.form-toolbar-buttons {
			display: none; /* Hide complex toolbar on very small screens */
		}
	}
	
	/* Collections placeholder */
	.dropdown-placeholder {
		padding: var(--space-2) var(--space-3);
		border: 1px dashed var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-surface-hover);
		margin-bottom: var(--space-2);
	}
	
	.dropdown-placeholder .text-muted {
		color: var(--color-text-muted);
		font-size: var(--font-size-sm);
	}
	
	/* Collections debug info */
	.collections-debug {
		margin-bottom: var(--space-2);
	}
	
	.collections-debug small {
		color: var(--color-text-muted);
		font-size: var(--font-size-xs);
	}
	
	.collections-debug .link {
		color: var(--color-accent);
		text-decoration: none;
		font-weight: var(--font-weight-medium);
	}
	
	.collections-debug .link:hover {
		text-decoration: underline;
	}
</style>