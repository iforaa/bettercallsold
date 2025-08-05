<script lang="ts">
	import { page } from '$app/stores';
	import { isAuthenticated, authLoaded, logout } from '$lib/stores/auth.js';
	import AuthWall from '$lib/components/AuthWall.svelte';
	import type { LayoutData } from './$types';

	let { children, data }: { children: any, data: LayoutData } = $props();
	
	function handleLogout() {
		logout();
	}
	
	let currentPath = $derived($page.url.pathname);
	let isStorefront = $derived(currentPath.startsWith('/store'));
	
	const menuSections = [
		{
			items: [
				{ path: '/', label: 'Home', icon: '🏠' }
			]
		},
		{
			items: [
				{ path: '/orders', label: 'Orders', icon: '💼' }
			]
		},
		{
			items: [
				{ path: '/waitlists', label: 'Waitlists', icon: '⏱️' }
			]
		},
		{
			items: [
				{ path: '/products', label: 'Products', icon: '🏷️', subItems: [
					{ path: '/collections', label: 'Collections', icon: '📁' },
					{ path: '/inventory', label: 'Inventory', icon: '📊' },
					{ path: '/purchase-orders', label: 'Purchase orders', icon: '📄' },
					{ path: '/transfers', label: 'Transfers', icon: '↔️' },
					{ path: '/gift-cards', label: 'Gift cards', icon: '🎁' }
				]}
			]
		},
		{
			items: [
				{ path: '/customers', label: 'Customers', icon: '👤' }
			]
		},
		{
			items: [
				{ path: '/live', label: 'Live', icon: '📺' },
				{ path: '/replays', label: 'Replays', icon: '🎬' }
			]
		},
		{
			items: [
				{ path: '/team', label: 'Team', icon: '👤' },
				{ path: '/setup', label: 'Setup', icon: '⚙️' }
			]
		},
		{
			title: 'Sales channels',
			items: [
				{ path: '/sales-channels/web-store', label: 'Web Store', icon: '🌐' },
				{ path: '/sales-channels/mobile-app', label: 'Mobile App', icon: '📱' },
				{ path: '/sales-channels/point-of-sale', label: 'Point of Sale', icon: '🏪' }
			]
		},
		{
			title: 'Plugins',
			items: [
				{ path: '/plugins/klaviyo', label: 'Klaviyo (demo)', icon: '📧' },
				{ path: '/plugins/klarna', label: 'Klarna (demo)', icon: '💳' },
				{ path: '/plugins/uppromote', label: 'UpPromote (demo)', icon: '🤝' },
				{ path: '/cs-sync', label: 'CS Sync', icon: '🔄' },
				{ path: '/test-cs-api', label: 'Test CS API', icon: '🧪' }
			]
		}
	];
	
	function isActiveRoute(itemPath: string): boolean {
		if (itemPath === '/') {
			return currentPath === '/';
		}
		return currentPath.startsWith(itemPath);
	}

	function shouldShowSubItems(item: any): boolean {
		if (!item.subItems) return false;
		
		// Show sub-items if main item is active OR any sub-item is active
		if (isActiveRoute(item.path)) return true;
		
		return item.subItems.some((subItem: any) => isActiveRoute(subItem.path));
	}
</script>

{#if isStorefront}
	<!-- Storefront - No admin UI, accessible to everyone -->
	{@render children()}
{:else if $authLoaded && $isAuthenticated}
	<!-- Admin Interface -->
	<div class="app-layout">
		<!-- Top Header -->
		<header class="top-header">
			<div class="header-left">
				<div class="logo">
					<div class="logo-icon">🛒</div>
					<span class="logo-text">BetterCallSold</span>
				</div>
			</div>
			<div class="header-center">
				<div class="search-container">
					<div class="search-icon">🔍</div>
					<input type="text" placeholder="Search" class="search-input" />
				</div>
			</div>
			<div class="header-right">
				<div class="header-actions">
					<button class="header-btn">📧</button>
					<button class="header-btn">🔔</button>
					<button class="header-btn logout-btn" onclick={handleLogout} title="Logout">🚪</button>
					<div class="user-menu">
						<span class="store-name">BetterCallSold</span>
						<div class="user-avatar">CS</div>
					</div>
				</div>
			</div>
		</header>

		<div class="main-container">
			<!-- Left Sidebar -->
			<aside class="sidebar">
				<nav class="sidebar-nav">
					{#each menuSections as section}
						<div class="nav-section">
							{#if section.title}
								<div class="section-title">{section.title}</div>
							{/if}
							{#each section.items as item}
								<a 
									href={item.path} 
									class="nav-item"
									class:active={isActiveRoute(item.path)}
								>
									<span class="nav-icon">{item.icon}</span>
									<span class="nav-label">{item.label}</span>
									{#if item.subItems}
										<span class="nav-arrow" class:expanded={shouldShowSubItems(item)}>▶</span>
									{/if}
								</a>
								{#if shouldShowSubItems(item)}
									<div class="sub-items">
										{#each item.subItems as subItem}
											<a 
												href={subItem.path} 
												class="nav-sub-item"
												class:active={isActiveRoute(subItem.path)}
											>
												<span class="nav-sub-icon">{subItem.icon}</span>
												<span class="nav-sub-label">{subItem.label}</span>
											</a>
										{/each}
								</div>
							{/if}
						{/each}
					</div>
				{/each}
			</nav>
		</aside>
		
		<!-- Main Content -->
		<main class="main-content">
			{@render children()}
		</main>
	</div>
	</div>
{:else if $authLoaded}
	<AuthWall />
{:else}
	<!-- Loading state - prevent flash -->
	<div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: #2c1810;"></div>
{/if}

<style>
	:global(*) {
		box-sizing: border-box;
	}

	:global(body) {
		margin: 0;
		padding: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
		background-color: #f6f6f7;
		color: #202223;
		line-height: 1.5;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
		font-weight: 400;
	}

	:global(h1, h2, h3, h4, h5, h6) {
		margin: 0;
		font-weight: 600;
		line-height: 1.25;
	}

	:global(p) {
		margin: 0 0 1rem 0;
	}

	:global(a) {
		color: #005bd3;
		text-decoration: none;
		transition: color 0.15s ease-in-out;
	}

	:global(a:hover) {
		color: #004c99;
	}

	:global(button) {
		font-family: inherit;
		font-size: inherit;
		line-height: inherit;
		margin: 0;
	}

	:global(input, select, textarea) {
		font-family: inherit;
		font-size: inherit;
		line-height: inherit;
	}
	
	.app-layout {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	/* Top Header - Exact Shopify style */
	.top-header {
		height: 48px;
		background: #1a1a1a;
		display: flex;
		align-items: center;
		padding: 0 16px;
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 1000;
		border-bottom: 1px solid #2a2a2a;
	}

	.header-left {
		display: flex;
		align-items: center;
		min-width: 200px;
	}

	.logo {
		display: flex;
		align-items: center;
		gap: 8px;
		color: white;
		font-weight: 500;
		font-size: 16px;
		padding: 0 8px;
	}

	.logo-icon {
		width: 20px;
		height: 20px;
		background: #00a96e;
		border-radius: 3px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 12px;
		filter: grayscale(1) brightness(2);
	}

	.logo-text {
		color: white;
		font-weight: 500;
		font-style: italic;
	}

	.header-center {
		flex: 1;
		display: flex;
		justify-content: center;
		max-width: 400px;
		margin: 0 auto;
	}

	.search-container {
		position: relative;
		width: 100%;
		max-width: 360px;
	}

	.search-input {
		width: 100%;
		height: 28px;
		padding: 0 32px 0 28px;
		background: #2a2a2a;
		border: 1px solid transparent;
		border-radius: 6px;
		color: #e3e3e3;
		font-size: 13px;
		outline: none;
		font-weight: 400;
	}

	.search-input::placeholder {
		color: #b5b5b5;
		font-weight: 400;
	}

	.search-input:focus {
		background: #3a3a3a;
		border-color: #4a90e2;
		box-shadow: 0 0 0 1px #4a90e2;
	}

	.search-icon {
		position: absolute;
		left: 8px;
		top: 50%;
		transform: translateY(-50%);
		color: #b5b5b5;
		font-size: 14px;
		pointer-events: none;
	}

	.header-right {
		display: flex;
		justify-content: flex-end;
		align-items: center;
		min-width: 200px;
		gap: 8px;
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.header-btn {
		width: 28px;
		height: 28px;
		background: transparent;
		border: none;
		border-radius: 4px;
		color: #b5b5b5;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 14px;
		transition: all 0.1s ease;
		filter: grayscale(1) brightness(0.7);
	}

	.header-btn:hover {
		background: #2a2a2a;
		filter: grayscale(1) brightness(1);
	}

	.user-menu {
		margin-left: 8px;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.store-name {
		color: #b5b5b5;
		font-size: 13px;
		font-weight: 400;
		margin-right: 8px;
	}

	.user-avatar {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: #4a90e2;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 500;
		color: white;
		font-size: 11px;
		cursor: pointer;
	}

	/* Main Container */
	.main-container {
		display: flex;
		margin-top: 48px;
		min-height: calc(100vh - 48px);
	}
	
	/* Left Sidebar - Exact Shopify style */
	.sidebar {
		width: 232px;
		background: #f6f6f7;
		border-right: 1px solid #e3e3e3;
		position: fixed;
		height: calc(100vh - 48px);
		overflow-y: auto;
		top: 48px;
		left: 0;
	}
	
	.sidebar-nav {
		padding: 8px 0;
	}

	.nav-section {
		margin-bottom: 4px;
	}

	.section-title {
		padding: 8px 16px 4px 16px;
		font-size: 11px;
		font-weight: 600;
		color: #6b7280;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		margin-top: 16px;
		margin-bottom: 4px;
	}
	
	.nav-item {
		display: flex;
		align-items: center;
		padding: 6px 12px;
		color: #303030;
		text-decoration: none;
		transition: all 0.1s ease;
		position: relative;
		margin: 0 8px;
		border-radius: 6px;
		font-size: 13px;
		font-weight: 500;
		line-height: 20px;
	}
	
	.nav-item:hover {
		background: #e7e7e7;
		color: #1a1a1a;
	}
	
	.nav-item.active {
		background: white;
		color: #1a1a1a;
		font-weight: 600;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.nav-item.active::before {
		display: none;
	}
	
	.nav-icon {
		margin-right: 8px;
		font-size: 16px;
		width: 20px;
		text-align: center;
		flex-shrink: 0;
		filter: grayscale(1) brightness(0.4);
		transition: filter 0.1s ease;
	}

	.nav-item:hover .nav-icon {
		filter: grayscale(1) brightness(0.2);
	}

	.nav-item.active .nav-icon {
		filter: grayscale(1) brightness(0.2);
	}
	
	.nav-label {
		font-size: 13px;
		font-weight: inherit;
		flex: 1;
	}

	.nav-arrow {
		margin-left: auto;
		font-size: 10px;
		color: #6b7280;
		transition: transform 0.2s ease, color 0.1s ease;
		transform: rotate(0deg);
		flex-shrink: 0;
	}

	.nav-arrow.expanded {
		transform: rotate(90deg);
	}

	.nav-item:hover .nav-arrow {
		color: #1a1a1a;
	}

	.nav-item.active .nav-arrow {
		color: #1a1a1a;
	}

	/* Sub Items */
	.sub-items {
		margin-left: 8px;
		margin-bottom: 4px;
		position: relative;
	}

	.nav-sub-item {
		display: flex;
		align-items: center;
		padding: 4px 12px;
		padding-left: 36px;
		color: #6b7280;
		text-decoration: none;
		transition: all 0.1s ease;
		margin: 0 8px;
		border-radius: 6px;
		font-size: 12px;
		font-weight: 400;
		line-height: 18px;
		position: relative;
	}

	.nav-sub-item:hover {
		background: #e7e7e7;
		color: #1a1a1a;
	}

	.nav-sub-item.active {
		background: white;
		color: #1a1a1a;
		font-weight: 500;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	/* Curved connecting line for active submenu items */
	.nav-sub-item.active::before {
		content: '';
		position: absolute;
		left: -20px;
		top: 50%;
		width: 16px;
		height: 1px;
		background: #c9cccf;
		transform: translateY(-50%);
	}

	.nav-sub-item.active::after {
		content: '';
		position: absolute;
		left: -28px;
		top: 50%;
		width: 8px;
		height: 8px;
		border: 1px solid #c9cccf;
		border-right: none;
		border-top: none;
		border-radius: 0 0 0 4px;
		transform: translateY(-50%);
	}

	/* Vertical connecting line for the parent menu */
	.sub-items::before {
		content: '';
		position: absolute;
		left: 4px;
		top: -8px;
		bottom: 0;
		width: 1px;
		background: #c9cccf;
	}

	.nav-sub-icon {
		margin-right: 0.75rem;
		font-size: 0.875rem;
		width: 16px;
		text-align: center;
		opacity: 0.6;
	}

	.nav-sub-item.active .nav-sub-icon {
		opacity: 1;
	}

	.nav-sub-label {
		font-size: 0.8125rem;
		font-weight: inherit;
	}
	
	/* Main Content */
	.main-content {
		flex: 1;
		margin-left: 232px;
		min-height: calc(100vh - 48px);
		background-color: white;
		padding: 16px;
	}

	/* Global rounded corners for content cards */
	:global(.page) {
		border-radius: 8px;
		overflow: hidden;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	:global(.settings-card),
	:global(.status-card),
	:global(.logs-card),
	:global(.controls-card),
	:global(.results-card) {
		border-radius: 8px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		border: 1px solid #e3e3e3;
	}

	:global(.card-header) {
		border-radius: 8px 8px 0 0;
	}

	:global(.btn-primary),
	:global(.btn-secondary) {
		border-radius: 6px;
	}

	:global(.setting-input),
	:global(.setting-select) {
		border-radius: 6px;
		border: 1px solid #c9cccf;
	}

	:global(.setting-input:focus),
	:global(.setting-select:focus) {
		border-color: #005bd3;
		box-shadow: 0 0 0 1px #005bd3;
	}
	
	@media (max-width: 768px) {
		.sidebar {
			transform: translateX(-100%);
			transition: transform 0.3s ease;
		}
		
		.main-content {
			margin-left: 0;
		}

		.header-left,
		.header-right {
			width: auto;
		}

		.header-center {
			display: none;
		}
	}
</style>