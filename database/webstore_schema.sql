-- Web Store Settings Table
-- This table stores customization settings for the web store

CREATE TABLE IF NOT EXISTS webstore_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    
    -- Store Basic Information
    store_name VARCHAR(255) DEFAULT 'My Store',
    store_description TEXT,
    store_url VARCHAR(255),
    
    -- Header Settings
    header_logo_url TEXT,
    header_navigation JSONB DEFAULT '["Home", "Catalog", "Contact"]'::jsonb,
    
    -- Theme and Colors
    primary_color VARCHAR(50) DEFAULT '#1a1a1a',
    secondary_color VARCHAR(50) DEFAULT '#6b7280',
    accent_color VARCHAR(50) DEFAULT '#3b82f6',
    background_color VARCHAR(50) DEFAULT '#ffffff',
    text_color VARCHAR(50) DEFAULT '#1f2937',
    
    -- Typography
    font_family VARCHAR(100) DEFAULT 'Inter, sans-serif',
    font_size_base INTEGER DEFAULT 14,
    
    -- Footer Settings
    footer_enabled BOOLEAN DEFAULT true,
    footer_sections JSONB DEFAULT '[
        {"title": "Shop", "links": [{"label": "All Products", "url": "/catalog"}]},
        {"title": "Learn", "links": [{"label": "About Us", "url": "/about"}]},
        {"title": "Connect", "links": [{"label": "Contact", "url": "/contact"}]}
    ]'::jsonb,
    footer_newsletter_enabled BOOLEAN DEFAULT true,
    footer_text TEXT DEFAULT 'Sign up for our newsletter',
    
    -- Homepage Settings
    hero_image_url TEXT,
    hero_title VARCHAR(255) DEFAULT 'Welcome to our store',
    hero_subtitle TEXT DEFAULT 'Discover amazing products',
    hero_cta_text VARCHAR(100) DEFAULT 'Shop Now',
    hero_cta_url VARCHAR(255) DEFAULT '/catalog',
    
    -- Product Display Settings
    products_per_page INTEGER DEFAULT 12,
    show_product_prices BOOLEAN DEFAULT true,
    show_product_variants BOOLEAN DEFAULT true,
    enable_cart BOOLEAN DEFAULT true,
    enable_wishlist BOOLEAN DEFAULT false,
    
    -- SEO Settings
    meta_title VARCHAR(255),
    meta_description TEXT,
    meta_keywords TEXT,
    
    -- Social Media
    social_links JSONB DEFAULT '{}'::jsonb,
    
    -- Store Status
    store_enabled BOOLEAN DEFAULT false,
    maintenance_mode BOOLEAN DEFAULT false,
    maintenance_message TEXT DEFAULT 'We are currently updating our store. Please check back soon!',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on tenant_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_webstore_settings_tenant_id ON webstore_settings(tenant_id);

-- Add unique constraint on tenant_id (one setting record per tenant)
ALTER TABLE webstore_settings ADD CONSTRAINT unique_tenant_webstore_settings UNIQUE (tenant_id);

-- Insert default settings for the default tenant
INSERT INTO webstore_settings (tenant_id, store_name) 
VALUES ('00000000-0000-0000-0000-000000000001', 'BetterCallSold Store')
ON CONFLICT (tenant_id) DO NOTHING;