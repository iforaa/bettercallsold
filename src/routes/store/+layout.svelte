<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';

	let { children } = $props();

	// Store settings state
	let settings = $state(null);
	let loading = $state(true);
	let cartOpen = $state(false);
	let cartItems = $state([]);
	let cartTotal = $derived(() => {
		return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
	});
	
	// Derived values from settings
	let storeName = $derived(settings?.store_name || 'My Store');
	let primaryColor = $derived(settings?.primary_color || '#1a1a1a');
	let secondaryColor = $derived(settings?.secondary_color || '#6b7280');
	let accentColor = $derived(settings?.accent_color || '#3b82f6');
	let headerNavigation = $derived(settings?.header_navigation || ['Home', 'Catalog', 'Contact']);
	let headerLogoUrl = $derived(settings?.header_logo_url);
	let footerEnabled = $derived(settings?.footer_enabled !== false);
	let footerSections = $derived(settings?.footer_sections || []);
	let footerNewsletterEnabled = $derived(settings?.footer_newsletter_enabled !== false);
	let footerText = $derived(settings?.footer_text || 'Sign up for our newsletter');

	// Current path for active navigation
	let currentPath = $derived($page.url.pathname);

	// Load store settings
	async function loadSettings() {
		if (!browser) return;
		
		try {
			const response = await fetch('/api/webstore/settings');
			if (response.ok) {
				settings = await response.json();
			}
		} catch (error) {
			console.error('Failed to load store settings:', error);
		} finally {
			loading = false;
		}
	}

	// Load cart from localStorage
	function loadCart() {
		if (!browser) return;
		try {
			const savedCart = localStorage.getItem('cart');
			if (savedCart) {
				cartItems = JSON.parse(savedCart);
			}
		} catch (error) {
			console.error('Failed to load cart:', error);
			cartItems = [];
		}
	}

	// Save cart to localStorage
	function saveCart() {
		if (!browser) return;
		try {
			localStorage.setItem('cart', JSON.stringify(cartItems));
		} catch (error) {
			console.error('Failed to save cart:', error);
		}
	}

	// Remove item from cart
	function removeFromCart(variantId: string) {
		cartItems = cartItems.filter(item => item.variantId !== variantId);
		saveCart();
	}

	// Update item quantity
	function updateQuantity(variantId: string, newQuantity: number) {
		if (newQuantity <= 0) {
			removeFromCart(variantId);
			return;
		}
		
		cartItems = cartItems.map(item => 
			item.variantId === variantId 
				? { ...item, quantity: newQuantity }
				: item
		);
		saveCart();
	}

	// Format currency
	function formatCurrency(amount: number) {
		if (!amount) return '$0.00';
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(amount);
	}

	// Navigation helper
	function getNavLink(navItem: string): string {
		const lower = navItem.toLowerCase();
		switch (lower) {
			case 'home': return '/store';
			case 'catalog': return '/store/catalog';
			case 'contact': return '/store/contact';
			default: return `/store/${lower.replace(' ', '-')}`;
		}
	}

	// Toggle cart
	function toggleCart() {
		cartOpen = !cartOpen;
	}

	// Initialize newsletter email
	let newsletterEmail = $state('');

	function handleNewsletterSubmit(event: Event) {
		event.preventDefault();
		// TODO: Implement newsletter signup
		console.log('Newsletter signup:', newsletterEmail);
		newsletterEmail = '';
	}

	// Load settings and cart on mount
	onMount(() => {
		loadSettings();
		loadCart();
	});

	// Dynamic CSS custom properties
	$effect(() => {
		if (browser && settings) {
			const root = document.documentElement;
			root.style.setProperty('--store-primary-color', primaryColor);
			root.style.setProperty('--store-secondary-color', secondaryColor);
			root.style.setProperty('--store-accent-color', accentColor);
		}
	});
</script>

<svelte:head>
	<title>{storeName}</title>
	<meta name="description" content={settings?.meta_description || `Shop at ${storeName}`} />
	<meta name="keywords" content={settings?.meta_keywords || ''} />
</svelte:head>

{#if !loading}
	<div class="storefront-layout">
		<!-- Header -->
		<header class="storefront-header">
			<div class="header-container">
				<!-- Left Navigation -->
				<nav class="header-nav">
					{#each headerNavigation as navItem}
						<a 
							href={getNavLink(navItem)} 
							class="nav-link"
							class:active={currentPath === getNavLink(navItem)}
						>
							{navItem}
						</a>
					{/each}
				</nav>

				<!-- Center Logo/Store Name -->
				<div class="header-logo">
					<a href="/store" class="logo-link">
						{#if headerLogoUrl}
							<img src={headerLogoUrl} alt={storeName} class="logo-image" />
						{:else}
							<span class="logo-text">{storeName}</span>
						{/if}
					</a>
				</div>

				<!-- Right Actions -->
				<div class="header-actions">
					<button class="action-btn cart-btn" onclick={toggleCart}>
						<span class="icon">🛒</span>
						{#if cartItems.length > 0}
							<span class="cart-count">{cartItems.length}</span>
						{/if}
					</button>
				</div>
			</div>
		</header>

		<!-- Main Content -->
		<main class="storefront-main">
			{@render children()}
		</main>

		<!-- Footer -->
		{#if footerEnabled}
			<footer class="storefront-footer">
				<div class="footer-container">
					<div class="footer-content">
						<!-- Footer Sections -->
						{#if footerSections.length > 0}
							<div class="footer-sections">
								{#each footerSections as section}
									<div class="footer-section">
										<h4 class="footer-section-title">{section.title}</h4>
										{#if section.links}
											<ul class="footer-links">
												{#each section.links as link}
													<li>
														<a href={link.url} class="footer-link">{link.label}</a>
													</li>
												{/each}
											</ul>
										{/if}
									</div>
								{/each}
							</div>
						{/if}

						<!-- Newsletter Signup -->
						{#if footerNewsletterEnabled}
							<div class="newsletter-section">
								<h4 class="newsletter-title">Connect</h4>
								<p class="newsletter-text">{footerText}</p>
								<form class="newsletter-form" onsubmit={handleNewsletterSubmit}>
									<div class="newsletter-input-group">
										<input 
											type="email" 
											class="newsletter-input"
											bind:value={newsletterEmail}
											placeholder="Email address"
											required
										/>
										<button type="submit" class="newsletter-submit">→</button>
									</div>
								</form>
							</div>
						{/if}
					</div>

					<!-- Store Name at Bottom -->
					<div class="footer-bottom">
						<div class="footer-logo">
							<span class="footer-store-name">{storeName}</span>
						</div>
					</div>
				</div>
			</footer>
		{/if}

		<!-- Shopping Cart (Slide-out) -->
		{#if cartOpen}
			<div class="cart-overlay" onclick={toggleCart}></div>
			<div class="cart-panel" class:open={cartOpen}>
				<div class="cart-header">
					<h3 class="cart-title">Cart</h3>
					<button class="cart-close" onclick={toggleCart}>✕</button>
				</div>
				<div class="cart-content">
					{#if cartItems.length === 0}
						<div class="cart-empty">
							<p>Your cart is empty</p>
						</div>
					{:else}
						<div class="cart-items">
							{#each cartItems as item}
								<div class="cart-item">
									<div class="cart-item-image">
										{#if item.image}
											<img src={item.image} alt={item.productName} />
										{:else}
											<div class="cart-item-placeholder">📦</div>
										{/if}
									</div>
									<div class="cart-item-details">
										<h4 class="cart-item-name">{item.productName}</h4>
										{#if item.color || item.size}
											<div class="cart-item-variants">
												{#if item.color}<span class="variant-badge">{item.color}</span>{/if}
												{#if item.size}<span class="variant-badge">{item.size}</span>{/if}
											</div>
										{/if}
										<div class="cart-item-price">{formatCurrency(item.price)}</div>
									</div>
									<div class="cart-item-quantity">
										<button 
											class="quantity-btn"
											onclick={() => updateQuantity(item.variantId, item.quantity - 1)}
										>
											−
										</button>
										<span class="quantity-value">{item.quantity}</span>
										<button 
											class="quantity-btn"
											onclick={() => updateQuantity(item.variantId, item.quantity + 1)}
										>
											+
										</button>
									</div>
									<button 
										class="cart-item-remove"
										onclick={() => removeFromCart(item.variantId)}
									>
										✕
									</button>
								</div>
							{/each}
						</div>
					{/if}
				</div>
				{#if cartItems.length > 0}
					<div class="cart-footer">
						<div class="cart-total">
							<strong>Total: {formatCurrency(cartTotal)}</strong>
						</div>
						<button class="checkout-btn">Checkout</button>
					</div>
				{/if}
			</div>
		{/if}
	</div>
{:else}
	<!-- Loading state -->
	<div class="storefront-loading">
		<div class="loading-spinner"></div>
		<p>Loading store...</p>
	</div>
{/if}

<style>
	/* CSS Custom Properties for dynamic theming */
	:global(:root) {
		--store-primary-color: #1a1a1a;
		--store-secondary-color: #6b7280;
		--store-accent-color: #3b82f6;
	}

	/* Reset and base styles */
	:global(body) {
		margin: 0;
		padding: 0;
		font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		line-height: 1.6;
		color: #1f2937;
		background: #ffffff;
	}

	.storefront-layout {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	/* Header Styles */
	.storefront-header {
		background: white;
		border-bottom: 1px solid #e5e7eb;
		position: sticky;
		top: 0;
		z-index: 100;
	}

	.header-container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 1rem;
		height: 60px;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.header-nav {
		display: flex;
		gap: 2rem;
		flex: 1;
	}

	.nav-link {
		color: var(--store-primary-color);
		text-decoration: none;
		font-weight: 500;
		font-size: 0.875rem;
		text-transform: uppercase;
		letter-spacing: 0.025em;
		transition: color 0.2s ease;
	}

	.nav-link:hover,
	.nav-link.active {
		color: var(--store-accent-color);
	}

	.header-logo {
		flex: 1;
		display: flex;
		justify-content: center;
	}

	.logo-link {
		color: var(--store-primary-color);
		text-decoration: none;
		font-size: 1.5rem;
		font-weight: 600;
		letter-spacing: -0.025em;
	}

	.logo-image {
		height: 32px;
		width: auto;
	}

	.logo-text {
		color: var(--store-primary-color);
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex: 1;
		justify-content: flex-end;
	}


	.action-btn {
		background: none;
		border: none;
		padding: 0.5rem;
		cursor: pointer;
		color: var(--store-primary-color);
		position: relative;
		transition: color 0.2s ease;
	}

	.action-btn:hover {
		color: var(--store-accent-color);
	}

	.icon {
		font-size: 1.25rem;
	}

	.cart-count {
		position: absolute;
		top: 0;
		right: 0;
		background: var(--store-accent-color);
		color: white;
		font-size: 0.75rem;
		font-weight: 600;
		border-radius: 50%;
		width: 18px;
		height: 18px;
		display: flex;
		align-items: center;
		justify-content: center;
		line-height: 1;
	}

	/* Main Content */
	.storefront-main {
		flex: 1;
	}

	/* Footer Styles */
	.storefront-footer {
		background: #f9fafb;
		border-top: 1px solid #e5e7eb;
		margin-top: auto;
	}

	.footer-container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 3rem 1rem 2rem;
	}

	.footer-content {
		display: grid;
		grid-template-columns: 2fr 1fr;
		gap: 3rem;
		margin-bottom: 2rem;
	}

	.footer-sections {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 2rem;
	}

	.footer-section-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--store-primary-color);
		margin-bottom: 1rem;
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}

	.footer-links {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.footer-links li {
		margin-bottom: 0.5rem;
	}

	.footer-link {
		color: var(--store-secondary-color);
		text-decoration: none;
		font-size: 0.875rem;
		transition: color 0.2s ease;
	}

	.footer-link:hover {
		color: var(--store-primary-color);
	}

	.newsletter-section {
		display: flex;
		flex-direction: column;
	}

	.newsletter-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--store-primary-color);
		margin-bottom: 1rem;
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}

	.newsletter-text {
		color: var(--store-secondary-color);
		font-size: 0.875rem;
		margin-bottom: 1rem;
	}

	.newsletter-form {
		width: 100%;
	}

	.newsletter-input-group {
		display: flex;
		max-width: 300px;
	}

	.newsletter-input {
		flex: 1;
		padding: 0.75rem;
		border: 1px solid #d1d5db;
		border-right: none;
		font-size: 0.875rem;
		outline: none;
	}

	.newsletter-input:focus {
		border-color: var(--store-accent-color);
	}

	.newsletter-submit {
		background: var(--store-primary-color);
		color: white;
		border: 1px solid var(--store-primary-color);
		padding: 0.75rem 1rem;
		cursor: pointer;
		font-size: 1rem;
		transition: background-color 0.2s ease;
	}

	.newsletter-submit:hover {
		background: var(--store-accent-color);
		border-color: var(--store-accent-color);
	}

	.footer-bottom {
		border-top: 1px solid #e5e7eb;
		padding-top: 2rem;
		text-align: center;
	}

	.footer-store-name {
		font-size: 2rem;
		font-weight: 300;
		color: var(--store-secondary-color);
		letter-spacing: 0.05em;
	}

	/* Cart Panel */
	.cart-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		z-index: 200;
	}

	.cart-panel {
		position: fixed;
		top: 0;
		right: 0;
		height: 100vh;
		width: 400px;
		background: white;
		box-shadow: -4px 0 6px rgba(0, 0, 0, 0.1);
		transform: translateX(100%);
		transition: transform 0.3s ease;
		z-index: 201;
		display: flex;
		flex-direction: column;
	}

	.cart-panel.open {
		transform: translateX(0);
	}

	.cart-header {
		padding: 1rem;
		border-bottom: 1px solid #e5e7eb;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.cart-title {
		font-size: 1.125rem;
		font-weight: 600;
		margin: 0;
	}

	.cart-close {
		background: none;
		border: none;
		font-size: 1.5rem;
		cursor: pointer;
		color: var(--store-secondary-color);
	}

	.cart-content {
		flex: 1;
		padding: 1rem;
		overflow-y: auto;
	}

	.cart-empty {
		text-align: center;
		color: var(--store-secondary-color);
		margin-top: 2rem;
	}

	.cart-items {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.cart-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 0;
		border-bottom: 1px solid #f3f4f6;
	}

	.cart-item:last-child {
		border-bottom: none;
	}

	.cart-item-image {
		width: 60px;
		height: 60px;
		border-radius: 6px;
		overflow: hidden;
		background: #f9fafb;
		flex-shrink: 0;
	}

	.cart-item-image img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.cart-item-placeholder {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.5rem;
		color: var(--store-secondary-color);
	}

	.cart-item-details {
		flex: 1;
		min-width: 0;
	}

	.cart-item-name {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--store-primary-color);
		margin: 0 0 0.25rem 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.cart-item-variants {
		display: flex;
		gap: 0.25rem;
		margin-bottom: 0.25rem;
	}

	.variant-badge {
		background: #f3f4f6;
		color: var(--store-secondary-color);
		font-size: 0.75rem;
		padding: 0.125rem 0.375rem;
		border-radius: 4px;
		font-weight: 500;
	}

	.cart-item-price {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--store-accent-color);
	}

	.cart-item-quantity {
		display: flex;
		align-items: center;
		border: 1px solid #e5e7eb;
		border-radius: 4px;
		overflow: hidden;
	}

	.cart-item-quantity .quantity-btn {
		width: 28px;
		height: 28px;
		border: none;
		background: white;
		color: var(--store-primary-color);
		cursor: pointer;
		font-size: 0.875rem;
		font-weight: 600;
		transition: background-color 0.2s ease;
	}

	.cart-item-quantity .quantity-btn:hover {
		background: #f9fafb;
	}

	.quantity-value {
		min-width: 32px;
		text-align: center;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--store-primary-color);
		border-left: 1px solid #e5e7eb;
		border-right: 1px solid #e5e7eb;
		line-height: 28px;
	}

	.cart-item-remove {
		width: 24px;
		height: 24px;
		border: none;
		background: none;
		color: var(--store-secondary-color);
		cursor: pointer;
		font-size: 0.875rem;
		border-radius: 4px;
		transition: all 0.2s ease;
		flex-shrink: 0;
	}

	.cart-item-remove:hover {
		background: #fee2e2;
		color: #dc2626;
	}

	.cart-footer {
		padding: 1rem;
		border-top: 1px solid #e5e7eb;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.cart-total {
		text-align: center;
		font-size: 1.125rem;
		color: var(--store-primary-color);
	}

	.checkout-btn {
		width: 100%;
		background: var(--store-primary-color);
		color: white;
		border: none;
		padding: 0.75rem;
		font-size: 0.875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.025em;
		cursor: pointer;
		transition: background-color 0.2s ease;
	}

	.checkout-btn:hover {
		background: var(--store-accent-color);
	}

	/* Loading State */
	.storefront-loading {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1rem;
	}

	.loading-spinner {
		width: 40px;
		height: 40px;
		border: 4px solid #f3f4f6;
		border-top-color: var(--store-accent-color);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	/* Responsive Design */
	@media (max-width: 768px) {
		.header-container {
			padding: 0 0.5rem;
		}

		.header-nav {
			gap: 1rem;
		}

		.nav-link {
			font-size: 0.8125rem;
		}

		.header-actions {
			gap: 0.5rem;
		}

		.footer-content {
			grid-template-columns: 1fr;
			gap: 2rem;
		}

		.footer-sections {
			grid-template-columns: repeat(2, 1fr);
		}

		.cart-panel {
			width: 100%;
		}

		.newsletter-input-group {
			max-width: none;
		}
	}

	@media (max-width: 480px) {
		.header-nav {
			display: none;
		}

		.header-logo {
			flex: none;
		}

		.footer-sections {
			grid-template-columns: 1fr;
		}
	}
</style>