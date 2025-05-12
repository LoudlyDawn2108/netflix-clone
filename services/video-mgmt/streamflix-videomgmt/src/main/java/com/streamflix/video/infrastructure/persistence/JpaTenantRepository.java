package com.streamflix.video.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.streamflix.video.domain.model.Tenant;

import java.util.Optional;
import java.util.UUID;

/**
 * Spring Data JPA repository for Tenant entities.
 */
@Repository
public interface JpaTenantRepository extends JpaRepository<Tenant, UUID> {
    
    /**
     * Find a tenant by its string identifier
     * @param identifier The tenant identifier
     * @return Optional containing the tenant if found
     */
    Optional<Tenant> findByIdentifier(String identifier);
}
