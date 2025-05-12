package com.streamflix.video.infrastructure.config;

import com.streamflix.video.domain.TenantRepository;
import com.streamflix.video.domain.model.Tenant;
import com.streamflix.video.infrastructure.archiving.DataArchivingService;
import com.streamflix.video.infrastructure.gdpr.GdprComplianceService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

import java.util.List;

/**
 * Configuration class for scheduling data management jobs.
 * Handles archiving, retention policy enforcement, and GDPR compliance.
 */
@Configuration
@EnableScheduling
public class DataManagementSchedulingConfig {

    private static final Logger logger = LoggerFactory.getLogger(DataManagementSchedulingConfig.class);
    
    private final DataArchivingService dataArchivingService;
    private final GdprComplianceService gdprComplianceService;
    private final TenantRepository tenantRepository;
    
    public DataManagementSchedulingConfig(
            DataArchivingService dataArchivingService,
            GdprComplianceService gdprComplianceService,
            TenantRepository tenantRepository) {
        this.dataArchivingService = dataArchivingService;
        this.gdprComplianceService = gdprComplianceService;
        this.tenantRepository = tenantRepository;
    }
    
    /**
     * Run data archiving job daily at 2 AM
     * Archives videos marked for deletion and old videos to cold storage
     */
    @Scheduled(cron = "${app.archiving.schedule:0 0 2 * * *}")
    public void scheduledArchiving() {
        logger.info("Starting scheduled data archiving job");
        try {
            dataArchivingService.archiveDeletedVideos();
            dataArchivingService.archiveOldVideos();
            logger.info("Completed scheduled data archiving job");
        } catch (Exception e) {
            logger.error("Error in scheduled data archiving job: {}", e.getMessage(), e);
        }
    }
    
    /**
     * Process GDPR anonymization requests daily at 3 AM
     * Runs for each tenant
     */
    @Scheduled(cron = "0 0 3 * * *")
    public void processGdprAnonymizationRequests() {
        logger.info("Starting scheduled GDPR anonymization job");
        try {
            List<Tenant> activeTenants = tenantRepository.findAll()
                    .stream()
                    .filter(Tenant::isActive)
                    .toList();
            
            logger.info("Processing GDPR anonymization requests for {} tenants", activeTenants.size());
            int totalProcessed = 0;
            
            for (Tenant tenant : activeTenants) {
                int processed = gdprComplianceService.anonymizeExpiredUserData(tenant.getId());
                totalProcessed += processed;
                logger.info("Processed {} anonymization requests for tenant {}", processed, tenant.getIdentifier());
            }
            
            logger.info("Completed GDPR anonymization job, processed {} requests", totalProcessed);
        } catch (Exception e) {
            logger.error("Error in GDPR anonymization job: {}", e.getMessage(), e);
        }
    }
}
