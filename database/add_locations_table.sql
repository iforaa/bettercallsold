-- ==================================================================
-- Add Locations Table for BetterCallSold
-- ==================================================================
-- 
-- This migration adds the locations table to support physical store 
-- locations with proper address parsing and tenant isolation.
-- 
-- Features:
-- - Multi-tenant support with RLS policies
-- - Structured address components
-- - Status management (active/inactive)
-- - Inventory tracking integration
-- - Default location designation
-- 
-- ==================================================================

-- Locations table - Physical store locations
CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Location identification
    name VARCHAR(255) NOT NULL,
    description TEXT,
    location_type VARCHAR(50) DEFAULT 'store', -- store, warehouse, pickup_point, etc.
    
    -- Address components (structured for better search and display)
    address_line_1 VARCHAR(255) NOT NULL,
    address_line_2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state_province VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) NOT NULL DEFAULT 'United States',
    
    -- Geographic coordinates (for mapping and distance calculations)
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    
    -- Contact information
    phone VARCHAR(20),
    email VARCHAR(255),
    
    -- Operating status and settings
    status VARCHAR(20) DEFAULT 'active', -- active, inactive, temporarily_closed
    is_default BOOLEAN DEFAULT false,
    is_pickup_location BOOLEAN DEFAULT true,
    is_fulfillment_center BOOLEAN DEFAULT false,
    
    -- Business hours (stored as JSONB for flexibility)
    business_hours JSONB DEFAULT '{
        "monday": {"open": "09:00", "close": "18:00", "closed": false},
        "tuesday": {"open": "09:00", "close": "18:00", "closed": false},
        "wednesday": {"open": "09:00", "close": "18:00", "closed": false},
        "thursday": {"open": "09:00", "close": "18:00", "closed": false},
        "friday": {"open": "09:00", "close": "18:00", "closed": false},
        "saturday": {"open": "10:00", "close": "16:00", "closed": false},
        "sunday": {"open": "12:00", "close": "16:00", "closed": false}
    }'::jsonb,
    
    -- Additional metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Locations indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_locations_tenant_id ON locations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_locations_status ON locations(status);
CREATE INDEX IF NOT EXISTS idx_locations_country ON locations(country);
CREATE INDEX IF NOT EXISTS idx_locations_city ON locations(city);
CREATE INDEX IF NOT EXISTS idx_locations_postal_code ON locations(postal_code);
CREATE INDEX IF NOT EXISTS idx_locations_is_default ON locations(is_default);
CREATE INDEX IF NOT EXISTS idx_locations_is_pickup ON locations(is_pickup_location);
CREATE INDEX IF NOT EXISTS idx_locations_coordinates ON locations(latitude, longitude);

-- GIN index for JSONB fields
CREATE INDEX IF NOT EXISTS idx_locations_business_hours_gin ON locations USING gin(business_hours);
CREATE INDEX IF NOT EXISTS idx_locations_metadata_gin ON locations USING gin(metadata);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_locations_tenant_status ON locations(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_locations_tenant_default ON locations(tenant_id, is_default);

-- Locations triggers
CREATE TRIGGER update_locations_updated_at
    BEFORE UPDATE ON locations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security for locations
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS tenant_isolation_locations ON locations
    USING ((tenant_id)::text = current_setting('app.current_tenant_id', true));

-- Add locations to constants table enum
-- (This would be added to TABLES constant in code)

-- Add sample location for demo tenant
INSERT INTO locations (
    id, 
    tenant_id, 
    name, 
    description,
    address_line_1, 
    city, 
    state_province, 
    postal_code, 
    country,
    phone,
    email,
    status,
    is_default,
    is_pickup_location,
    is_fulfillment_center,
    created_at, 
    updated_at
) VALUES (
    '10000000-1000-1000-1000-100000000001',
    '11111111-1111-1111-1111-111111111111',
    'Main Store Location',
    'Our flagship store location with full inventory and customer service',
    '123 Fashion Street',
    'New York',
    'New York',
    '10001',
    'United States',
    '+1 (555) 123-4567',
    'store@demo-shop.com',
    'active',
    true,
    true,
    true,
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Insert secondary location
INSERT INTO locations (
    id,
    tenant_id,
    name,
    description,
    address_line_1,
    city,
    state_province,
    postal_code,
    country,
    phone,
    status,
    is_default,
    is_pickup_location,
    is_fulfillment_center,
    created_at,
    updated_at
) VALUES (
    '10000000-1000-1000-1000-100000000002',
    '11111111-1111-1111-1111-111111111111',
    'Warehouse Location',
    'Primary fulfillment center for online orders',
    '456 Distribution Drive',
    'Newark',
    'New Jersey',
    '07101',
    'United States',
    '+1 (555) 987-6543',
    'active',
    false,
    false,
    true,
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Refresh table statistics
ANALYZE locations;

-- ==================================================================
-- VERIFICATION QUERIES
-- ==================================================================
-- 
-- Verify the table was created correctly:
-- SELECT * FROM locations WHERE tenant_id = '11111111-1111-1111-1111-111111111111';
-- 
-- Check indexes:
-- \d+ locations
-- 
-- Test row level security:
-- SET app.current_tenant_id = '11111111-1111-1111-1111-111111111111';
-- SELECT name, city, status FROM locations;
-- 
-- ==================================================================