package com.streamflix.video.application.port;

import com.streamflix.video.domain.model.Tenant;
import com.streamflix.video.domain.model.Tenant.SubscriptionLevel;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Service interface for Tenant management operations.
 */
public interface TenantService {
    
    /**
     * Create a new tenant
     * @param name Tenant name
     * @param identifier Unique identifier for the tenant
     * @param subscriptionLevel Subscription level
     * @return The created tenant
     */
    Tenant createTenant(String name, String identifier, SubscriptionLevel subscriptionLevel);
    
    /**
     * Get a tenant by ID
     * @param id The tenant ID
     * @return The tenant if found
     */
    Optional<Tenant> getTenantById(UUID id);
    
    /**
     * Get a tenant by identifier
     * @param identifier The tenant identifier
     * @return The tenant if found
     */
    Optional<Tenant> getTenantByIdentifier(String identifier);
    
    /**
     * Get all tenants
     * @return List of all tenants
     */
    List<Tenant> getAllTenants();
    
    /**
     * Update a tenant's subscription level
     * @param id The tenant ID
     * @param subscriptionLevel The new subscription level
     * @return The updated tenant
     */
    Tenant updateSubscriptionLevel(UUID id, SubscriptionLevel subscriptionLevel);
    
    /**
     * Activate or deactivate a tenant
     * @param id The tenant ID
     * @param active True to activate, false to deactivate
     * @return The updated tenant
     */
    Tenant setActive(UUID id, boolean active);
}
