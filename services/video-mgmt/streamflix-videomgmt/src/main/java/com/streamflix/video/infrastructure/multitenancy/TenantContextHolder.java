package com.streamflix.video.infrastructure.multitenancy;

import com.streamflix.video.domain.exception.TenantOperationException;
import com.streamflix.video.domain.exception.TenantOperationException.TenantOperationType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.UUID;

/**
 * Holds the tenant context for the current thread.
 * This is used to determine which tenant's data should be accessed
 * in a multi-tenant environment.
 */
public class TenantContextHolder {
    
    private static final Logger logger = LoggerFactory.getLogger(TenantContextHolder.class);
    private static final ThreadLocal<UUID> CURRENT_TENANT = new ThreadLocal<>();
      /**
     * Set the current tenant ID
     * @param tenantId The tenant ID
     * @throws TenantOperationException if tenantId is null
     */
    public static void setTenantId(UUID tenantId) {
        if (tenantId == null) {
            logger.error("Attempted to set null tenant ID");
            throw new TenantOperationException(
                "Tenant ID cannot be null", 
                null, 
                TenantOperationType.CONTEXT_SWITCHING
            );
        }
        logger.debug("Setting tenant context to: {}", tenantId);
        CURRENT_TENANT.set(tenantId);
    }
      /**
     * Get the current tenant ID
     * @return The tenant ID
     * @throws TenantOperationException if tenant ID is not set
     */
    public static UUID getTenantId() {
        UUID tenantId = CURRENT_TENANT.get();
        if (tenantId == null) {
            logger.error("No tenant ID found in current context");
            throw new TenantOperationException(
                "No tenant specified for current operation", 
                null, 
                TenantOperationType.CONTEXT_SWITCHING
            );
        }
        return tenantId;
    }
    
    /**
     * Get the current tenant ID or return null if not set
     * @return The tenant ID or null
     */
    public static UUID getTenantIdOptional() {
        return CURRENT_TENANT.get();
    }
      /**
     * Clear the current tenant ID
     */
    public static void clear() {
        logger.debug("Clearing tenant context");
        CURRENT_TENANT.remove();
    }
    
    /**
     * Check if a tenant context is set
     * @return true if tenant context is set, false otherwise
     */
    public static boolean hasTenantContext() {
        return CURRENT_TENANT.get() != null;
    }
}
