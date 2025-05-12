package com.streamflix.video.infrastructure.archiving;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

/**
 * Manages the archiving of video data to S3 storage using appropriate storage classes
 * for cost-effective long-term storage.
 */
@Component
public class S3ArchiveManager {

    private static final Logger logger = LoggerFactory.getLogger(S3ArchiveManager.class);
    
    private final S3Client s3Client;
    
    @Value("${app.archive.bucket:streamflix-archive}")
    private String archiveBucket;
    
    @Value("${app.video.bucket:streamflix-videos}")
    private String videoBucket;
    
    public S3ArchiveManager(S3Client s3Client) {
        this.s3Client = s3Client;
    }
    
    /**
     * Archives video data to S3 Glacier Deep Archive for long-term retention
     * @param videoId The video ID
     * @param tenantId The tenant ID
     */
    public void archiveVideoData(String videoId, String tenantId) {
        logger.info("Archiving video data for video {} in tenant {}", videoId, tenantId);
        
        try {
            // List all objects with video ID prefix
            ListObjectsV2Request listRequest = ListObjectsV2Request.builder()
                .bucket(videoBucket)
                .prefix("tenant-" + tenantId + "/video-" + videoId + "/")
                .build();
            
            ListObjectsV2Response listResponse = s3Client.listObjectsV2(listRequest);
            
            // Copy each object to the archive bucket with Glacier Deep Archive storage class
            for (S3Object s3Object : listResponse.contents()) {
                String key = s3Object.key();
                String archiveKey = "archive/" + LocalDate.now().format(DateTimeFormatter.ISO_DATE) + 
                        "/tenant-" + tenantId + "/video-" + videoId + "/" + key.substring(key.lastIndexOf('/') + 1);
                
                // Copy to archive bucket with Glacier Deep Archive storage class
                CopyObjectRequest copyRequest = CopyObjectRequest.builder()
                    .sourceBucket(videoBucket)
                    .sourceKey(key)
                    .destinationBucket(archiveBucket)
                    .destinationKey(archiveKey)
                    .storageClass(StorageClass.DEEP_ARCHIVE)
                    .build();
                
                s3Client.copyObject(copyRequest);
                
                // Delete the original
                DeleteObjectRequest deleteRequest = DeleteObjectRequest.builder()
                    .bucket(videoBucket)
                    .key(key)
                    .build();
                
                s3Client.deleteObject(deleteRequest);
                
                logger.debug("Archived object from {}/{} to {}/{}", videoBucket, key, archiveBucket, archiveKey);
            }
            
            logger.info("Successfully archived video {} for tenant {}", videoId, tenantId);
        } catch (Exception e) {
            logger.error("Error archiving video data: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to archive video data", e);
        }
    }
    
    /**
     * Moves a video to a colder storage tier (like S3 Standard-IA) for less frequently accessed data
     * @param videoId The video ID
     * @param tenantId The tenant ID
     */
    public void moveVideoToColderTier(String videoId, String tenantId) {
        logger.info("Moving video {} for tenant {} to colder storage tier", videoId, tenantId);
        
        try {
            // List all objects with video ID prefix
            ListObjectsV2Request listRequest = ListObjectsV2Request.builder()
                .bucket(videoBucket)
                .prefix("tenant-" + tenantId + "/video-" + videoId + "/")
                .build();
            
            ListObjectsV2Response listResponse = s3Client.listObjectsV2(listRequest);
            
            // Update each object's storage class to Standard-IA
            for (S3Object s3Object : listResponse.contents()) {
                String key = s3Object.key();
                
                // Copy in place with new storage class (S3 has no direct way to change storage class)
                CopyObjectRequest copyRequest = CopyObjectRequest.builder()
                    .sourceBucket(videoBucket)
                    .sourceKey(key)
                    .destinationBucket(videoBucket)
                    .destinationKey(key)
                    .storageClass(StorageClass.STANDARD_IA)
                    .build();
                
                s3Client.copyObject(copyRequest);
                
                logger.debug("Changed storage class to STANDARD_IA for {}/{}", videoBucket, key);
            }
            
            logger.info("Successfully moved video {} for tenant {} to colder storage tier", videoId, tenantId);
        } catch (Exception e) {
            logger.error("Error moving video to colder storage tier: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to move video to colder storage tier", e);
        }
    }
    
    /**
     * Restores a video from archive for temporary access
     * @param videoId The video ID
     * @param tenantId The tenant ID 
     * @param expirationDays Number of days the restored copy should be available
     */
    public void restoreVideoFromArchive(String videoId, String tenantId, int expirationDays) {
        logger.info("Initiating restore for archived video {} in tenant {}", videoId, tenantId);
        
        try {
            // List all objects in the archive with video ID prefix
            ListObjectsV2Request listRequest = ListObjectsV2Request.builder()
                .bucket(archiveBucket)
                .prefix("archive/tenant-" + tenantId + "/video-" + videoId + "/")
                .build();
            
            ListObjectsV2Response listResponse = s3Client.listObjectsV2(listRequest);
            
            // Restore each archived object
            for (S3Object s3Object : listResponse.contents()) {
                String key = s3Object.key();
                
                // Configure restore request
                RestoreObjectRequest restoreRequest = RestoreObjectRequest.builder()
                    .bucket(archiveBucket)
                    .key(key)
                    .restoreRequest(r -> r
                        .days(expirationDays)
                        .glacierJobParameters(g -> g
                            .tier(Tier.STANDARD)
                        )
                    )
                    .build();
                
                s3Client.restoreObject(restoreRequest);
                
                logger.debug("Initiated restore for {}/{}, available for {} days", archiveBucket, key, expirationDays);
            }
            
            logger.info("Successfully initiated restore for video {} in tenant {}", videoId, tenantId);
        } catch (Exception e) {
            logger.error("Error restoring video from archive: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to restore video from archive", e);
        }
    }
    
    /**
     * Archives a video to deep archive storage
     * @param video The video entity to archive
     * @return The archive storage location
     */
    public String archiveVideo(Video video) {
        if (video == null) {
            throw new IllegalArgumentException("Video cannot be null");
        }
        
        logger.info("Archiving video: {} for tenant: {}", video.getId(), video.getTenantId());
        
        try {
            String videoId = video.getId().toString();
            String tenantId = video.getTenantId().toString();
            
            // Archive the video content to Glacier
            archiveVideoData(videoId, tenantId);
            
            // Generate the archive storage location
            String archivePath = "archive/" + LocalDate.now().format(DateTimeFormatter.ISO_DATE) + 
                    "/tenant-" + tenantId + "/video-" + videoId;
            
            // Update the video entity with archive information
            video.setArchived(true);
            video.setArchivedAt(LocalDateTime.now());
            video.setArchiveStorageLocation(archivePath);
            
            return archivePath;
        } catch (Exception e) {
            logger.error("Error archiving video {}: {}", video.getId(), e.getMessage(), e);
            throw new RuntimeException("Failed to archive video", e);
        }
    }
    
    /**
     * Restores an archived video to active storage
     * @param video The archived video to restore
     */
    public void restoreVideo(Video video) {
        if (video == null) {
            throw new IllegalArgumentException("Video cannot be null");
        }
        
        if (!video.isArchived()) {
            throw new IllegalStateException("Video is not archived and cannot be restored");
        }
        
        logger.info("Restoring archived video: {} for tenant: {}", video.getId(), video.getTenantId());
        
        try {
            String videoId = video.getId().toString();
            String tenantId = video.getTenantId().toString();
            
            // Restore from glacier with 7-day availability 
            restoreVideoFromArchive(videoId, tenantId, 7);
            
            // Update the video entity
            video.setArchived(false);
            video.setArchivedAt(null);
            video.setArchiveStorageLocation(null);
            
        } catch (Exception e) {
            logger.error("Error restoring video {}: {}", video.getId(), e.getMessage(), e);
            throw new RuntimeException("Failed to restore video", e);
        }
    }
    
    /**
     * Build metadata for archiving a video
     * @param video The video to build metadata for
     * @return Map of metadata key-value pairs
     */
    public Map<String, String> buildArchiveMetadata(Video video) {
        Map<String, String> metadata = new HashMap<>();
        metadata.put("tenant-id", video.getTenantId().toString());
        metadata.put("video-id", video.getId().toString());
        metadata.put("archive-date", LocalDate.now().toString());
        metadata.put("content-type", "video/mp4");
        metadata.put("original-path", video.getStorageLocation());
        
        return metadata;
    }
}
