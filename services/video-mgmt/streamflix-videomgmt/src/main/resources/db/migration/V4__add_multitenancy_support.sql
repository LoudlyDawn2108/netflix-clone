-- Create Partition tables for multi-tenant architecture
-- Partitioning by tenant_id for efficient data isolation and performance

-- Add partition support to videos table
ALTER TABLE videos ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
CREATE INDEX IF NOT EXISTS idx_video_tenant ON videos(tenant_id);

-- Add partition support to categories table
ALTER TABLE categories ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
CREATE INDEX IF NOT EXISTS idx_category_tenant ON categories(tenant_id);

-- Add partition support to thumbnails table
ALTER TABLE thumbnails ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
CREATE INDEX IF NOT EXISTS idx_thumbnail_tenant ON thumbnails(tenant_id);

-- Create tenant table
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    identifier VARCHAR(255) NOT NULL UNIQUE,
    subscription_level VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Create indices for tenant queries
CREATE INDEX IF NOT EXISTS idx_tenant_identifier ON tenants(identifier);
CREATE INDEX IF NOT EXISTS idx_tenant_active ON tenants(active);

-- Insert default tenant for existing data
INSERT INTO tenants (id, name, identifier, subscription_level, created_at, updated_at, active)
VALUES 
    ('00000000-0000-0000-0000-000000000000', 'Default', 'default', 'STANDARD', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, TRUE)
ON CONFLICT DO NOTHING;

-- Update category uniqueness constraint to account for tenant
ALTER TABLE categories DROP CONSTRAINT IF EXISTS uk_categories_name;
ALTER TABLE categories ADD CONSTRAINT uk_categories_name_tenant UNIQUE (name, tenant_id);

-- Update video_tags to include tenant_id for multi-tenant filtering
ALTER TABLE video_tags ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
CREATE INDEX IF NOT EXISTS idx_video_tags_tenant ON video_tags(tenant_id);

-- Update existing video tags with default tenant
UPDATE video_tags SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
ALTER TABLE video_tags ALTER COLUMN tenant_id SET NOT NULL;
