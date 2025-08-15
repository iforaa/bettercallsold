import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse } from '$lib/response.js';

export async function GET() {
  try {
    console.log('Creating liquid templates tables...');

    // Create liquid_templates table
    await query(`
      CREATE TABLE IF NOT EXISTS liquid_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        template_type VARCHAR(50) NOT NULL CHECK (template_type IN ('layout', 'page', 'section', 'snippet')),
        template_name VARCHAR(100) NOT NULL,
        liquid_content TEXT NOT NULL,
        compiled_ast JSONB,
        settings_schema JSONB DEFAULT '{}',
        default_settings JSONB DEFAULT '{}',
        api_dependencies JSONB DEFAULT '[]',
        is_active BOOLEAN DEFAULT true,
        version INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(tenant_id, template_type, template_name, version)
      );
    `);

    // Create indexes
    await query(`
      CREATE INDEX IF NOT EXISTS idx_liquid_templates_tenant_type 
      ON liquid_templates(tenant_id, template_type);
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_liquid_templates_active 
      ON liquid_templates(tenant_id, is_active) WHERE is_active = true;
    `);

    // Create theme_sections table for reusable sections
    await query(`
      CREATE TABLE IF NOT EXISTS theme_sections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        section_name VARCHAR(100) NOT NULL,
        section_type VARCHAR(50) NOT NULL DEFAULT 'custom',
        liquid_template_id UUID REFERENCES liquid_templates(id) ON DELETE CASCADE,
        settings_schema JSONB DEFAULT '{}',
        default_settings JSONB DEFAULT '{}',
        preview_image_url TEXT,
        is_system BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(tenant_id, section_name)
      );
    `);

    // Create page_templates table for complete page configurations
    await query(`
      CREATE TABLE IF NOT EXISTS page_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        page_type VARCHAR(50) NOT NULL,
        page_name VARCHAR(100) NOT NULL,
        layout_template_id UUID REFERENCES liquid_templates(id),
        page_template_id UUID REFERENCES liquid_templates(id),
        sections_config JSONB DEFAULT '[]',
        seo_settings JSONB DEFAULT '{}',
        is_default BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(tenant_id, page_type, page_name)
      );
    `);

    // Create generated_sites table to track generated sites
    await query(`
      CREATE TABLE IF NOT EXISTS generated_sites (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL UNIQUE,
        site_name VARCHAR(100) NOT NULL,
        generation_config JSONB DEFAULT '{}',
        api_config JSONB DEFAULT '{}',
        last_generated_at TIMESTAMP,
        deployment_url TEXT,
        deployment_status VARCHAR(20) DEFAULT 'pending',
        file_count INTEGER DEFAULT 0,
        total_size_bytes BIGINT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Insert default layout template
    await query(`
      INSERT INTO liquid_templates (
        tenant_id, 
        template_type, 
        template_name, 
        liquid_content,
        settings_schema,
        default_settings
      ) VALUES (
        '11111111-1111-1111-1111-111111111111',
        'layout',
        'default',
        $1,
        $2,
        $3
      ) ON CONFLICT (tenant_id, template_type, template_name, version) DO NOTHING;
    `, [
      // Default layout template
      `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{ page.title | default: store.name }}</title>
  <meta name="description" content="{{ page.description | default: store.description }}">
  
  <style>
    :root {
      --primary-color: {{ theme.colors.primary | default: '#1a1a1a' }};
      --secondary-color: {{ theme.colors.secondary | default: '#6b7280' }};
      --accent-color: {{ theme.colors.accent | default: '#3b82f6' }};
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: {{ theme.fonts.body | default: 'system-ui, sans-serif' }};
      line-height: 1.6;
      color: var(--primary-color);
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 1rem;
    }
    
    header {
      background: white;
      border-bottom: 1px solid #e5e7eb;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    
    .header-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 60px;
    }
    
    .logo {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--primary-color);
      text-decoration: none;
    }
    
    nav {
      display: flex;
      gap: 2rem;
    }
    
    nav a {
      color: var(--primary-color);
      text-decoration: none;
      font-weight: 500;
      transition: color 0.2s;
    }
    
    nav a:hover {
      color: var(--accent-color);
    }
    
    .cart-icon {
      position: relative;
      cursor: pointer;
      padding: 0.5rem;
    }
    
    .cart-count {
      position: absolute;
      top: 0;
      right: 0;
      background: var(--accent-color);
      color: white;
      border-radius: 50%;
      width: 18px;
      height: 18px;
      font-size: 0.75rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    main {
      min-height: calc(100vh - 120px);
    }
    
    footer {
      background: #f9fafb;
      border-top: 1px solid #e5e7eb;
      padding: 2rem 0;
      margin-top: 4rem;
    }
    
    .footer-content {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 2rem;
    }
    
    .footer-section h4 {
      margin-bottom: 1rem;
      color: var(--primary-color);
    }
    
    .footer-section a {
      display: block;
      color: var(--secondary-color);
      text-decoration: none;
      margin-bottom: 0.5rem;
    }
    
    .footer-section a:hover {
      color: var(--primary-color);
    }
    
    @media (max-width: 768px) {
      .header-container {
        flex-direction: column;
        height: auto;
        padding: 1rem 0;
      }
      
      nav {
        gap: 1rem;
      }
    }
  </style>
  
  <script src="api-client.js"></script>
</head>
<body>
  <header>
    <div class="container">
      <div class="header-container">
        <a href="/" class="logo">{{ store.name }}</a>
        
        <nav>
          {% for nav_item in navigation %}
            <a href="{{ nav_item.url }}">{{ nav_item.title }}</a>
          {% endfor %}
        </nav>
        
        <div class="cart-icon" onclick="toggleCart()">
          🛒
          <span class="cart-count" data-api-bind="cart.count" style="display: none;">0</span>
        </div>
      </div>
    </div>
  </header>
  
  <main>
    {{ content_for_layout }}
  </main>
  
  <footer>
    <div class="container">
      <div class="footer-content">
        {% for section in footer.sections %}
          <div class="footer-section">
            <h4>{{ section.title }}</h4>
            {% for link in section.links %}
              <a href="{{ link.url }}">{{ link.label }}</a>
            {% endfor %}
          </div>
        {% endfor %}
      </div>
    </div>
  </footer>
  
  <script>
    // Initialize API client when page loads
    document.addEventListener('DOMContentLoaded', function() {
      if (typeof StoreApiClient !== 'undefined') {
        window.apiClient = new StoreApiClient(STORE_CONFIG.storeId, STORE_CONFIG.apiUrl);
        window.apiClient.autoLoad();
      }
    });
    
    function toggleCart() {
      // Cart functionality will be handled by API client
      if (window.apiClient) {
        window.apiClient.toggleCart();
      }
    }
  </script>
</body>
</html>`,
      // Settings schema
      JSON.stringify({
        "sections": {
          "header": {
            "type": "header",
            "settings": [
              {
                "type": "text",
                "id": "logo_text",
                "label": "Logo Text",
                "default": "{{ store.name }}"
              },
              {
                "type": "image_picker",
                "id": "logo_image",
                "label": "Logo Image"
              }
            ]
          },
          "footer": {
            "type": "footer",
            "settings": [
              {
                "type": "checkbox",
                "id": "show_footer",
                "label": "Show Footer",
                "default": true
              }
            ]
          }
        }
      }),
      // Default settings
      JSON.stringify({
        "colors": {
          "primary": "#1a1a1a",
          "secondary": "#6b7280", 
          "accent": "#3b82f6"
        },
        "fonts": {
          "body": "system-ui, sans-serif"
        }
      })
    ]);

    // Insert default home page template
    await query(`
      INSERT INTO liquid_templates (
        tenant_id,
        template_type,
        template_name,
        liquid_content,
        settings_schema,
        default_settings
      ) VALUES (
        '11111111-1111-1111-1111-111111111111',
        'page',
        'home',
        $1,
        $2,
        $3
      ) ON CONFLICT (tenant_id, template_type, template_name, version) DO NOTHING;
    `, [
      // Default home page template
      `<section class="hero" style="
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        height: 500px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        text-align: center;
      ">
  <div class="hero-content">
    <h1 style="font-size: 3rem; margin-bottom: 1rem;">{{ hero.title | default: 'Welcome to our store' }}</h1>
    <p style="font-size: 1.25rem; margin-bottom: 2rem;">{{ hero.subtitle | default: 'Discover amazing products' }}</p>
    <a href="/products" style="
      background: var(--accent-color);
      color: white;
      padding: 1rem 2rem;
      text-decoration: none;
      border-radius: 5px;
      font-weight: 600;
    ">{{ hero.cta_text | default: 'Shop Now' }}</a>
  </div>
</section>

<section class="featured-products" style="padding: 4rem 0;">
  <div class="container">
    <h2 style="text-align: center; margin-bottom: 3rem; font-size: 2rem;">Featured Products</h2>
    <div 
      id="products-grid" 
      data-api-endpoint="products" 
      data-api-params="featured=true&limit=8"
      style="
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 2rem;
      "
    >
      <!-- Products will be loaded here by API client -->
      <div style="text-align: center; color: #666;">Loading products...</div>
    </div>
  </div>
</section>

<section class="collections" style="padding: 4rem 0; background: #f9fafb;">
  <div class="container">
    <h2 style="text-align: center; margin-bottom: 3rem; font-size: 2rem;">Shop by Category</h2>
    <div 
      id="collections-grid"
      data-api-endpoint="collections"
      style="
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1.5rem;
      "
    >
      <!-- Collections will be loaded here by API client -->
      <div style="text-align: center; color: #666;">Loading collections...</div>
    </div>
  </div>
</section>`,
      // Settings schema
      JSON.stringify({
        "sections": {
          "hero": {
            "type": "hero",
            "settings": [
              {
                "type": "text",
                "id": "title",
                "label": "Hero Title",
                "default": "Welcome to our store"
              },
              {
                "type": "text",
                "id": "subtitle",
                "label": "Hero Subtitle",
                "default": "Discover amazing products"
              },
              {
                "type": "text",
                "id": "cta_text",
                "label": "Call to Action Text",
                "default": "Shop Now"
              },
              {
                "type": "url",
                "id": "cta_url",
                "label": "Call to Action URL",
                "default": "/products"
              }
            ]
          }
        }
      }),
      // Default settings
      JSON.stringify({
        "hero": {
          "title": "Welcome to our store",
          "subtitle": "Discover amazing products",
          "cta_text": "Shop Now",
          "cta_url": "/products"
        }
      })
    ]);

    console.log('✅ Liquid templates tables created successfully');

    return jsonResponse({
      success: true,
      message: 'Liquid templates tables created successfully',
      tables: [
        'liquid_templates',
        'theme_sections', 
        'page_templates',
        'generated_sites'
      ]
    });

  } catch (error) {
    console.error('Error creating liquid templates tables:', error);
    return internalServerErrorResponse('Failed to create liquid templates tables');
  }
}