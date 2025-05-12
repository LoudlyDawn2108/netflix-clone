package com.streamflix.video.infrastructure.gdpr;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.streamflix.video.domain.VideoRepository;
import com.streamflix.video.domain.Video;
import com.streamflix.video.domain.model.User;
import com.streamflix.video.domain.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

/**
 * Service for handling GDPR-related operations such as data export
 * and right to erasure (right to be forgotten).
 */
@Service
public class GdprComplianceService {

    private static final Logger logger = LoggerFactory.getLogger(GdprComplianceService.class);
    
    private final UserRepository userRepository;
    private final VideoRepository videoRepository;
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    
    public GdprComplianceService(
            UserRepository userRepository,
            VideoRepository videoRepository,
            JdbcTemplate jdbcTemplate,
            ObjectMapper objectMapper) {
        this.userRepository = userRepository;
        this.videoRepository = videoRepository;
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }
    
    /**
     * Export all personal data related to a user in a structured format
     * @param userId The user ID
     * @return Byte array of ZIP file containing the user's data
     */
    public byte[] exportUserData(UUID userId) {
        logger.info("Exporting user data for user ID: {}", userId);
        
        try {
            // Get user data
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
            
            // Create a container for all user data
            Map<String, Object> userData = new HashMap<>();
            
            // Add basic user information
            userData.put("profile", anonymizeUserForExport(user));
            
            // Get user's videos
            List<Video> userVideos = videoRepository.findByUserId(userId);
            userData.put("videos", userVideos);
            
            // Get user's activity logs
            List<Map<String, Object>> activityLogs = jdbcTemplate.queryForList(
                "SELECT event_type, created_at, details FROM user_activity_logs WHERE user_id = ?",
                userId.toString()
            );
            userData.put("activityLogs", activityLogs);
            
            // Convert data to JSON
            String jsonData = objectMapper.writeValueAsString(userData);
            
            // Create ZIP file with data
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ZipOutputStream zipOut = new ZipOutputStream(baos);
            
            // Add JSON data file
            ZipEntry jsonEntry = new ZipEntry("user_data.json");
            zipOut.putNextEntry(jsonEntry);
            zipOut.write(jsonData.getBytes());
            zipOut.closeEntry();
            
            // Add README file
            ZipEntry readmeEntry = new ZipEntry("README.txt");
            zipOut.putNextEntry(readmeEntry);
            String readme = "This archive contains your personal data exported from the Streamflix platform.\n" +
                    "Date of export: " + LocalDateTime.now() + "\n" +
                    "User ID: " + userId + "\n\n" +
                    "For questions regarding your data, please contact privacy@streamflix.com";
            zipOut.write(readme.getBytes());
            zipOut.closeEntry();
            
            zipOut.close();
            logger.info("Successfully exported data for user ID: {}", userId);
            return baos.toByteArray();
        } catch (IOException e) {
            logger.error("Error exporting user data: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to export user data", e);
        }
    }
    
    /**
     * Remove personally identifiable information from user for export
     */
    private Map<String, Object> anonymizeUserForExport(User user) {
        Map<String, Object> userData = new HashMap<>();
        userData.put("username", user.getUsername());
        userData.put("email", user.getEmail());
        userData.put("createdAt", user.getCreatedAt());
        userData.put("lastLogin", user.getLastLogin());
        userData.put("roles", user.getRoles());
        return userData;
    }
    
    /**
     * Implement right to erasure by anonymizing a user's data
     * @param userId The user ID
     */
    @Transactional
    public void anonymizeUser(UUID userId) {
        logger.info("Anonymizing user data for user ID: {}", userId);
        
        try {
            // Get user
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
            
            // Generate anonymous identifiers
            String anonymousEmail = "anonymized-" + UUID.randomUUID().toString() + "@example.com";
            String anonymousUsername = "anonymized-" + UUID.randomUUID().toString();
            
            // Update user record with anonymized data
            user.setEmail(anonymousEmail);
            user.setUsername(anonymousUsername);
            user.setPassword("[REDACTED]");
            userRepository.save(user);
            
            // Anonymize user's sensitive metadata in videos
            jdbcTemplate.update(
                "UPDATE video_metadata SET creator_name = 'Anonymous', contact_email = ? WHERE user_id = ?",
                anonymousEmail, userId.toString()
            );
            
            // Clear user activity logs
            jdbcTemplate.update(
                "DELETE FROM user_activity_logs WHERE user_id = ?",
                userId.toString()
            );
            
            logger.info("Successfully anonymized data for user ID: {}", userId);
        } catch (Exception e) {
            logger.error("Error anonymizing user data: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to anonymize user data", e);
        }
    }
    
    /**
     * Check if content needs to be anonymized for GDPR compliance
     * @param tenantId The tenant ID
     * @return Number of records anonymized
     */
    @Transactional
    public int anonymizeExpiredUserData(UUID tenantId) {
        logger.info("Running scheduled anonymization for tenant ID: {}", tenantId);
        
        // Find users who requested deletion and whose retention period has expired
        LocalDateTime cutoffDate = LocalDateTime.now().minusDays(30); // 30-day retention
        
        // Get users marked for deletion with expired retention period
        List<String> userIdsToAnonymize = jdbcTemplate.queryForList(
            "SELECT user_id FROM user_deletion_requests " +
            "WHERE tenant_id = ? AND requested_at < ? AND processed = false",
            String.class,
            tenantId.toString(), cutoffDate
        );
        
        int count = 0;
        for (String userId : userIdsToAnonymize) {
            try {
                anonymizeUser(UUID.fromString(userId));
                
                // Mark as processed
                jdbcTemplate.update(
                    "UPDATE user_deletion_requests SET processed = true, processed_at = CURRENT_TIMESTAMP WHERE user_id = ?",
                    userId
                );
                
                count++;
            } catch (Exception e) {
                logger.error("Error anonymizing user {}: {}", userId, e.getMessage(), e);
            }
        }
        
        logger.info("Anonymized {} users for tenant {}", count, tenantId);
        return count;
    }
}
