package com.streamflix.video.infrastructure.gdpr;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.streamflix.video.infrastructure.multitenancy.TenantContextHolder;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.*;

/**
 * Service for GDPR compliance audit logging.
 * Keeps track of user data processing activities for accountability.
 */
@Service
public class DataProtectionAuditService {
    
    private static final Logger logger = LoggerFactory.getLogger(DataProtectionAuditService.class);
    
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    
    public DataProtectionAuditService(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }
    
    /**
     * Log a user data processing activity
     * @param userId The user ID whose data is being processed
     * @param eventType The type of processing event
     * @param details Additional details about the processing
     */
    public void logActivity(UUID userId, String eventType, Map<String, Object> details) {
        try {
            UUID tenantId = TenantContextHolder.getTenantId();
            HttpServletRequest request = getCurrentRequest();
            
            String ipAddress = request != null ? getClientIp(request) : "unknown";
            String userAgent = request != null ? request.getHeader("User-Agent") : "unknown";
            String detailsJson = objectMapper.writeValueAsString(details != null ? details : Collections.emptyMap());
            
            jdbcTemplate.update(
                "INSERT INTO user_activity_logs (id, user_id, tenant_id, event_type, ip_address, user_agent, details) " +
                "VALUES (gen_random_uuid(), ?, ?, ?, ?, ?, ?::jsonb)",
                userId.toString(),
                tenantId.toString(),
                eventType,
                ipAddress,
                userAgent,
                detailsJson
            );
            
            logger.debug("Logged user activity: {} for user {} in tenant {}", eventType, userId, tenantId);
        } catch (Exception e) {
            logger.error("Error logging user activity: {}", e.getMessage(), e);
            // Don't rethrow - logging failures shouldn't interrupt normal processing
        }
    }
    
    /**
     * Get the current HTTP request if available
     */
    private HttpServletRequest getCurrentRequest() {
        try {
            return ((ServletRequestAttributes) RequestContextHolder.getRequestAttributes()).getRequest();
        } catch (Exception e) {
            return null;
        }
    }
    
    /**
     * Get client IP address, handling proxy forwarding
     */
    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
    
    /**
     * Get the recent activity history for a user
     * @param userId The user ID
     * @param limit Maximum number of records to return
     * @return List of activity records
     */
    public List<Map<String, Object>> getUserActivityHistory(UUID userId, int limit) {
        UUID tenantId = TenantContextHolder.getTenantId();
        
        return jdbcTemplate.queryForList(
            "SELECT id, event_type, ip_address, created_at, details " +
            "FROM user_activity_logs " +
            "WHERE user_id = ? AND tenant_id = ? " +
            "ORDER BY created_at DESC " +
            "LIMIT ?",
            userId.toString(),
            tenantId.toString(),
            limit
        );
    }
    
    /**
     * Delete activity logs for a user (as part of right to erasure)
     * @param userId The user ID
     */
    public void deleteUserActivityLogs(UUID userId) {
        UUID tenantId = TenantContextHolder.getTenantId();
        
        jdbcTemplate.update(
            "DELETE FROM user_activity_logs WHERE user_id = ? AND tenant_id = ?",
            userId.toString(),
            tenantId.toString()
        );
        
        logger.info("Deleted activity logs for user {} in tenant {}", userId, tenantId);
    }
}
