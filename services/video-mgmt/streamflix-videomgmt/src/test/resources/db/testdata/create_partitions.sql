-- Create parent table with partitioning
CREATE TABLE IF NOT EXISTS videos_partitioned (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description VARCHAR(2000),
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    archived BOOLEAN DEFAULT FALSE,
    archived_at TIMESTAMP,
    archive_storage_location VARCHAR(255),
    storage_location VARCHAR(255)
) PARTITION BY LIST (tenant_id);

-- Make sure test schema is set up correctly
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY,
    identifier VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    subscription_level VARCHAR(50) NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for the partitioned tables
CREATE INDEX IF NOT EXISTS idx_videos_partitioned_tenant_id ON videos_partitioned(tenant_id);
CREATE INDEX IF NOT EXISTS idx_videos_partitioned_status ON videos_partitioned(status);
CREATE INDEX IF NOT EXISTS idx_videos_partitioned_created_at ON videos_partitioned(created_at);
