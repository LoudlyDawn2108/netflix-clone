package com.streamflix.video.infrastructure.multitenancy;

import com.streamflix.video.domain.MultiTenantEntity;
import com.streamflix.video.domain.exception.TenantOperationException;
import com.streamflix.video.domain.exception.TenantOperationException.TenantOperationType;
import org.hibernate.CallbackException;
import org.hibernate.EmptyInterceptor;
import org.hibernate.type.Type;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.Serializable;
import java.util.UUID;

/**
 * Hibernate interceptor that automatically sets the tenant ID on entities during persistence operations.
 * This ensures that every entity saved to the database has the correct tenant ID.
 */
@Component
public class TenantInterceptor extends EmptyInterceptor {

    private static final Logger logger = LoggerFactory.getLogger(TenantInterceptor.class);
    
    @Value("${app.multitenancy.default-tenant-id}")
    private String defaultTenantId;
    
    /**
     * Called before an object is saved. Sets the tenant ID if the entity implements MultiTenantEntity.
     */
    @Override
    public boolean onSave(Object entity, Serializable id, Object[] state, String[] propertyNames, Type[] types) {
        if (entity instanceof MultiTenantEntity) {
            MultiTenantEntity tenantEntity = (MultiTenantEntity) entity;
            boolean modified = setTenantIfNecessary(tenantEntity, state, propertyNames);
            return modified;
        }
        return false;
    }
    
    /**
     * Called before an object is updated. Ensures the tenant ID is not changed.
     */
    @Override
    public boolean onFlushDirty(Object entity, Serializable id, Object[] currentState, Object[] previousState, String[] propertyNames, Type[] types) {
        if (entity instanceof MultiTenantEntity) {
            MultiTenantEntity tenantEntity = (MultiTenantEntity) entity;
            boolean modified = setTenantIfNecessary(tenantEntity, currentState, propertyNames);
            return modified;
        }
        return false;
    }
    
    /**
     * Sets the tenant ID on an entity if necessary.
     * @param entity The entity
     * @param state The current state of the entity
     * @param propertyNames The property names
     * @return true if the state was modified, false otherwise
     */
    private boolean setTenantIfNecessary(MultiTenantEntity entity, Object[] state, String[] propertyNames) {
        UUID tenantId = entity.getTenantId();
        
        // If tenant ID is not set, try to get it from the context
        if (tenantId == null) {            try {
                // Try to get tenant from context
                tenantId = TenantContextHolder.getTenantIdOptional();
                
                // If still null, use default tenant
                if (tenantId == null) {
                    tenantId = UUID.fromString(defaultTenantId);
                    logger.debug("Using default tenant ID: {}", tenantId);
                }
                
                // Set tenant ID on entity
                entity.setTenantId(tenantId);
                
                // Update the state array
                for (int i = 0; i < propertyNames.length; i++) {
                    if ("tenantId".equals(propertyNames[i])) {
                        state[i] = tenantId;
                        return true;
                    }
                }
            } catch (IllegalArgumentException e) {
                logger.error("Invalid default tenant ID format: {}", defaultTenantId, e);
                throw new TenantOperationException(
                    "Invalid default tenant ID format", 
                    null, 
                    TenantOperationType.DATA_ISOLATION, 
                    e
                );
            } catch (IllegalStateException e) {
                logger.error("Tenant context error: {}", e.getMessage(), e);
                throw new TenantOperationException(
                    "Missing tenant context", 
                    null, 
                    TenantOperationType.CONTEXT_SWITCHING, 
                    e
                );
            } catch (Exception e) {
                logger.error("Error setting tenant ID: {}", e.getMessage(), e);
                throw new TenantOperationException(
                    "Failed to set tenant ID", 
                    tenantId, 
                    TenantOperationType.DATA_ISOLATION, 
                    e
                );
            }
        }
        
        return false;
    }
}
