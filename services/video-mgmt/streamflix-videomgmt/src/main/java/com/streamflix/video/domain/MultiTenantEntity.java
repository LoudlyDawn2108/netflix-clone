package com.streamflix.video.domain;

import java.util.UUID;

/**
 * Interface for entities that participate in multi-tenancy.
 * Implementing classes are required to provide tenant ID management.
 */
public interface MultiTenantEntity {
    
    /**
     * Get the tenant ID associated with this entity.
     * @return The tenant ID
     */
    UUID getTenantId();
    
    /**
     * Set the tenant ID for this entity.
     * @param tenantId The tenant ID
     */
    void setTenantId(UUID tenantId);
}
