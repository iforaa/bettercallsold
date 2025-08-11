<script lang="ts">
	import type { ProductFormData, Collection } from '$lib/types/products';

	interface Props {
		formData: ProductFormData;
		collections?: Collection[];
		uploading?: boolean;
		onSubmit: (data: ProductFormData) => void;
		onFormChange: (data: Partial<ProductFormData>) => void;
	}

	let {
		formData,
		collections = [],
		uploading = false,
		onSubmit,
		onFormChange
	}: Props = $props();

	// Local state for UI interactions
	let showCollectionDropdown = $state(false);
	let collectionSearchTerm = $state('');
	let selectedCollections = $state(formData?.collections || []);

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
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}
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

		<!-- Theme template -->
		<div class="sidebar-section">
			<h3 class="sidebar-title">Theme template</h3>
			<div class="form-field">
				<select class="form-select">
					<option>Default product</option>
				</select>
			</div>
		</div>
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

	/* Responsive adjustments */
	@media (max-width: 1024px) {
		.form-container {
			grid-template-columns: 1fr;
		}
		
		.form-sidebar {
			order: -1;
		}
	}
</style>