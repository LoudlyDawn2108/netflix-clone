package com.streamflix.video.domain;

import com.streamflix.video.domain.model.Tenant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository interface for Tenant entity operations.
 * This is a port in the hexagonal architecture that will be implemented
 * by adapters in the infrastructure layer.
 */
public interface TenantRepository {
    
    /**
     * Save a tenant entity to the repository
     * @param tenant The tenant to save
     * @return The saved tenant with any generated ids/fields
     */
    Tenant save(Tenant tenant);
    
    /**
     * Find a tenant by its unique identifier
     * @param id The tenant id
     * @return Optional containing the tenant if found
     */
    Optional<Tenant> findById(UUID id);
    
    /**
     * Find a tenant by its string identifier
     * @param identifier The tenant identifier
     * @return Optional containing the tenant if found
     */
    Optional<Tenant> findByIdentifier(String identifier);
    
    /**
     * Find all tenants
     * @return List of all tenants
     */
    List<Tenant> findAll();
    
    /**
     * Delete a tenant
     * @param tenant The tenant to delete
     */
    void delete(Tenant tenant);
    
    /**
     * Check if a tenant exists by its id
     * @param id The tenant id
     * @return true if the tenant exists, false otherwise
     */
    boolean existsById(UUID id);
}
