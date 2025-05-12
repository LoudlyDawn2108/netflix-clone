package com.streamflix.video.infrastructure.partitioning;

import com.streamflix.video.domain.model.Tenant;
import com.streamflix.video.domain.TenantRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

/**
 * Service to manage tenant partitions in the database.
 * Scans for tenants and ensures each has appropriate partitions.
 */
@Service
@ConditionalOnProperty(name = "app.partitioning.enabled", havingValue = "true")
public class TenantPartitionRoutingService {

    private static final Logger logger = LoggerFactory.getLogger(TenantPartitionRoutingService.class);
    
    private final PostgresPartitionManager partitionManager;
    private final TenantRepository tenantRepository;
    
    public TenantPartitionRoutingService(
            PostgresPartitionManager partitionManager,
            TenantRepository tenantRepository) {
        this.partitionManager = partitionManager;
        this.tenantRepository = tenantRepository;
    }
    
    /**
     * Initialize partitions for all existing tenants at startup
     */
    public void initializePartitions() {
        logger.info("Initializing database partitions for all tenants");
        tenantRepository.findAll().forEach(this::ensurePartitionExists);
    }
    
    /**
     * Periodically check for new tenants and create partitions
     */
    @Scheduled(fixedRate = 3600000) // Check every hour
    public void scheduledPartitionCheck() {
        logger.info("Running scheduled partition check");
        tenantRepository.findAll().forEach(this::ensurePartitionExists);
    }
    
    /**
     * Create a partition for a new tenant
     * @param tenant The tenant entity
     */
    public void ensurePartitionExists(Tenant tenant) {
        try {
            // Use tenant identifier for partition name to ensure uniqueness
            partitionManager.createTenantPartition(tenant.getIdentifier());
            logger.info("Created database partition for tenant: {}", tenant.getIdentifier());
        } catch (Exception ex) {
            // Log but don't fail if the partition already exists
            logger.warn("Failed to create partition for tenant {}: {}", tenant.getIdentifier(), ex.getMessage());
        }
    }
}
