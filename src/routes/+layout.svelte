<script lang="ts">
    import "../app.css";
    import { page } from "$app/stores";
    import { isAuthenticated, authLoaded, logout } from "$lib/stores/auth.js";
    import AuthWall from "$lib/components/AuthWall.svelte";
    import SearchInput from "$lib/components/search/SearchInput.svelte";
    import type { LayoutData } from "./$types";
    import { onMount } from "svelte";
    import { pluginsState, pluginsActions, getPluginsForMenu } from "$lib/state/plugins.svelte.js";

    let { children, data }: { children: any; data: LayoutData } = $props();
    
    let currentPath = $derived($page.url.pathname);
    let isStorefront = $derived(currentPath.startsWith("/store"));
    
    // Mobile state management
    let mobileMenuOpen = $state(false);
    let mobileSearchOpen = $state(false);
    let isMobile = $state(false);
    
    // Load plugins on mount with caching - ONLY for non-store routes
    onMount(() => {
        if (!isStorefront) {
            pluginsActions.loadPlugins();
        }
        
        // Mobile detection
        const checkMobile = () => {
            isMobile = window.innerWidth <= 768;
            // Close mobile menu when switching to desktop
            if (!isMobile) {
                mobileMenuOpen = false;
                mobileSearchOpen = false;
            }
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        
        return () => {
            window.removeEventListener('resize', checkMobile);
        };
    });

    // Handle plugin refresh
    async function handleRefreshPlugins() {
        await pluginsActions.refreshPlugins();
    }

    function handleLogout() {
        logout();
    }
    
    // Mobile navigation functions
    function toggleMobileMenu() {
        mobileMenuOpen = !mobileMenuOpen;
        if (mobileMenuOpen) {
            mobileSearchOpen = false; // Close search when opening menu
        }
    }
    
    function toggleMobileSearch() {
        mobileSearchOpen = !mobileSearchOpen;
        if (mobileSearchOpen) {
            mobileMenuOpen = false; // Close menu when opening search
        }
    }
    
    function closeMobileMenus() {
        mobileMenuOpen = false;
        mobileSearchOpen = false;
    }

    // Define which pages are functional (not demo)
    const functionalPages = new Set(["/settings/users"]);

    // Helper function to check if a page is functional
    function isFunctional(path: string): boolean {
        return functionalPages.has(path);
    }

    // Helper function to get display label with demo suffix
    function getDisplayLabel(path: string, label: string): string {
        return isFunctional(path) ? label : `${label} (demo)`;
    }

    const menuSections = [
        {
            items: [{ path: "/", label: "Home", icon: "🏠", functional: true }],
        },
        {
            items: [
                {
                    path: "/orders",
                    label: "Orders",
                    icon: "💼",
                    functional: true,
                },
            ],
        },
        {
            items: [
                {
                    path: "/waitlists",
                    label: "Waitlists",
                    icon: "⏱️",
                    functional: true,
                },
            ],
        },
        {
            items: [
                {
                    path: "/products",
                    label: "Products",
                    icon: "🏷️",
                    functional: true,
                    subItems: [
                        {
                            path: "/collections",
                            label: "Collections",
                            icon: "📁",
                            functional: true,
                        },
                        {
                            path: "/inventory",
                            label: "Inventory",
                            icon: "📊",
                            functional: true,
                        },
                        {
                            path: "/purchase-orders",
                            label: "Purchase orders",
                            icon: "📄",
                            functional: true,
                        },
                        {
                            path: "/transfers",
                            label: "Transfers",
                            icon: "↔️",
                            functional: true,
                        },
                        {
                            path: "/gift-cards",
                            label: "Gift cards",
                            icon: "🎁",
                            functional: true,
                        },
                    ],
                },
            ],
        },
        {
            items: [
                {
                    path: "/customers",
                    label: "Customers",
                    icon: "👤",
                    functional: true,
                },
            ],
        },
        {
            items: [
                {
                    path: "/discounts",
                    label: "Discounts",
                    icon: "🏷️",
                    functional: true,
                },
            ],
        },
        {
            items: [
                { path: "/live", label: "Live Selling", icon: "📺", functional: true },
            ],
        },
        {
            items: [
                {
                    path: "/settings",
                    label: "Settings",
                    icon: "⚙️",
                    functional: true,
                    subItems: [
                        {
                            path: "/settings/plan",
                            label: "Plan",
                            icon: "📊",
                            functional: false,
                        },
                        {
                            path: "/settings/billing",
                            label: "Billing",
                            icon: "🧾",
                            functional: false,
                        },
                        {
                            path: "/settings/users",
                            label: "Users and permissions",
                            icon: "👥",
                            functional: true,
                        },
                        {
                            path: "/settings/payments",
                            label: "Payments",
                            icon: "💳",
                            functional: false,
                        },
                        {
                            path: "/settings/checkout",
                            label: "Checkout",
                            icon: "🛒",
                            functional: false,
                        },
                        {
                            path: "/settings/customer-accounts",
                            label: "Customer accounts",
                            icon: "👤",
                            functional: false,
                        },
                        {
                            path: "/settings/shipping",
                            label: "Shipping and delivery",
                            icon: "📦",
                            functional: false,
                        },
                        {
                            path: "/settings/taxes",
                            label: "Taxes and duties",
                            icon: "💰",
                            functional: false,
                        },
                        {
                            path: "/settings/locations",
                            label: "Locations",
                            icon: "📍",
                            functional: true,
                        },
                        {
                            path: "/settings/plugins",
                            label: "Plugins and sales channels",
                            icon: "🧩",
                            functional: true,
                        },
                        {
                            path: "/settings/domains",
                            label: "Domains",
                            icon: "🌐",
                            functional: false,
                        },
                        {
                            path: "/settings/customer-events",
                            label: "Customer events",
                            icon: "✨",
                            functional: false,
                        },
                        {
                            path: "/settings/notifications",
                            label: "Notifications",
                            icon: "🔔",
                            functional: false,
                        },
                        {
                            path: "/settings/metafields",
                            label: "Metafields and metaobjects",
                            icon: "📁",
                            functional: false,
                        },
                        {
                            path: "/settings/languages",
                            label: "Languages",
                            icon: "🌍",
                            functional: false,
                        },
                        {
                            path: "/settings/customer-privacy",
                            label: "Customer privacy",
                            icon: "🔒",
                            functional: false,
                        },
                        {
                            path: "/settings/policies",
                            label: "Policies",
                            icon: "📜",
                            functional: false,
                        },
                    ],
                },
            ],
        },
        {
            title: "Sales channels",
            items: [
                {
                    path: "/sales-channels/web-store",
                    label: "Web Store",
                    icon: "🌐",
                },
                {
                    path: "/sales-channels/mobile-app",
                    label: "Mobile App",
                    icon: "📱",
                },
                {
                    path: "/sales-channels/point-of-sale",
                    label: "Point of Sale",
                    icon: "🏪",
                },
            ],
        },
        // Dynamic plugins section - will be added conditionally
    ];

    // Computed menu sections with dynamic plugins using new state management
    let menuSectionsWithPlugins = $state([...menuSections]);
    
    // Update menu sections when plugins change
    $effect(() => {
        const sections = [...menuSections];
        const pluginsForMenu = getPluginsForMenu();
        
        // Add plugins section if there are any active plugins
        if (pluginsForMenu.length > 0) {
            sections.push({
                title: "Plugins",
                items: pluginsForMenu,
                hasReloadButton: true // Flag to show reload button
            });
        }
        
        menuSectionsWithPlugins = sections;
    });

    function isActiveRoute(itemPath: string): boolean {
        if (itemPath === "/") {
            return currentPath === "/";
        }
        return currentPath.startsWith(itemPath);
    }

    function shouldShowSubItems(item: any): boolean {
        if (!item.subItems) return false;

        // Show sub-items if main item is active OR any sub-item is active
        if (isActiveRoute(item.path)) return true;

        return item.subItems.some((subItem: any) =>
            isActiveRoute(subItem.path),
        );
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
                {#if isMobile}
                    <button 
                        class="mobile-menu-toggle" 
                        onclick={toggleMobileMenu}
                        class:active={mobileMenuOpen}
                        title="Toggle menu"
                    >
                        <span class="hamburger-icon"></span>
                    </button>
                {/if}
                <div class="logo">
                    <img src="/android-chrome-512x512.png" alt="BetterCallSold" class="logo-icon" />
                    <span class="logo-text">BetterCallSold</span>
                </div>
            </div>
            
            {#if isMobile}
                <div class="header-center-mobile">
                    <button 
                        class="mobile-search-toggle" 
                        onclick={toggleMobileSearch}
                        class:active={mobileSearchOpen}
                        title="Search"
                    >
                        🔍
                    </button>
                </div>
            {:else}
                <div class="header-center">
                    <SearchInput placeholder="Search products, orders, customers..." />
                </div>
            {/if}
            
            <div class="header-right">
                <div class="header-actions">
                    {#if !isMobile}
                        <button class="header-btn">📧</button>
                        <button class="header-btn">🔔</button>
                    {/if}
                    <button
                        class="header-btn logout-btn"
                        onclick={handleLogout}
                        title="Logout">🚪</button
                    >
                    {#if !isMobile}
                        <div class="user-menu">
                            <span class="store-name">BetterCallSold</span>
                            <div class="user-avatar">CS</div>
                        </div>
                    {/if}
                </div>
            </div>
        </header>

        <!-- Mobile Search Overlay -->
        {#if isMobile && mobileSearchOpen}
            <div class="mobile-search-overlay" onclick={closeMobileMenus}>
                <div class="mobile-search-container" onclick={(e) => e.stopPropagation()}>
                    <div class="mobile-search-header">
                        <SearchInput placeholder="Search..." />
                        <button 
                            class="mobile-search-close" 
                            onclick={closeMobileMenus}
                            title="Close search"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            </div>
        {/if}

        <!-- Mobile Overlay -->
        {#if isMobile && mobileMenuOpen}
            <div class="mobile-overlay" onclick={closeMobileMenus}></div>
        {/if}

        <div class="main-container">
            <!-- Left Sidebar -->
            <aside class="sidebar" class:mobile-open={isMobile && mobileMenuOpen}>
                <nav class="sidebar-nav">
                    {#each menuSectionsWithPlugins as section}
                        <div class="nav-section">
                            {#if section.title}
                                <div class="section-title">
                                    <span class="section-title-text">{section.title}</span>
                                    {#if section.hasReloadButton}
                                        <button 
                                            class="section-reload-btn" 
                                            onclick={handleRefreshPlugins}
                                            disabled={pluginsState.loading}
                                            title="Reload plugins"
                                        >
                                            <span class="reload-icon" class:spinning={pluginsState.loading}>🔄</span>
                                        </button>
                                    {/if}
                                </div>
                            {/if}
                            {#each section.items as item}
                                <a
                                    href={item.path}
                                    class="nav-item"
                                    class:active={isActiveRoute(item.path)}
                                    class:functional={item.functional !== false}
                                    class:demo={item.functional === false}
                                    onclick={isMobile ? closeMobileMenus : undefined}
                                >
                                    <span class="nav-icon">{item.icon}</span>
                                    <span class="nav-label"
                                        >{item.functional === false
                                            ? `${item.label} (demo)`
                                            : item.label}</span
                                    >
                                    {#if item.subItems}
                                        <span
                                            class="nav-arrow"
                                            class:expanded={shouldShowSubItems(
                                                item,
                                            )}>▶</span
                                        >
                                    {/if}
                                </a>
                                {#if shouldShowSubItems(item)}
                                    <div class="sub-items">
                                        {#each item.subItems as subItem}
                                            <a
                                                href={subItem.path}
                                                class="nav-sub-item"
                                                class:active={isActiveRoute(
                                                    subItem.path,
                                                )}
                                                class:functional={subItem.functional !==
                                                    false}
                                                class:demo={subItem.functional ===
                                                    false}
                                                onclick={isMobile ? closeMobileMenus : undefined}
                                            >
                                                <span class="nav-sub-icon"
                                                    >{subItem.icon}</span
                                                >
                                                <span class="nav-sub-label"
                                                    >{subItem.functional ===
                                                    false
                                                        ? `${subItem.label} (demo)`
                                                        : subItem.label}</span
                                                >
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
    <div
        style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: #2c1810;"
    ></div>
{/if}

<style>
    /* Component-specific styles only - Global styles imported via app.css */

    .app-layout {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
    }

    /* Top Header - Exact Shopify style */
    .top-header {
        height: var(--header-height);
        background: var(--color-primary-hover);
        display: flex;
        align-items: center;
        padding: 0 var(--space-4);
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: var(--z-fixed);
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
        border-radius: 3px;
        object-fit: cover;
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
        margin-top: var(--header-height);
        min-height: calc(100vh - var(--header-height));
    }

    /* Left Sidebar - Exact Shopify style */
    .sidebar {
        width: var(--sidebar-width);
        background: var(--color-background);
        border-right: 1px solid var(--color-border);
        position: fixed;
        height: calc(100vh - var(--header-height));
        overflow-y: auto;
        top: var(--header-height);
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
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .section-title-text {
        flex: 1;
    }

    .section-reload-btn {
        background: transparent;
        border: none;
        padding: 2px;
        margin: 0;
        cursor: pointer;
        border-radius: 3px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.1s ease;
        opacity: 0.6;
        width: 16px;
        height: 16px;
    }

    .section-reload-btn:hover {
        background: #e7e7e7;
        opacity: 1;
    }

    .section-reload-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }

    .section-reload-btn:disabled:hover {
        background: transparent;
    }

    .reload-icon {
        font-size: 10px;
        transition: transform 0.3s ease;
        display: inline-block;
    }

    .reload-icon.spinning {
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
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
        transition:
            transform 0.2s ease,
            color 0.1s ease;
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

    /* Demo vs Functional styling */
    .nav-item.demo {
        opacity: 0.6;
        pointer-events: none;
    }

    .nav-item.demo .nav-icon {
        filter: grayscale(1) brightness(0.6);
    }

    .nav-item.demo .nav-label {
        color: #9ca3af;
        font-style: italic;
    }

    .nav-item.functional:hover {
        opacity: 1;
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
        content: "";
        position: absolute;
        left: -20px;
        top: 50%;
        width: 16px;
        height: 1px;
        background: #c9cccf;
        transform: translateY(-50%);
    }

    .nav-sub-item.active::after {
        content: "";
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
        content: "";
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

    /* Demo vs Functional styling for sub-items */
    .nav-sub-item.demo {
        opacity: 0.5;
        pointer-events: none;
    }

    .nav-sub-item.demo .nav-sub-icon {
        opacity: 0.4;
        filter: grayscale(1) brightness(0.7);
    }

    .nav-sub-item.demo .nav-sub-label {
        color: #9ca3af;
        font-style: italic;
    }

    .nav-sub-item.functional:hover {
        opacity: 1;
    }

    .nav-sub-label {
        font-size: 0.8125rem;
        font-weight: inherit;
    }

    /* Main Content */
    .main-content {
        flex: 1;
        margin-left: var(--sidebar-width);
        min-height: calc(100vh - var(--header-height));
        background-color: var(--color-surface);
    }

    /* Global Design System Overrides */
    :global(.settings-card),
    :global(.status-card),
    :global(.logs-card),
    :global(.controls-card),
    :global(.results-card) {
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-sm);
        border: 1px solid var(--color-border);
    }

    :global(.card-header) {
        border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    }

    :global(.setting-input),
    :global(.setting-select) {
        border-radius: var(--radius-md);
        border: 1px solid var(--color-border-dark);
    }

    :global(.setting-input:focus),
    :global(.setting-select:focus) {
        border-color: var(--color-border-focus);
        box-shadow: var(--shadow-focus);
    }

    /* Mobile Menu Toggle */
    .mobile-menu-toggle {
        width: var(--mobile-touch-target);
        height: var(--mobile-touch-target);
        background: transparent;
        border: none;
        color: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--radius-md);
        margin-right: var(--space-2);
        transition: all var(--transition-fast);
        position: relative;
    }

    .mobile-menu-toggle:hover {
        background: rgba(255, 255, 255, 0.1);
    }

    /* Hamburger Icon */
    .hamburger-icon {
        position: relative;
        width: 18px;
        height: 2px;
        background: white;
        transition: all 0.3s ease;
    }

    .hamburger-icon::before,
    .hamburger-icon::after {
        content: '';
        position: absolute;
        width: 18px;
        height: 2px;
        background: white;
        transition: all 0.3s ease;
    }

    .hamburger-icon::before {
        top: -6px;
    }

    .hamburger-icon::after {
        top: 6px;
    }

    /* Animated hamburger to X */
    .mobile-menu-toggle.active .hamburger-icon {
        background: transparent;
    }

    .mobile-menu-toggle.active .hamburger-icon::before {
        top: 0;
        transform: rotate(45deg);
    }

    .mobile-menu-toggle.active .hamburger-icon::after {
        top: 0;
        transform: rotate(-45deg);
    }

    /* Mobile Search Toggle */
    .mobile-search-toggle {
        width: var(--mobile-touch-target);
        height: var(--mobile-touch-target);
        background: transparent;
        border: none;
        color: #b5b5b5;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--radius-md);
        font-size: 16px;
        transition: all var(--transition-fast);
    }

    .mobile-search-toggle:hover,
    .mobile-search-toggle.active {
        background: rgba(255, 255, 255, 0.1);
        color: white;
    }

    /* Mobile Search Overlay */
    .mobile-search-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: var(--z-modal);
        display: flex;
        align-items: flex-start;
        padding-top: var(--mobile-header-height);
    }

    .mobile-search-container {
        width: 100%;
        background: var(--color-surface);
        border-bottom: 1px solid var(--color-border);
        box-shadow: var(--shadow-lg);
    }

    .mobile-search-header {
        display: flex;
        align-items: center;
        padding: var(--space-4);
        gap: var(--space-3);
    }

    .mobile-search-close {
        width: var(--mobile-touch-target);
        height: var(--mobile-touch-target);
        background: transparent;
        border: none;
        color: var(--color-text-muted);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--radius-md);
        font-size: 18px;
        font-weight: bold;
        transition: all var(--transition-fast);
        flex-shrink: 0;
    }

    .mobile-search-close:hover {
        background: var(--color-surface-hover);
        color: var(--color-text);
    }

    /* Mobile Overlay */
    .mobile-overlay {
        position: fixed;
        top: var(--mobile-header-height);
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: calc(var(--z-modal) - 1);
        opacity: 1;
        visibility: visible;
    }

    /* Mobile Responsive Styles */
    @media (max-width: 768px) {
        .top-header {
            height: var(--mobile-header-height);
            padding: 0 var(--mobile-padding);
        }

        .header-left {
            display: flex;
            align-items: center;
            gap: var(--space-2);
            min-width: auto;
        }

        .header-center-mobile {
            flex: 1;
            display: flex;
            justify-content: center;
        }

        .header-right {
            min-width: auto;
            justify-content: flex-end;
        }

        .header-actions {
            gap: var(--space-1);
        }

        .logo-text {
            display: none; /* Hide on small screens */
        }

        .sidebar {
            position: fixed;
            top: var(--mobile-header-height);
            left: 0;
            height: calc(100vh - var(--mobile-header-height));
            width: var(--mobile-sidebar-width);
            background: var(--color-surface);
            box-shadow: var(--shadow-xl);
            transform: translateX(-100%);
            transition: transform 0.3s ease;
            z-index: var(--z-modal);
            overflow-y: auto;
            border-right: 1px solid var(--color-border);
        }

        .sidebar.mobile-open {
            transform: translateX(0);
        }

        .sidebar-nav {
            padding: var(--space-4) 0;
        }

        .nav-item {
            padding: var(--space-4);
            margin: var(--space-1) var(--space-3);
            font-size: var(--font-size-base);
            min-height: var(--mobile-touch-target);
        }

        .nav-sub-item {
            padding: var(--space-3) var(--space-4);
            padding-left: calc(var(--space-4) + var(--space-8));
            margin: var(--space-1) var(--space-3);
            min-height: 40px;
        }

        .main-content {
            margin-left: 0;
            margin-top: var(--mobile-header-height);
            min-height: calc(100vh - var(--mobile-header-height));
        }

        .main-container {
            margin-top: 0;
        }
    }

    /* Smaller mobile screens */
    @media (max-width: 480px) {
        .mobile-search-header {
            padding: var(--space-3);
        }

        .sidebar {
            width: calc(100vw - 40px);
            max-width: 320px;
        }

        .logo {
            font-size: 14px;
        }

        .logo-icon {
            width: 18px;
            height: 18px;
        }
    }
</style>
