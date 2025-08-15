import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse, badRequestResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';
import { getLiquidEngine } from '$lib/liquid/engine.js';

/**
 * Build store context for template rendering
 */
async function buildStoreContext(tenantId, pageType = 'home', additionalData = {}) {
  try {
    // Get store settings
    const storeSettingsQuery = await query(`
      SELECT * FROM webstore_settings WHERE tenant_id = $1
    `, [tenantId]);

    const storeSettings = storeSettingsQuery.rows[0] || {};

    // Get sample products for context (limit 20 for performance)
    const productsQuery = await query(`
      SELECT 
        id, name, description, price, images, status,
        COALESCE(
          (SELECT json_agg(json_build_object(
            'id', i.id,
            'quantity', i.quantity,
            'variant_combination', i.variant_combination,
            'price', i.price
          )) FROM inventory i WHERE i.product_id = p.id LIMIT 5),
          '[]'::json
        ) as variants
      FROM products p 
      WHERE p.tenant_id = $1 AND p.status = 'active'
      ORDER BY p.created_at DESC 
      LIMIT 20
    `, [tenantId]);

    const products = productsQuery.rows.map(product => {
      // Parse images and extract URLs (same logic as store page renderer)
      let imageUrls = [];
      if (product.images) {
        let parsedImages = Array.isArray(product.images) ? product.images : JSON.parse(product.images);
        imageUrls = parsedImages.map(img => 
          typeof img === 'string' ? img : img.url
        ).filter(url => url);
      }
      
      return {
        ...product,
        images: imageUrls,
        price: parseFloat(product.price || 0),
        tags: Array.isArray(product.tags) ? product.tags : 
              (product.tags ? JSON.parse(product.tags) : [])
      };
    });

    // Get collections
    const collectionsQuery = await query(`
      SELECT 
        id, name, description, image_url,
        COALESCE(pc.product_count, 0) as product_count
      FROM collections c
      LEFT JOIN (
        SELECT collection_id, COUNT(*) as product_count
        FROM product_collections
        GROUP BY collection_id
      ) pc ON c.id = pc.collection_id
      WHERE c.tenant_id = $1
      ORDER BY c.sort_order, c.created_at
      LIMIT 20
    `, [tenantId]);

    const collections = collectionsQuery.rows;

    // Build navigation from store settings
    const navigation = [];
    if (storeSettings.header_navigation) {
      const navItems = Array.isArray(storeSettings.header_navigation) 
        ? storeSettings.header_navigation 
        : JSON.parse(storeSettings.header_navigation || '[]');
      
      navItems.forEach(item => {
        navigation.push({
          title: item,
          url: getNavUrl(item)
        });
      });
    }

    // Build footer sections
    const footerSections = [];
    if (storeSettings.footer_sections) {
      const sections = Array.isArray(storeSettings.footer_sections)
        ? storeSettings.footer_sections
        : JSON.parse(storeSettings.footer_sections || '[]');
      
      footerSections.push(...sections);
    }

    // Build the complete context
    const context = {
      store: {
        id: tenantId,
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
      page: {
        title: additionalData.title || storeSettings.store_name || 'My Store',
        description: additionalData.description || storeSettings.store_description || '',
        type: pageType,
        url: additionalData.url || '/'
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
        sections: footerSections,
        newsletter_enabled: storeSettings.footer_newsletter_enabled !== false,
        text: storeSettings.footer_text || 'Sign up for our newsletter'
      },
      products: products,
      collections: collections,
      cart: {
        items: [],
        count: 0,
        total: 0
      },
      settings: {
        products_per_page: storeSettings.products_per_page || 12,
        show_product_prices: storeSettings.show_product_prices !== false,
        show_product_variants: storeSettings.show_product_variants !== false,
        enable_cart: storeSettings.enable_cart !== false,
        enable_wishlist: storeSettings.enable_wishlist === true
      },
      request: {
        page_type: pageType,
        path: additionalData.url || '/'
      },
      ...additionalData
    };

    return context;
  } catch (error) {
    console.error('Error building store context:', error);
    throw error;
  }
}

/**
 * Helper function to get navigation URLs
 */
function getNavUrl(navItem) {
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

// Render template with context
export async function POST({ request }) {
  try {
    const renderData = await request.json();

    if (!renderData.template_id && !renderData.liquid_content) {
      return badRequestResponse('Either template_id or liquid_content is required');
    }

    let liquidContent = renderData.liquid_content;
    let templateInfo = null;

    // If template_id is provided, fetch the template
    if (renderData.template_id) {
      const templateQuery = await query(`
        SELECT 
          id, template_type, template_name, liquid_content,
          settings_schema, default_settings, api_dependencies
        FROM liquid_templates
        WHERE id = $1 AND tenant_id = $2 AND is_active = true
      `, [renderData.template_id, DEFAULT_TENANT_ID]);

      if (templateQuery.rows.length === 0) {
        return badRequestResponse('Template not found or inactive');
      }

      templateInfo = templateQuery.rows[0];
      liquidContent = templateInfo.liquid_content;
    }

    // Build context
    const pageType = renderData.page_type || 'home';
    const testData = renderData.test_data || {};
    const context = await buildStoreContext(DEFAULT_TENANT_ID, pageType, testData);

    // Merge template default settings if available
    if (templateInfo && templateInfo.default_settings) {
      const defaultSettings = typeof templateInfo.default_settings === 'string' 
        ? JSON.parse(templateInfo.default_settings)
        : templateInfo.default_settings;
      
      Object.assign(context, defaultSettings);
    }

    // Render template
    const liquidEngine = getLiquidEngine();
    const cacheKey = renderData.template_id ? `template_${renderData.template_id}` : null;
    
    const renderedHtml = await liquidEngine.renderTemplate(
      liquidContent,
      context,
      cacheKey
    );

    // If this is a layout template, we need to handle content_for_layout
    let finalHtml = renderedHtml;
    if (templateInfo && templateInfo.template_type === 'layout' && renderData.page_content) {
      finalHtml = renderedHtml.replace('{{ content_for_layout }}', renderData.page_content);
    }

    return jsonResponse({
      success: true,
      html: finalHtml,
      template_info: templateInfo ? {
        id: templateInfo.id,
        type: templateInfo.template_type,
        name: templateInfo.template_name,
        api_dependencies: templateInfo.api_dependencies
      } : null,
      context_summary: {
        store_name: context.store.name,
        products_count: context.products.length,
        collections_count: context.collections.length,
        page_type: context.page.type
      }
    });

  } catch (error) {
    console.error('Template render error:', error);
    return internalServerErrorResponse(`Template rendering failed: ${error.message}`);
  }
}

// Get render preview for template editor
export async function GET({ url }) {
  try {
    const templateId = url.searchParams.get('template_id');
    const pageType = url.searchParams.get('page_type') || 'home';

    if (!templateId) {
      return badRequestResponse('template_id parameter is required');
    }

    // Fetch template
    const templateQuery = await query(`
      SELECT 
        id, template_type, template_name, liquid_content,
        settings_schema, default_settings, api_dependencies
      FROM liquid_templates
      WHERE id = $1 AND tenant_id = $2
    `, [templateId, DEFAULT_TENANT_ID]);

    if (templateQuery.rows.length === 0) {
      return badRequestResponse('Template not found');
    }

    const template = templateQuery.rows[0];

    // Build context
    const context = await buildStoreContext(DEFAULT_TENANT_ID, pageType);

    // Merge template default settings
    if (template.default_settings) {
      const defaultSettings = typeof template.default_settings === 'string' 
        ? JSON.parse(template.default_settings)
        : template.default_settings;
      
      Object.assign(context, defaultSettings);
    }

    // Render template
    const liquidEngine = getLiquidEngine();
    const renderedHtml = await liquidEngine.renderTemplate(
      template.liquid_content,
      context,
      `preview_${templateId}`
    );

    return jsonResponse({
      success: true,
      html: renderedHtml,
      template: {
        id: template.id,
        type: template.template_type,
        name: template.template_name
      }
    });

  } catch (error) {
    console.error('Template preview error:', error);
    return internalServerErrorResponse(`Template preview failed: ${error.message}`);
  }
}