// Plugin state management with local caching
// Note: No server-side imports here to avoid client-side issues
export const pluginsState = $state({
  plugins: [],
  loading: false,
  error: '',
  lastFetch: null,
  cacheExpiry: 5 * 60 * 1000 // 5 minutes cache
});

// Actions for managing plugins state
export const pluginsActions = {
  /**
   * Load plugins from server with caching logic
   */
  async loadPlugins(forceRefresh = false) {
    // Check if we need to refresh cache
    const now = Date.now();
    const cacheValid = pluginsState.lastFetch && 
                      (now - pluginsState.lastFetch < pluginsState.cacheExpiry);
    
    // Skip loading if cache is valid and not forcing refresh
    if (cacheValid && !forceRefresh && pluginsState.plugins.length > 0) {
      console.log('📦 Using cached plugins data');
      return;
    }

    // Prevent multiple concurrent loads
    if (pluginsState.loading) {
      console.log('🔄 Plugin loading already in progress');
      return;
    }

    pluginsState.loading = true;
    pluginsState.error = '';

    try {
      console.log('🔄 Loading plugins from server...');
      const response = await fetch('/api/plugins');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch plugins: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📦 Plugin data received:', data);
      
      // Filter for active plugins and transform for menu
      const activePlugins = data.plugins.filter(plugin => plugin.status === 'active');
      console.log('✅ Active plugins:', activePlugins);
      
      const transformedPlugins = activePlugins.map(plugin => ({
        path: plugin.metadata?.ui_path || `/plugins/${plugin.slug}`,
        label: plugin.name,
        icon: plugin.metadata?.icon || "🧩",
        functional: true,
        slug: plugin.slug // Keep slug for future reference
      }));

      pluginsState.plugins = transformedPlugins;
      pluginsState.lastFetch = now;
      pluginsState.error = '';
      
      console.log('🧩 Plugins loaded and cached:', transformedPlugins.length, 'active plugins');
      
    } catch (error) {
      console.error('❌ Failed to load plugins:', error);
      pluginsState.error = error.message;
      // Don't clear existing plugins on error, keep cached data
    } finally {
      pluginsState.loading = false;
    }
  },

  /**
   * Force refresh plugins from server
   */
  async refreshPlugins() {
    console.log('🔄 Force refreshing plugins...');
    return this.loadPlugins(true);
  },

  /**
   * Clear plugins cache
   */
  clearCache() {
    console.log('🗑️ Clearing plugins cache');
    pluginsState.plugins = [];
    pluginsState.lastFetch = null;
    pluginsState.error = '';
  },

  /**
   * Check if cache is expired
   */
  isCacheExpired() {
    if (!pluginsState.lastFetch) return true;
    const now = Date.now();
    return (now - pluginsState.lastFetch) >= pluginsState.cacheExpiry;
  }
};

// Computed getters
export function getActivePlugins() {
  return pluginsState.plugins.filter(plugin => plugin.functional !== false);
}

export function getPluginsForMenu() {
  return pluginsState.plugins;
}

export function getPluginBySlug(slug) {
  return pluginsState.plugins.find(plugin => plugin.slug === slug);
}

// Cache status getters
export function getCacheStatus() {
  const now = Date.now();
  const timeSinceLastFetch = pluginsState.lastFetch ? now - pluginsState.lastFetch : null;
  const timeUntilExpiry = pluginsState.lastFetch ? 
    Math.max(0, pluginsState.cacheExpiry - timeSinceLastFetch) : 0;

  return {
    cached: !!pluginsState.lastFetch,
    expired: pluginsActions.isCacheExpired(),
    timeSinceLastFetch,
    timeUntilExpiry,
    minutesUntilExpiry: Math.ceil(timeUntilExpiry / 1000 / 60)
  };
}