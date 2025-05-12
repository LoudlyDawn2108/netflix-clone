package com.streamflix.video.application.service;

import com.streamflix.video.application.port.TenantService;
import com.streamflix.video.domain.TenantRepository;
import com.streamflix.video.domain.model.Tenant;
import com.streamflix.video.domain.model.Tenant.SubscriptionLevel;
import com.streamflix.video.infrastructure.partitioning.TenantPartitionRoutingService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Implementation of the TenantService interface.
 */
@Service
public class TenantServiceImpl implements TenantService {
    
    private final TenantRepository tenantRepository;
    private final Optional<TenantPartitionRoutingService> partitionRoutingService;
    
    public TenantServiceImpl(
            TenantRepository tenantRepository,
            Optional<TenantPartitionRoutingService> partitionRoutingService) {
        this.tenantRepository = tenantRepository;
        this.partitionRoutingService = partitionRoutingService;
    }
    
    @Override
    @Transactional
    public Tenant createTenant(String name, String identifier, SubscriptionLevel subscriptionLevel) {
        Tenant tenant = new Tenant(name, identifier, subscriptionLevel);
        tenant = tenantRepository.save(tenant);
        
        // Create database partitions for the new tenant if partitioning is enabled
        partitionRoutingService.ifPresent(service -> service.ensurePartitionExists(tenant));
        
        return tenant;
    }
    
    @Override
    @Transactional(readOnly = true)
    public Optional<Tenant> getTenantById(UUID id) {
        return tenantRepository.findById(id);
    }
    
    @Override
    @Transactional(readOnly = true)
    public Optional<Tenant> getTenantByIdentifier(String identifier) {
        return tenantRepository.findByIdentifier(identifier);
    }
    
    @Override
    @Transactional(readOnly = true)
    public List<Tenant> getAllTenants() {
        return tenantRepository.findAll();
    }
    
    @Override
    @Transactional
    public Tenant updateSubscriptionLevel(UUID id, SubscriptionLevel subscriptionLevel) {
        Tenant tenant = tenantRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Tenant not found: " + id));
        
        tenant.setSubscriptionLevel(subscriptionLevel);
        return tenantRepository.save(tenant);
    }
    
    @Override
    @Transactional
    public Tenant setActive(UUID id, boolean active) {
        Tenant tenant = tenantRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Tenant not found: " + id));
        
        tenant.setActive(active);
        return tenantRepository.save(tenant);
    }
}
