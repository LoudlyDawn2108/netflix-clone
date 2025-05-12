package com.streamflix.video.infrastructure.archiving;

import com.streamflix.video.domain.model.Tenant;
import com.streamflix.video.domain.TenantRepository;
import com.streamflix.video.domain.VideoRepository;
import com.streamflix.video.domain.model.DataRetentionPolicy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Service responsible for data archiving and enforcing retention policies.
 */
@Service
public class DataArchivingService {

    private static final Logger logger = LoggerFactory.getLogger(DataArchivingService.class);
    
    private final JdbcTemplate jdbcTemplate;
    private final TenantRepository tenantRepository;
    private final VideoRepository videoRepository;
    private final S3ArchiveManager s3ArchiveManager;
    
    @Value("${app.archiving.enabled:true}")
    private boolean archivingEnabled;
    
    @Value("${app.archiving.default-retention-days:365}")
    private int defaultRetentionDays;
    
    @Value("${app.archiving.deleted-retention-days:30}")
    private int deletedRetentionDays;
    
    public DataArchivingService(
            JdbcTemplate jdbcTemplate,
            TenantRepository tenantRepository,
            VideoRepository videoRepository,
            S3ArchiveManager s3ArchiveManager) {
        this.jdbcTemplate = jdbcTemplate;
        this.tenantRepository = tenantRepository;
        this.videoRepository = videoRepository;
        this.s3ArchiveManager = s3ArchiveManager;
    }
    
    /**
     * Run archiving process on a schedule (once a day at 2 AM)
     */
    @Scheduled(cron = "0 0 2 * * *")
    public void scheduledArchiving() {
        if (!archivingEnabled) {
            logger.info("Archiving is disabled. Skipping scheduled archiving.");
            return;
        }
        
        logger.info("Starting scheduled data archiving process");
        
        // Archive videos marked for deletion
        archiveDeletedVideos();
        
        // Archive old videos based on retention policies
        archiveOldVideos();
        
        logger.info("Scheduled data archiving process completed");
    }
    
    /**
     * Archive videos that have been marked for deletion
     */
    @Transactional
    public void archiveDeletedVideos() {
        logger.info("Archiving videos marked for deletion");
        
        // Find videos marked as DELETED older than the retention period for deleted content
        LocalDateTime cutoffDate = LocalDateTime.now().minusDays(deletedRetentionDays);
        
        List<Object[]> deletedVideos = jdbcTemplate.query(
            "SELECT id, tenant_id FROM videos WHERE status = 'DELETED' AND updated_at < ?",
            (rs, rowNum) -> new Object[]{rs.getString("id"), rs.getString("tenant_id")},
            cutoffDate
        );
        
        logger.info("Found {} deleted videos to archive", deletedVideos.size());
        
        for (Object[] video : deletedVideos) {
            String videoId = (String) video[0];
            String tenantId = (String) video[1];
            
            try {
                // Archive video data to S3 glacier
                s3ArchiveManager.archiveVideoData(videoId, tenantId);
                
                // Delete from primary storage
                jdbcTemplate.update(
                    "DELETE FROM videos WHERE id = ?",
                    videoId
                );
                
                logger.info("Archived and deleted video {} for tenant {}", videoId, tenantId);
            } catch (Exception e) {
                logger.error("Error archiving video {}: {}", videoId, e.getMessage(), e);
            }
        }
    }
    
    /**
     * Archive old videos based on tenant retention policies
     */
    @Transactional
    public void archiveOldVideos() {
        logger.info("Archiving old videos based on retention policies");
        
        // Process each active tenant
        List<Tenant> tenants = tenantRepository.findAll();
        for (Tenant tenant : tenants) {
            if (!tenant.isActive()) {
                continue;
            }
            
            int retentionDays = determineRetentionDays(tenant);
            
            // Find old videos that should be archived
            LocalDateTime cutoffDate = LocalDateTime.now().minusDays(retentionDays);
            
            List<String> oldVideoIds = jdbcTemplate.queryForList(
                "SELECT id FROM videos WHERE tenant_id = ? AND status = 'READY' AND updated_at < ? AND created_at < ?",
                String.class,
                tenant.getId(),
                cutoffDate,
                cutoffDate
            );
            
            logger.info("Found {} old videos to archive for tenant {}", oldVideoIds.size(), tenant.getIdentifier());
            
            for (String videoId : oldVideoIds) {
                try {
                    // Archive video to cold storage
                    s3ArchiveManager.moveVideoToColderTier(videoId, tenant.getId().toString());
                    
                    // Update video status to ARCHIVED
                    jdbcTemplate.update(
                        "UPDATE videos SET status = 'ARCHIVED', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                        videoId
                    );
                    
                    logger.info("Archived video {} for tenant {}", videoId, tenant.getIdentifier());
                } catch (Exception e) {
                    logger.error("Error archiving old video {}: {}", videoId, e.getMessage(), e);
                }
            }
        }
    }
    
    /**
     * Determine retention period for a tenant based on subscription level
     */
    private int determineRetentionDays(Tenant tenant) {
        // Determine retention days based on tenant subscription level
        switch (tenant.getSubscriptionLevel()) {
            case BASIC:
                return 180; // 6 months
            case STANDARD:
                return 365; // 1 year
            case PREMIUM:
                return 730; // 2 years
            case ENTERPRISE:
                return 1825; // 5 years
            default:
                return defaultRetentionDays;
        }
    }
}
