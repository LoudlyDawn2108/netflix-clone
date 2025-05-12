package com.streamflix.video.infrastructure.multitenancy;

import com.streamflix.video.domain.TenantRepository;
import com.streamflix.video.domain.model.Tenant;
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Optional;
import java.util.UUID;

/**
 * Filter that extracts tenant information from the request and sets it in the TenantContextHolder.
 * This will look for tenant identification in:
 * 1. X-Tenant-ID header
 * 2. tenant query parameter
 * 3. JWT token claims (if authenticated)
 */
@Component
@Order(1) // Make sure this runs early in the filter chain
public class TenantIdentificationFilter extends OncePerRequestFilter {
    
    private static final Logger logger = LoggerFactory.getLogger(TenantIdentificationFilter.class);
    
    private final TenantRepository tenantRepository;
    
    public TenantIdentificationFilter(TenantRepository tenantRepository) {
        this.tenantRepository = tenantRepository;
    }
    
    @Override
    protected void doFilterInternal(HttpServletRequest request, 
                                   HttpServletResponse response, 
                                   FilterChain filterChain) throws ServletException, IOException {
        try {
            String tenantIdentifier = extractTenantIdentifier(request);
            
            // Skip tenant resolution for non-API paths
            if (shouldSkipTenantResolution(request) || tenantIdentifier == null) {
                filterChain.doFilter(request, response);
                return;
            }
            
            Optional<Tenant> tenant = tenantRepository.findByIdentifier(tenantIdentifier);
            if (tenant.isEmpty()) {
                logger.warn("Tenant not found for identifier: {}", tenantIdentifier);
                response.sendError(HttpStatus.UNAUTHORIZED.value(), "Invalid tenant identifier");
                return;
            }
            
            // Set the tenant context for this request
            TenantContextHolder.setTenantId(tenant.get().getId());
            logger.debug("Set tenant context to: {}", tenant.get().getId());
            
            filterChain.doFilter(request, response);
        } finally {
            // Always clear the tenant context after the request is processed
            TenantContextHolder.clear();
        }
    }
    
    private String extractTenantIdentifier(HttpServletRequest request) {
        // Try to extract from header
        String tenantIdentifier = request.getHeader("X-Tenant-ID");
        
        // If not in header, try from query parameter
        if (!StringUtils.hasText(tenantIdentifier)) {
            tenantIdentifier = request.getParameter("tenant");
        }
        
        // If still not found, could extract from JWT token
        // (would require access to SecurityContextHolder and JWT parsing)
        
        return tenantIdentifier;
    }
    
    private boolean shouldSkipTenantResolution(HttpServletRequest request) {
        String path = request.getRequestURI();
        // Skip actuator endpoints, documentation, and static resources
        return path.startsWith("/actuator") || 
               path.startsWith("/swagger-ui") || 
               path.startsWith("/v3/api-docs") ||
               path.startsWith("/error") ||
               path.equals("/");
    }
}
