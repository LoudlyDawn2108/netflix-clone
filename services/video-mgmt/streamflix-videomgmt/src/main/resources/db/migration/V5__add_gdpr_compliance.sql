-- Add user_id to videos table
ALTER TABLE videos ADD COLUMN IF NOT EXISTS user_id UUID;
CREATE INDEX IF NOT EXISTS idx_video_user ON videos(user_id);

-- Create table for data deletion requests (GDPR Right to be Forgotten)
CREATE TABLE IF NOT EXISTS user_deletion_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    requested_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed BOOLEAN NOT NULL DEFAULT false,
    processed_at TIMESTAMP WITHOUT TIME ZONE,
    reason VARCHAR(255),
    CONSTRAINT fk_user_deletion_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX IF NOT EXISTS idx_user_deletion_tenant ON user_deletion_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_deletion_processed ON user_deletion_requests(processed);

-- Create table for data retention policies
CREATE TABLE IF NOT EXISTS data_retention_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL UNIQUE,
    active_data_retention_days INTEGER NOT NULL DEFAULT 365,
    deleted_data_retention_days INTEGER NOT NULL DEFAULT 30,
    archive_trigger_days INTEGER NOT NULL DEFAULT 730,
    purge_trigger_days INTEGER NOT NULL DEFAULT 1825,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_retention_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Create table for user activity logs (for GDPR accountability principle)
CREATE TABLE IF NOT EXISTS user_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    ip_address VARCHAR(50),
    user_agent VARCHAR(255),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    details JSONB,
    CONSTRAINT fk_user_activity_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX IF NOT EXISTS idx_user_activity_tenant ON user_activity_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_user ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_event ON user_activity_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_created ON user_activity_logs(created_at);

-- Update video_tags to include user_id for GDPR compliance
ALTER TABLE video_tags ADD COLUMN IF NOT EXISTS user_id UUID;

-- Add GDPR-related fields to videos table
ALTER TABLE videos ADD COLUMN IF NOT EXISTS contains_personal_data BOOLEAN DEFAULT false;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS is_anonymized BOOLEAN DEFAULT false;
