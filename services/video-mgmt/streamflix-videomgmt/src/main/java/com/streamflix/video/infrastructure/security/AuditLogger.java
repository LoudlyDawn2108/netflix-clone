package com.streamflix.video.infrastructure.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Service responsible for logging security-related audit events.
 * Uses structured logging to facilitate integration with logging
 * aggregation and analytics tools.
 */
@Service
public class AuditLogger {

    private static final Logger logger = LoggerFactory.getLogger("AUDIT");
    private static final DateTimeFormatter formatter = DateTimeFormatter.ISO_DATE_TIME;

    /**
     * Log an authentication success event.
     *
     * @param username the username of the authenticated user
     * @param method the authentication method used (JWT, API Key)
     * @param ipAddress the IP address of the client
     */
    public void logAuthenticationSuccess(String username, String method, String ipAddress) {
        logEvent(
            "AUTHENTICATION_SUCCESS",
            username,
            method,
            "User successfully authenticated",
            ipAddress
        );
    }

    /**
     * Log an authentication failure event.
     *
     * @param username the attempted username
     * @param method the authentication method used
     * @param reason the reason for failure
     * @param ipAddress the IP address of the client
     */
    public void logAuthenticationFailure(String username, String method, String reason, String ipAddress) {
        logEvent(
            "AUTHENTICATION_FAILURE",
            username,
            method,
            reason,
            ipAddress
        );
    }

    /**
     * Log an access denied event.
     *
     * @param resource the resource being accessed
     * @param requiredRole the role required for access
     * @param ipAddress the IP address of the client
     */
    public void logAccessDenied(String resource, String requiredRole, String ipAddress) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth != null ? auth.getName() : "anonymous";
        
        logEvent(
            "ACCESS_DENIED",
            username,
            resource,
            "Insufficient permissions. Required role: " + requiredRole,
            ipAddress
        );
    }

    /**
     * Log a resource access event.
     *
     * @param resource the resource being accessed
     * @param action the action being performed (READ, WRITE, DELETE)
     * @param resourceId the ID of the resource
     */
    public void logResourceAccess(String resource, String action, String resourceId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return;
        
        String username = auth.getName();
        
        logEvent(
            "RESOURCE_" + action,
            username,
            resource,
            "Resource ID: " + resourceId,
            null
        );
    }

    /**
     * Log a system configuration change.
     *
     * @param component the component being configured
     * @param description description of the change
     */
    public void logConfigurationChange(String component, String description) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return;
        
        String username = auth.getName();
        
        logEvent(
            "CONFIGURATION_CHANGE",
            username,
            component,
            description,
            null
        );
    }

    /**
     * Generic method to log a security event with common fields.
     */
    private void logEvent(String eventType, String username, String resource, String details, String ipAddress) {
        StringBuilder sb = new StringBuilder();
        sb.append("[SECURITY_AUDIT] ");
        sb.append("timestamp=").append(LocalDateTime.now().format(formatter)).append(" ");
        sb.append("event=").append(eventType).append(" ");
        sb.append("user=").append(username).append(" ");
        sb.append("resource=").append(resource).append(" ");
        
        if (ipAddress != null) {
            sb.append("ip=").append(ipAddress).append(" ");
        }
        
        sb.append("details=\"").append(details).append("\"");
        
        logger.info(sb.toString());
    }
}