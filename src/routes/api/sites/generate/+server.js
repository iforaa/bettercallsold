import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse, badRequestResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';
import { getLiquidEngine } from '$lib/liquid/engine.js';

/**
 * Independent Site Generator
 * Generates complete static websites from liquid templates
 */
class IndependentSiteGenerator {
  constructor(tenantId, config = {}) {
    this.tenantId = tenantId;
    this.config = {
      apiBaseUrl: config.apiBaseUrl || 'http://localhost:5173/api',
      siteName: config.siteName || 'My Store',
      includeApiClient: config.includeApiClient !== false,
      ...config
    };
    this.liquidEngine = getLiquidEngine();
    this.generatedFiles = new Map();
  }

  /**
   * Generate complete independent website
   */
  async generateSite() {
    try {
      console.log(`🚀 Starting site generation for tenant: ${this.tenantId}`);

      // 1. Get all active templates
      const templates = await this.getTemplates();
      console.log(`📄 Found ${templates.length} templates`);

      // 2. Build store context
      const context = await this.buildStoreContext();
      console.log(`🏪 Built store context for: ${context.store.name}`);

      // 3. Generate pages
      await this.generatePages(templates, context);

      // 4. Generate API client
      if (this.config.includeApiClient) {
        await this.generateApiClient();
      }

      // 5. Generate theme CSS
      await this.generateThemeCSS(context);

      // 6. Generate deployment configs
      await this.generateDeploymentConfigs();

      // 7. Generate README
      await this.generateReadme(context);

      console.log(`✅ Site generation complete! Generated ${this.generatedFiles.size} files`);

      return {
        success: true,
        files: Array.from(this.generatedFiles.entries()).map(([path, content]) => ({
          path,
          size: content.length,
          type: this.getFileType(path)
        })),
        config: this.config,
        totalSize: Array.from(this.generatedFiles.values())
          .reduce((total, content) => total + content.length, 0)
      };

    } catch (error) {
      console.error('Site generation error:', error);
      throw error;
    }
  }

  /**
   * Get all templates for site generation
   */
  async getTemplates() {
    const templatesQuery = await query(`
      SELECT 
        id, template_type, template_name, liquid_content,
        settings_schema, default_settings, api_dependencies
      FROM liquid_templates
      WHERE tenant_id = $1 AND is_active = true
      ORDER BY template_type, template_name
    `, [this.tenantId]);

    return templatesQuery.rows;
  }

  /**
   * Build comprehensive store context
   */
  async buildStoreContext() {
    // Get store settings
    const storeSettingsQuery = await query(`
      SELECT * FROM webstore_settings WHERE tenant_id = $1
    `, [this.tenantId]);

    const storeSettings = storeSettingsQuery.rows[0] || {};

    // Get products
    const productsQuery = await query(`
      SELECT 
        id, name, description, price, images, status, tags,
        COALESCE(
          (SELECT json_agg(json_build_object(
            'id', i.id,
            'quantity', i.quantity,
            'variant_combination', i.variant_combination,
            'price', i.price,
            'sku', i.sku
          )) FROM inventory i WHERE i.product_id = p.id),
          '[]'::json
        ) as variants
      FROM products p 
      WHERE p.tenant_id = $1 AND p.status = 'active'
      ORDER BY p.created_at DESC
    `, [this.tenantId]);

    const products = productsQuery.rows.map(product => ({
      ...product,
      images: Array.isArray(product.images) ? product.images : 
               (product.images ? JSON.parse(product.images) : []),
      price: parseFloat(product.price || 0),
      tags: Array.isArray(product.tags) ? product.tags : 
            (product.tags ? JSON.parse(product.tags) : [])
    }));

    // Get collections
    const collectionsQuery = await query(`
      SELECT 
        c.id, c.name, c.description, c.image_url, c.sort_order,
        COALESCE(pc.product_count, 0) as product_count,
        COALESCE(
          json_agg(
            json_build_object(
              'id', p.id,
              'name', p.name,
              'price', p.price,
              'images', p.images
            )
          ) FILTER (WHERE p.id IS NOT NULL),
          '[]'::json
        ) as products
      FROM collections c
      LEFT JOIN product_collections prc ON c.id = prc.collection_id
      LEFT JOIN products p ON prc.product_id = p.id AND p.status = 'active'
      LEFT JOIN (
        SELECT collection_id, COUNT(*) as product_count
        FROM product_collections pc2
        JOIN products p2 ON pc2.product_id = p2.id AND p2.status = 'active'
        GROUP BY collection_id
      ) pc ON c.id = pc.collection_id
      WHERE c.tenant_id = $1
      GROUP BY c.id, c.name, c.description, c.image_url, c.sort_order, pc.product_count
      ORDER BY c.sort_order, c.created_at
    `, [this.tenantId]);

    const collections = collectionsQuery.rows.map(collection => ({
      ...collection,
      products: Array.isArray(collection.products) ? collection.products : []
    }));

    // Build navigation
    const navigation = [];
    if (storeSettings.header_navigation) {
      const navItems = Array.isArray(storeSettings.header_navigation) 
        ? storeSettings.header_navigation 
        : JSON.parse(storeSettings.header_navigation || '[]');
      
      navItems.forEach(item => {
        navigation.push({
          title: item,
          url: this.getNavUrl(item)
        });
      });
    }

    return {
      store: {
        id: this.tenantId,
        name: storeSettings.store_name || 'My Store',
        description: storeSettings.store_description || '',
        url: storeSettings.store_url || '',
        enabled: storeSettings.store_enabled !== false
      },
      theme: {
        colors: {
          primary: storeSettings.primary_color || '#1a1a1a',
          secondary: storeSettings.secondary_color || '#6b7280',
          accent: storeSettings.accent_color || '#3b82f6',
          background: storeSettings.background_color || '#ffffff',
          text: storeSettings.text_color || '#1f2937'
        },
        fonts: {
          body: storeSettings.font_family || 'system-ui, sans-serif',
          size_base: storeSettings.font_size_base || 14
        }
      },
      hero: {
        title: storeSettings.hero_title || 'Welcome to our store',
        subtitle: storeSettings.hero_subtitle || 'Discover amazing products',
        cta_text: storeSettings.hero_cta_text || 'Shop Now',
        cta_url: storeSettings.hero_cta_url || '/products',
        image_url: storeSettings.hero_image_url || ''
      },
      navigation: navigation,
      footer: {
        enabled: storeSettings.footer_enabled !== false,
        sections: storeSettings.footer_sections || [],
        newsletter_enabled: storeSettings.footer_newsletter_enabled !== false,
        text: storeSettings.footer_text || 'Sign up for our newsletter'
      },
      products: products,
      collections: collections,
      settings: {
        products_per_page: storeSettings.products_per_page || 12,
        show_product_prices: storeSettings.show_product_prices !== false,
        show_product_variants: storeSettings.show_product_variants !== false,
        enable_cart: storeSettings.enable_cart !== false,
        enable_wishlist: storeSettings.enable_wishlist === true
      }
    };
  }

  /**
   * Generate all pages from templates
   */
  async generatePages(templates, context) {
    const layoutTemplate = templates.find(t => t.template_type === 'layout' && t.template_name === 'default');
    const pageTemplates = templates.filter(t => t.template_type === 'page');

    for (const pageTemplate of pageTemplates) {
      await this.generatePage(pageTemplate, layoutTemplate, context);
    }

    // Generate product pages
    await this.generateProductPages(layoutTemplate, context);

    // Generate collection pages
    await this.generateCollectionPages(layoutTemplate, context);
  }

  /**
   * Generate individual page
   */
  async generatePage(pageTemplate, layoutTemplate, context) {
    try {
      const pageContext = {
        ...context,
        page: {
          title: context.store.name,
          description: context.store.description,
          type: pageTemplate.template_name,
          url: pageTemplate.template_name === 'home' ? '/' : `/${pageTemplate.template_name}`
        }
      };

      // Render page content
      const pageContent = await this.liquidEngine.renderTemplate(
        pageTemplate.liquid_content,
        pageContext,
        `page_${pageTemplate.id}`
      );

      // Wrap in layout if available
      let finalHtml = pageContent;
      if (layoutTemplate) {
        const layoutContext = {
          ...pageContext,
          content_for_layout: pageContent
        };

        finalHtml = await this.liquidEngine.renderTemplate(
          layoutTemplate.liquid_content,
          layoutContext,
          `layout_${layoutTemplate.id}`
        );
      }

      // Inject API configuration
      finalHtml = this.injectApiConfiguration(finalHtml);

      // Save file
      const fileName = pageTemplate.template_name === 'home' ? 'index.html' : `${pageTemplate.template_name}.html`;
      this.generatedFiles.set(fileName, finalHtml);

      console.log(`📄 Generated page: ${fileName}`);
    } catch (error) {
      console.error(`Error generating page ${pageTemplate.template_name}:`, error);
    }
  }

  /**
   * Generate product pages
   */
  async generateProductPages(layoutTemplate, context) {
    // Generate products index page
    const productsHtml = this.generateProductsListPage(context);
    let finalHtml = productsHtml;

    if (layoutTemplate) {
      const layoutContext = {
        ...context,
        page: { title: 'Products', type: 'products', url: '/products' },
        content_for_layout: productsHtml
      };

      finalHtml = await this.liquidEngine.renderTemplate(
        layoutTemplate.liquid_content,
        layoutContext,
        `layout_products`
      );
    }

    finalHtml = this.injectApiConfiguration(finalHtml);
    this.generatedFiles.set('products.html', finalHtml);

    // Generate individual product pages
    for (const product of context.products.slice(0, 10)) { // Limit for demo
      await this.generateProductDetailPage(product, layoutTemplate, context);
    }
  }

  /**
   * Generate collection pages
   */
  async generateCollectionPages(layoutTemplate, context) {
    // Generate collections index
    const collectionsHtml = this.generateCollectionsListPage(context);
    let finalHtml = collectionsHtml;

    if (layoutTemplate) {
      const layoutContext = {
        ...context,
        page: { title: 'Collections', type: 'collections', url: '/collections' },
        content_for_layout: collectionsHtml
      };

      finalHtml = await this.liquidEngine.renderTemplate(
        layoutTemplate.liquid_content,
        layoutContext,
        `layout_collections`
      );
    }

    finalHtml = this.injectApiConfiguration(finalHtml);
    this.generatedFiles.set('collections.html', finalHtml);
  }

  /**
   * Generate API client JavaScript
   */
  async generateApiClient() {
    const apiClientJs = `
/**
 * Independent Store API Client
 * Generated for: ${this.config.siteName}
 * API Base URL: ${this.config.apiBaseUrl}
 */

// Store configuration
window.STORE_CONFIG = {
  storeId: '${this.tenantId}',
  apiUrl: '${this.config.apiBaseUrl}',
  siteName: '${this.config.siteName}'
};

class StoreApiClient {
  constructor(storeId, apiBaseUrl) {
    this.storeId = storeId;
    this.apiBaseUrl = apiBaseUrl;
    this.cache = new Map();
    this.cart = this.loadCart();
  }

  // API request helper
  async request(endpoint, params = {}) {
    const url = new URL(\`\${this.apiBaseUrl}/\${endpoint}\`);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    const cacheKey = url.toString();
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
      }
      
      const data = await response.json();
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      return null;
    }
  }

  // Load products
  async loadProducts(container, params = {}) {
    const products = await this.request('products', params);
    if (products && container) {
      this.renderProducts(container, products);
    }
    return products;
  }

  // Load collections
  async loadCollections(container, params = {}) {
    const collections = await this.request('collections', params);
    if (collections && container) {
      this.renderCollections(container, collections);
    }
    return collections;
  }

  // Load single product
  async loadProduct(container, productId) {
    const product = await this.request(\`products/\${productId}\`);
    if (product && container) {
      this.renderProduct(container, product);
    }
    return product;
  }

  // Render products grid
  renderProducts(container, products) {
    if (!Array.isArray(products) || products.length === 0) {
      container.innerHTML = '<p style="text-align: center; color: #666;">No products found.</p>';
      return;
    }

    container.innerHTML = products.map(product => \`
      <div class="product-card" style="
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        overflow: hidden;
        transition: transform 0.2s, box-shadow 0.2s;
        cursor: pointer;
      " onclick="window.location.href='product-\${product.id}.html'">
        <div class="product-image" style="
          aspect-ratio: 1;
          overflow: hidden;
          background: #f9fafb;
        ">
          \${this.getProductImage(product) ? 
            \`<img src="\${this.getProductImage(product)}" alt="\${product.name}" style="width: 100%; height: 100%; object-fit: cover;">\` : 
            \`<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #9ca3af;">📦</div>\`
          }
        </div>
        <div class="product-info" style="padding: 1rem;">
          <h3 style="font-size: 1rem; font-weight: 500; margin: 0 0 0.5rem 0; color: #1f2937;">\${product.name}</h3>
          <p style="font-size: 1.125rem; font-weight: 600; color: #3b82f6; margin: 0;">\${this.formatPrice(product.price)}</p>
        </div>
      </div>
    \`).join('');
  }

  // Render collections grid
  renderCollections(container, collections) {
    if (!Array.isArray(collections) || collections.length === 0) {
      container.innerHTML = '<p style="text-align: center; color: #666;">No collections found.</p>';
      return;
    }

    container.innerHTML = collections.map(collection => \`
      <div class="collection-card" style="
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        overflow: hidden;
        transition: transform 0.2s;
        cursor: pointer;
      " onclick="window.location.href='collection-\${collection.id}.html'">
        <div class="collection-image" style="
          height: 150px;
          background: linear-gradient(45deg, #f9fafb, #e5e7eb);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          \${collection.image_url ? 
            \`<img src="\${collection.image_url}" alt="\${collection.name}" style="width: 100%; height: 100%; object-fit: cover;">\` : 
            \`<span style="font-size: 2rem;">📁</span>\`
          }
        </div>
        <div class="collection-info" style="padding: 1rem;">
          <h3 style="font-size: 1rem; font-weight: 500; margin: 0 0 0.5rem 0;">\${collection.name}</h3>
          <p style="font-size: 0.875rem; color: #6b7280; margin: 0;">\${collection.product_count || 0} products</p>
        </div>
      </div>
    \`).join('');
  }

  // Get product image
  getProductImage(product) {
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
      return product.images[0].url || product.images[0];
    }
    return null;
  }

  // Format price
  formatPrice(price) {
    if (!price || isNaN(price)) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(parseFloat(price));
  }

  // Cart management
  loadCart() {
    try {
      const saved = localStorage.getItem('cart');
      return saved ? JSON.parse(saved) : { items: [], count: 0, total: 0 };
    } catch {
      return { items: [], count: 0, total: 0 };
    }
  }

  saveCart() {
    try {
      localStorage.setItem('cart', JSON.stringify(this.cart));
      this.updateCartDisplay();
    } catch (error) {
      console.error('Failed to save cart:', error);
    }
  }

  addToCart(productId, variantId = null, quantity = 1) {
    // Add to cart logic here
    console.log('Adding to cart:', { productId, variantId, quantity });
    // This would integrate with your cart API
  }

  updateCartDisplay() {
    const cartCountElements = document.querySelectorAll('[data-api-bind="cart.count"]');
    cartCountElements.forEach(element => {
      element.textContent = this.cart.count;
      element.style.display = this.cart.count > 0 ? 'flex' : 'none';
    });
  }

  // Auto-load API data for marked elements
  autoLoad() {
    // Find elements with data-api-endpoint attributes
    document.querySelectorAll('[data-api-endpoint]').forEach(element => {
      const endpoint = element.dataset.apiEndpoint;
      const params = this.parseParams(element.dataset.apiParams || '');

      if (endpoint === 'products') {
        this.loadProducts(element, params);
      } else if (endpoint === 'collections') {
        this.loadCollections(element, params);
      } else if (endpoint === 'product' && params.id) {
        this.loadProduct(element, params.id);
      }
    });

    // Update cart display
    this.updateCartDisplay();
  }

  // Parse URL parameters
  parseParams(paramString) {
    const params = {};
    if (paramString) {
      paramString.split('&').forEach(pair => {
        const [key, value] = pair.split('=');
        if (key && value) {
          params[key] = decodeURIComponent(value);
        }
      });
    }
    return params;
  }
}

// Initialize API client when page loads
document.addEventListener('DOMContentLoaded', function() {
  window.apiClient = new StoreApiClient(STORE_CONFIG.storeId, STORE_CONFIG.apiUrl);
  window.apiClient.autoLoad();
});

// Global cart functions
function toggleCart() {
  console.log('Toggle cart');
  // Implement cart toggle UI
}

function addToCart(productId, variantId = null, quantity = 1) {
  if (window.apiClient) {
    window.apiClient.addToCart(productId, variantId, quantity);
  }
}
`;

    this.generatedFiles.set('api-client.js', apiClientJs);
    console.log('📜 Generated API client');
  }

  /**
   * Generate theme CSS
   */
  async generateThemeCSS(context) {
    const themeCSS = `
/* Generated theme CSS for ${context.store.name} */

:root {
  --primary-color: ${context.theme.colors.primary};
  --secondary-color: ${context.theme.colors.secondary};
  --accent-color: ${context.theme.colors.accent};
  --background-color: ${context.theme.colors.background};
  --text-color: ${context.theme.colors.text};
  --font-body: ${context.theme.fonts.body};
  --font-size-base: ${context.theme.fonts.size_base}px;
}

/* Base styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: var(--font-body);
  font-size: var(--font-size-base);
  line-height: 1.6;
  color: var(--text-color);
  background-color: var(--background-color);
}

/* Utility classes */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

.btn {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  background: var(--accent-color);
  color: white;
  text-decoration: none;
  border-radius: 5px;
  border: none;
  cursor: pointer;
  font-weight: 600;
  transition: background-color 0.2s;
}

.btn:hover {
  background: var(--primary-color);
}

/* Grid layouts */
.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
}

.collections-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

/* Card styles */
.product-card:hover,
.collection-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

/* Responsive design */
@media (max-width: 768px) {
  .container {
    padding: 0 0.5rem;
  }
  
  .products-grid {
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
  }
  
  .collections-grid {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }
}

@media (max-width: 480px) {
  .products-grid,
  .collections-grid {
    grid-template-columns: 1fr;
  }
}
`;

    this.generatedFiles.set('theme.css', themeCSS);
    console.log('🎨 Generated theme CSS');
  }

  /**
   * Generate deployment configurations
   */
  async generateDeploymentConfigs() {
    // Netlify configuration
    const netlifyToml = `
[build]
  publish = "."

[[headers]]
  for = "/*.html"
  [headers.values]
    Cache-Control = "public, max-age=3600"

[[headers]]
  for = "/*.js"
  [headers.values]
    Cache-Control = "public, max-age=86400"

[[headers]]
  for = "/*.css"
  [headers.values]
    Cache-Control = "public, max-age=86400"

[[redirects]]
  from = "/admin/*"
  to = "https://app.${this.config.siteName.toLowerCase().replace(/\s+/g, '')}.com/:splat"
  status = 302
`;

    // Vercel configuration
    const vercelJson = JSON.stringify({
      "version": 2,
      "name": this.config.siteName.toLowerCase().replace(/\s+/g, '-'),
      "builds": [
        {
          "src": "*.html",
          "use": "@vercel/static"
        }
      ],
      "routes": [
        {
          "src": "/admin/(.*)",
          "dest": `https://app.${this.config.siteName.toLowerCase().replace(/\s+/g, '')}.com/$1`,
          "status": 302
        }
      ]
    }, null, 2);

    this.generatedFiles.set('netlify.toml', netlifyToml);
    this.generatedFiles.set('vercel.json', vercelJson);

    console.log('⚙️ Generated deployment configs');
  }

  /**
   * Generate README file
   */
  async generateReadme(context) {
    const readme = `# ${context.store.name}

Generated independent e-commerce website powered by LiquidJS.

## 🚀 Quick Start

### Deploy to Netlify
1. Drag and drop this folder to [Netlify Drop](https://app.netlify.com/drop)
2. Your site will be live instantly!

### Deploy to Vercel
1. Install Vercel CLI: \`npm i -g vercel\`
2. Run \`vercel\` in this directory
3. Follow the prompts

### Deploy to GitHub Pages
1. Create a new repository on GitHub
2. Upload these files to the repository
3. Enable GitHub Pages in repository settings

## 📁 File Structure

- \`index.html\` - Homepage
- \`products.html\` - Products catalog
- \`collections.html\` - Collections overview
- \`api-client.js\` - API integration for dynamic content
- \`theme.css\` - Custom theme styles
- \`netlify.toml\` - Netlify deployment configuration
- \`vercel.json\` - Vercel deployment configuration

## 🔗 API Integration

This site connects to: \`${this.config.apiBaseUrl}\`

The API client automatically loads:
- Products from your store
- Collections and categories
- Shopping cart functionality

## 🎨 Customization

### Colors
The site uses CSS custom properties for theming:
- Primary: ${context.theme.colors.primary}
- Secondary: ${context.theme.colors.secondary}
- Accent: ${context.theme.colors.accent}

### Content
All content is dynamically loaded from your store's API. To update:
1. Make changes in your store admin panel
2. Content will update automatically

## 📞 Support

Need help? Contact your store administrator.

---

Generated on: ${new Date().toISOString()}
Store ID: ${this.tenantId}
API: ${this.config.apiBaseUrl}
`;

    this.generatedFiles.set('README.md', readme);
    console.log('📖 Generated README');
  }

  // Helper methods
  getNavUrl(navItem) {
    const lower = navItem.toLowerCase();
    switch (lower) {
      case 'home': return '/';
      case 'catalog': 
      case 'products': return '/products';
      case 'collections': return '/collections';
      case 'contact': return '/contact';
      case 'about': return '/about';
      default: return `/${lower.replace(/\s+/g, '-')}`;
    }
  }

  generateProductsListPage(context) {
    return `
<div class="container" style="padding: 2rem 0;">
  <h1 style="text-align: center; margin-bottom: 2rem;">Products</h1>
  <div id="products-grid" data-api-endpoint="products" class="products-grid">
    <p style="text-align: center; color: #666;">Loading products...</p>
  </div>
</div>
`;
  }

  generateCollectionsListPage(context) {
    return `
<div class="container" style="padding: 2rem 0;">
  <h1 style="text-align: center; margin-bottom: 2rem;">Collections</h1>
  <div id="collections-grid" data-api-endpoint="collections" class="collections-grid">
    <p style="text-align: center; color: #666;">Loading collections...</p>
  </div>
</div>
`;
  }

  async generateProductDetailPage(product, layoutTemplate, context) {
    const productHtml = `
<div class="container" style="padding: 2rem 0;">
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; max-width: 800px; margin: 0 auto;">
    <div class="product-images">
      ${this.getProductImage(product) ? 
        `<img src="${this.getProductImage(product)}" alt="${product.name}" style="width: 100%; border-radius: 8px;">` :
        `<div style="aspect-ratio: 1; background: #f9fafb; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 3rem;">📦</div>`
      }
    </div>
    <div class="product-details">
      <h1 style="margin-bottom: 1rem;">${product.name}</h1>
      <p style="font-size: 1.5rem; color: var(--accent-color); font-weight: 600; margin-bottom: 1rem;">
        ${this.formatPrice(product.price)}
      </p>
      <p style="color: #666; margin-bottom: 2rem;">${product.description || ''}</p>
      <button class="btn" onclick="addToCart('${product.id}')">Add to Cart</button>
    </div>
  </div>
</div>
`;

    let finalHtml = productHtml;
    if (layoutTemplate) {
      const layoutContext = {
        ...context,
        page: { title: product.name, type: 'product', url: `/product-${product.id}` },
        content_for_layout: productHtml
      };

      finalHtml = await this.liquidEngine.renderTemplate(
        layoutTemplate.liquid_content,
        layoutContext,
        `layout_product_${product.id}`
      );
    }

    finalHtml = this.injectApiConfiguration(finalHtml);
    this.generatedFiles.set(`product-${product.id}.html`, finalHtml);
  }

  getProductImage(product) {
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
      return product.images[0].url || product.images[0];
    }
    return null;
  }

  formatPrice(price) {
    if (!price || isNaN(price)) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(parseFloat(price));
  }

  injectApiConfiguration(html) {
    // Inject store configuration
    const configScript = `
<script>
window.STORE_CONFIG = {
  storeId: '${this.tenantId}',
  apiUrl: '${this.config.apiBaseUrl}',
  siteName: '${this.config.siteName}'
};
</script>`;

    // Inject before closing head tag
    return html.replace('</head>', `${configScript}\n</head>`);
  }

  getFileType(path) {
    const ext = path.split('.').pop().toLowerCase();
    switch (ext) {
      case 'html': return 'text/html';
      case 'js': return 'application/javascript';
      case 'css': return 'text/css';
      case 'json': return 'application/json';
      case 'md': return 'text/markdown';
      case 'toml': return 'text/plain';
      default: return 'text/plain';
    }
  }

  /**
   * Get generated files as downloadable content
   */
  getFiles() {
    return this.generatedFiles;
  }
}

// Generate site endpoint
export async function POST({ request }) {
  try {
    const generateData = await request.json();

    const config = {
      apiBaseUrl: generateData.apiBaseUrl || 'http://localhost:5173/api',
      siteName: generateData.siteName || 'My Store',
      includeApiClient: generateData.includeApiClient !== false,
      ...generateData.config
    };

    const generator = new IndependentSiteGenerator(DEFAULT_TENANT_ID, config);
    const result = await generator.generateSite();

    // Save generation record
    await query(`
      INSERT INTO generated_sites (
        tenant_id, site_name, generation_config, api_config,
        last_generated_at, file_count, total_size_bytes
      ) VALUES ($1, $2, $3, $4, NOW(), $5, $6)
      ON CONFLICT (tenant_id) 
      DO UPDATE SET 
        site_name = EXCLUDED.site_name,
        generation_config = EXCLUDED.generation_config,
        api_config = EXCLUDED.api_config,
        last_generated_at = NOW(),
        file_count = EXCLUDED.file_count,
        total_size_bytes = EXCLUDED.total_size_bytes,
        updated_at = NOW()
    `, [
      DEFAULT_TENANT_ID,
      config.siteName,
      JSON.stringify(generateData),
      JSON.stringify(config),
      result.files.length,
      result.totalSize
    ]);

    return jsonResponse({
      success: true,
      message: 'Site generated successfully',
      ...result,
      download_info: {
        total_files: result.files.length,
        total_size_mb: (result.totalSize / 1024 / 1024).toFixed(2),
        estimated_download_time: '< 1 minute'
      }
    });

  } catch (error) {
    console.error('Site generation error:', error);
    return internalServerErrorResponse(`Site generation failed: ${error.message}`);
  }
}