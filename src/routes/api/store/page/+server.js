import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse, badRequestResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';
import { getLiquidEngine } from '$lib/liquid/engine.js';

/**
 * Real-time Store Page Renderer
 * This mimics how Shopify renders pages: Customer visits → Server → Liquid rendering → HTML
 */

/**
 * Build complete store context for live rendering
 */
async function buildLiveStoreContext(tenantId, pageType = 'home', additionalData = {}) {
  try {
    // Get store settings
    const storeSettingsQuery = await query(`
      SELECT * FROM webstore_settings WHERE tenant_id = $1
    `, [tenantId]);

    const storeSettings = storeSettingsQuery.rows[0] || {};

    // Get all products for the store - support both old and new product structures
    const productsQuery = await query(`
      SELECT 
        COALESCE(p_new.id, p_old.id) as id,
        COALESCE(p_new.title, p_old.name) as name,
        COALESCE(p_new.description, p_old.description) as description,
        COALESCE(p_old.price, 0) as price,
        COALESCE(p_new.images, p_old.images) as images,
        COALESCE(p_new.status, p_old.status) as status,
        COALESCE(p_new.tags, p_old.tags) as tags,
        COALESCE(
          (SELECT json_agg(json_build_object(
            'id', i_old.id,
            'quantity', i_old.quantity,
            'variant_combination', i_old.variant_combination,
            'price', i_old.price,
            'sku', i_old.sku
          )) FROM inventory_old i_old WHERE i_old.product_id = COALESCE(p_new.id, p_old.id)),
          '[]'::json
        ) as variants
      FROM products_new p_new
      FULL OUTER JOIN products_old p_old ON p_new.id = p_old.id
      WHERE (p_new.tenant_id = $1 OR p_old.tenant_id = $1) AND (p_new.status = 'active' OR p_old.status = 'active')
      ORDER BY COALESCE(p_new.created_at, p_old.created_at) DESC
    `, [tenantId]);

    const products = productsQuery.rows.map(product => {
      // Parse images and extract URLs
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

    // Get collections with product relationships
    const collectionsQuery = await query(`
      SELECT 
        c.id, c.name, c.description, c.image_url, c.sort_order,
        COALESCE(pc.product_count, 0) as product_count,
        COALESCE(
          json_agg(
            json_build_object(
              'id', COALESCE(p_new.id, p_old.id),
              'name', COALESCE(p_new.title, p_old.name),
              'price', COALESCE(p_old.price, 0),
              'images', COALESCE(p_new.images, p_old.images)
            )
          ) FILTER (WHERE p_new.id IS NOT NULL OR p_old.id IS NOT NULL),
          '[]'::json
        ) as products
      FROM collections c
      LEFT JOIN product_collections prc ON c.id = prc.collection_id
      LEFT JOIN products_new p_new ON prc.product_id = p_new.id AND p_new.status = 'active'
      LEFT JOIN products_old p_old ON prc.product_id = p_old.id AND p_old.status = 'active'
      LEFT JOIN (
        SELECT collection_id, COUNT(*) as product_count
        FROM product_collections pc2
        LEFT JOIN products_new p2_new ON pc2.product_id = p2_new.id AND p2_new.status = 'active'
        LEFT JOIN products_old p2_old ON pc2.product_id = p2_old.id AND p2_old.status = 'active'
        WHERE p2_new.id IS NOT NULL OR p2_old.id IS NOT NULL
        GROUP BY collection_id
      ) pc ON c.id = pc.collection_id
      WHERE c.tenant_id = $1
      GROUP BY c.id, c.name, c.description, c.image_url, c.sort_order, pc.product_count
      ORDER BY c.sort_order, c.created_at
    `, [tenantId]);

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
          url: getNavUrl(item)
        });
      });
    } else {
      // Default navigation
      navigation.push(
        { title: 'Home', url: '/store' },
        { title: 'Products', url: '/store/products' },
        { title: 'Collections', url: '/store/collections' }
      );
    }

    // Build footer sections
    const footerSections = [];
    if (storeSettings.footer_sections) {
      const sections = Array.isArray(storeSettings.footer_sections)
        ? storeSettings.footer_sections
        : JSON.parse(storeSettings.footer_sections || '[]');
      
      footerSections.push(...sections);
    }

    return {
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
        url: additionalData.url || '/store'
      },
      hero: {
        title: storeSettings.hero_title || 'Welcome to our store',
        subtitle: storeSettings.hero_subtitle || 'Discover amazing products',
        cta_text: storeSettings.hero_cta_text || 'Shop Now',
        cta_url: storeSettings.hero_cta_url || '/store/products',
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
        path: additionalData.url || '/store'
      },
      ...additionalData
    };
  } catch (error) {
    console.error('Error building live store context:', error);
    throw error;
  }
}

/**
 * Helper function to get navigation URLs
 */
function getNavUrl(navItem) {
  const lower = navItem.toLowerCase();
  switch (lower) {
    case 'home': return '/store';
    case 'catalog': 
    case 'products': return '/store/products';
    case 'collections': return '/store/collections';
    case 'contact': return '/store/contact';
    case 'about': return '/store/about';
    default: return `/store/${lower.replace(/\s+/g, '-')}`;
  }
}

// Render store page with live Liquid rendering
export async function POST({ request }) {
  try {
    const renderData = await request.json();
    const { page_type = 'home', collection_id, product_id } = renderData;

    // Find the appropriate templates
    let pageTemplate = null;
    let layoutTemplate = null;

    // Get layout template (always needed)
    const layoutQuery = await query(`
      SELECT id, template_type, template_name, liquid_content, default_settings
      FROM liquid_templates
      WHERE tenant_id = $1 AND template_type = 'layout' AND template_name = 'default' AND is_active = true
      ORDER BY version DESC
      LIMIT 1
    `, [DEFAULT_TENANT_ID]);

    if (layoutQuery.rows.length > 0) {
      layoutTemplate = layoutQuery.rows[0];
    }

    // Get page template based on page_type
    const pageQuery = await query(`
      SELECT id, template_type, template_name, liquid_content, default_settings
      FROM liquid_templates
      WHERE tenant_id = $1 AND template_type = 'page' AND template_name = $2 AND is_active = true
      ORDER BY version DESC
      LIMIT 1
    `, [DEFAULT_TENANT_ID, page_type]);

    if (pageQuery.rows.length > 0) {
      pageTemplate = pageQuery.rows[0];
    }

    if (!pageTemplate) {
      return badRequestResponse(`No active template found for page type: ${page_type}`);
    }

    // Build context based on page type
    let additionalContext = {};
    
    if (page_type === 'collection' && collection_id) {
      // Get specific collection data
      const collectionQuery = await query(`
        SELECT c.*, 
          COALESCE(
            json_agg(
              json_build_object(
                'id', COALESCE(p_new.id, p_old.id),
                'name', COALESCE(p_new.title, p_old.name),
                'price', COALESCE(p_old.price, 0),
                'images', COALESCE(p_new.images, p_old.images),
                'description', COALESCE(p_new.description, p_old.description)
              )
            ) FILTER (WHERE p_new.id IS NOT NULL OR p_old.id IS NOT NULL),
            '[]'::json
          ) as products
        FROM collections c
        LEFT JOIN product_collections pc ON c.id = pc.collection_id
        LEFT JOIN products_new p_new ON pc.product_id = p_new.id AND p_new.status = 'active'
        LEFT JOIN products_old p_old ON pc.product_id = p_old.id AND p_old.status = 'active'
        WHERE c.id = $1 AND c.tenant_id = $2
        GROUP BY c.id
      `, [collection_id, DEFAULT_TENANT_ID]);

      if (collectionQuery.rows.length > 0) {
        const collection = collectionQuery.rows[0];
        additionalContext = {
          collection: {
            ...collection,
            products: Array.isArray(collection.products) ? collection.products : []
          },
          title: collection.name,
          url: `/store/collections/${collection_id}`
        };
      }
    } else if (page_type === 'product' && product_id) {
      // Get specific product data
      const productQuery = await query(`
        SELECT 
          COALESCE(p_new.id, p_old.id) as id,
          COALESCE(p_new.title, p_old.name) as name,
          COALESCE(p_new.description, p_old.description) as description,
          COALESCE(p_old.price, 0) as price,
          COALESCE(p_new.images, p_old.images) as images,
          COALESCE(p_new.status, p_old.status) as status,
          COALESCE(p_new.tags, p_old.tags) as tags,
          COALESCE(p_new.created_at, p_old.created_at) as created_at,
          COALESCE(p_new.updated_at, p_old.updated_at) as updated_at,
          COALESCE(
            (SELECT json_agg(json_build_object(
              'id', i_old.id,
              'quantity', i_old.quantity,
              'variant_combination', i_old.variant_combination,
              'price', i_old.price,
              'sku', i_old.sku
            )) FROM inventory_old i_old WHERE i_old.product_id = COALESCE(p_new.id, p_old.id)),
            '[]'::json
          ) as variants
        FROM products_new p_new
        FULL OUTER JOIN products_old p_old ON p_new.id = p_old.id
        WHERE (p_new.id = $1 OR p_old.id = $1) AND (p_new.tenant_id = $2 OR p_old.tenant_id = $2) AND (p_new.status = 'active' OR p_old.status = 'active')
      `, [product_id, DEFAULT_TENANT_ID]);

      if (productQuery.rows.length > 0) {
        const product = productQuery.rows[0];
        
        // Parse images and extract URLs
        let imageUrls = [];
        if (product.images) {
          let parsedImages = Array.isArray(product.images) ? product.images : JSON.parse(product.images);
          imageUrls = parsedImages.map(img => 
            typeof img === 'string' ? img : img.url
          ).filter(url => url);
        }
        
        additionalContext = {
          product: {
            ...product,
            images: imageUrls,
            price: parseFloat(product.price || 0)
          },
          title: product.name,
          url: `/store/products/${product_id}`
        };
      }
    }

    // Build the complete store context
    const context = await buildLiveStoreContext(DEFAULT_TENANT_ID, page_type, additionalContext);

    // Merge template default settings if available
    if (pageTemplate.default_settings) {
      const defaultSettings = typeof pageTemplate.default_settings === 'string' 
        ? JSON.parse(pageTemplate.default_settings)
        : pageTemplate.default_settings;
      
      Object.assign(context, defaultSettings);
    }

    // Render page content with Liquid
    const liquidEngine = getLiquidEngine();
    
    const pageContent = await liquidEngine.renderTemplate(
      pageTemplate.liquid_content,
      context,
      `live_page_${pageTemplate.id}`
    );

    // Wrap in layout if available
    let finalHtml = pageContent;
    if (layoutTemplate) {
      const layoutContext = {
        ...context,
        content_for_layout: pageContent
      };

      finalHtml = await liquidEngine.renderTemplate(
        layoutTemplate.liquid_content,
        layoutContext,
        `live_layout_${layoutTemplate.id}`
      );
    }

    return jsonResponse({
      success: true,
      html: finalHtml,
      page_info: {
        type: page_type,
        title: context.page.title,
        template_used: pageTemplate.template_name
      },
      context_summary: {
        store_name: context.store.name,
        products_count: context.products.length,
        collections_count: context.collections.length
      }
    });

  } catch (error) {
    console.error('Live store render error:', error);
    return internalServerErrorResponse(`Store rendering failed: ${error.message}`);
  }
}