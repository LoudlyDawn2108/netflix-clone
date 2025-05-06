package com.streamflix.video.infrastructure.security;

import jakarta.servlet.http.HttpServletRequest;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.AfterThrowing;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.Optional;
import java.util.UUID;

/**
 * Aspect for security auditing that captures security-related events
 * using aspect-oriented programming.
 */
@Aspect
@Component
public class SecurityAuditAspect {

    private final AuditLogger auditLogger;

    public SecurityAuditAspect(AuditLogger auditLogger) {
        this.auditLogger = auditLogger;
    }
    
    /**
     * Captures controller method executions that are annotated with @PreAuthorize.
     * Logs the attempt before the method executes.
     */
    @Before("@annotation(org.springframework.security.access.prepost.PreAuthorize) && " +
            "execution(* com.streamflix.video.presentation.*Controller.*(..))")
    public void logSecuredControllerAccess(JoinPoint joinPoint) {
        // Get method signature and any PreAuthorize annotation
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        Method method = signature.getMethod();
        PreAuthorize preAuthorize = method.getAnnotation(PreAuthorize.class);
        
        // Get the resource being accessed
        String resourceName = signature.getDeclaringType().getSimpleName() + "." + method.getName();
        
        // Try to extract a resource ID from the method arguments
        String resourceId = extractResourceId(joinPoint.getArgs());
        
        // Get the IP address from the current request
        String ipAddress = getClientIpAddress();
        
        // Get authentication details
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth != null ? auth.getName() : "anonymous";
        
        // Log the resource access
        if (preAuthorize != null) {
            auditLogger.logResourceAccess(
                    resourceName, 
                    determineActionType(method.getName()), 
                    resourceId != null ? resourceId : "N/A");
        }
    }
    
    /**
     * Logs when access is denied due to insufficient privileges.
     */
    @AfterThrowing(
            pointcut = "execution(* com.streamflix.video.presentation.*Controller.*(..))",
            throwing = "ex")
    public void logAccessDeniedExceptions(JoinPoint joinPoint, Exception ex) {
        if (ex.getClass().getName().contains("AccessDenied")) {
            MethodSignature signature = (MethodSignature) joinPoint.getSignature();
            Method method = signature.getMethod();
            String resourceName = signature.getDeclaringType().getSimpleName() + "." + method.getName();
            
            PreAuthorize preAuthorize = method.getAnnotation(PreAuthorize.class);
            String requiredRole = preAuthorize != null ? preAuthorize.value() : "unknown";
            
            auditLogger.logAccessDenied(resourceName, requiredRole, getClientIpAddress());
        }
    }
    
    /**
     * Logs successful authentication events.
     */
    @AfterReturning(
            pointcut = "execution(* com.streamflix.video.infrastructure.security.JwtAuthenticationFilter.doFilterInternal(..))",
            returning = "result")
    public void logSuccessfulJwtAuthentication(JoinPoint joinPoint, Object result) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated()) {
            auditLogger.logAuthenticationSuccess(
                    auth.getName(),
                    "JWT",
                    getClientIpAddress()
            );
        }
    }
    
    /**
     * Logs successful API key authentication events.
     */
    @AfterReturning(
            pointcut = "execution(* com.streamflix.video.infrastructure.security.ApiKeyAuthFilter.doFilterInternal(..))",
            returning = "result")
    public void logSuccessfulApiKeyAuthentication(JoinPoint joinPoint, Object result) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_SERVICE"))) {
            auditLogger.logAuthenticationSuccess(
                    auth.getName(),
                    "API_KEY",
                    getClientIpAddress()
            );
        }
    }
    
    /**
     * Determines the type of action (READ, WRITE, DELETE) based on the method name.
     */
    private String determineActionType(String methodName) {
        methodName = methodName.toLowerCase();
        if (methodName.startsWith("get") || methodName.startsWith("find") || methodName.startsWith("list")) {
            return "READ";
        } else if (methodName.startsWith("delete") || methodName.startsWith("remove")) {
            return "DELETE";
        } else {
            return "WRITE"; // create, update, etc.
        }
    }
    
    /**
     * Extracts a resource ID from method arguments if available.
     */
    private String extractResourceId(Object[] args) {
        return Arrays.stream(args)
                .filter(arg -> arg instanceof UUID || 
                              (arg instanceof String && isUuid((String) arg)))
                .findFirst()
                .map(Object::toString)
                .orElse(null);
    }
    
    /**
     * Checks if a string is a valid UUID.
     */
    private boolean isUuid(String str) {
        try {
            UUID.fromString(str);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
    
    /**
     * Gets the client IP address from the current request.
     */
    private String getClientIpAddress() {
        return Optional.ofNullable(RequestContextHolder.getRequestAttributes())
                .filter(ServletRequestAttributes.class::isInstance)
                .map(ServletRequestAttributes.class::cast)
                .map(ServletRequestAttributes::getRequest)
                .map(this::extractIpAddress)
                .orElse("unknown");
    }
    
    /**
     * Extracts the client IP address from an HTTP request, handling proxies.
     */
    private String extractIpAddress(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("WL-Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("HTTP_X_FORWARDED_FOR");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("HTTP_X_FORWARDED");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("HTTP_X_CLUSTER_CLIENT_IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("HTTP_CLIENT_IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("HTTP_FORWARDED_FOR");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("HTTP_FORWARDED");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        return ip;
    }
}