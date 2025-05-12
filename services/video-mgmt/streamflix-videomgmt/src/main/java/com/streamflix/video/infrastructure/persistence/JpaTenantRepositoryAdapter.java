package com.streamflix.video.infrastructure.persistence;

import com.streamflix.video.domain.TenantRepository;
import com.streamflix.video.domain.model.Tenant;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Implementation of the TenantRepository interface using Spring Data JPA.
 * This is an adapter in the hexagonal architecture.
 */
@Component
public class JpaTenantRepositoryAdapter implements TenantRepository {
    
    private final JpaTenantRepository jpaTenantRepository;
    
    public JpaTenantRepositoryAdapter(JpaTenantRepository jpaTenantRepository) {
        this.jpaTenantRepository = jpaTenantRepository;
    }
    
    @Override
    public Tenant save(Tenant tenant) {
        return jpaTenantRepository.save(tenant);
    }
    
    @Override
    public Optional<Tenant> findById(UUID id) {
        return jpaTenantRepository.findById(id);
    }
    
    @Override
    public Optional<Tenant> findByIdentifier(String identifier) {
        return jpaTenantRepository.findByIdentifier(identifier);
    }
    
    @Override
    public List<Tenant> findAll() {
        return jpaTenantRepository.findAll();
    }
    
    @Override
    public void delete(Tenant tenant) {
        jpaTenantRepository.delete(tenant);
    }
    
    @Override
    public boolean existsById(UUID id) {
        return jpaTenantRepository.existsById(id);
    }
}
