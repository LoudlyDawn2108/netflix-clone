package com.streamflix.video.domain.exception;

import java.util.UUID;

/**
 * Exception thrown when a tenant operation fails.
 */
public class TenantOperationException extends RuntimeException {

    private final UUID tenantId;
    private final TenantOperationType operationType;

    public TenantOperationException(String message, UUID tenantId, TenantOperationType operationType) {
        super(message);
        this.tenantId = tenantId;
        this.operationType = operationType;
    }

    public TenantOperationException(String message, UUID tenantId, TenantOperationType operationType, Throwable cause) {
        super(message, cause);
        this.tenantId = tenantId;
        this.operationType = operationType;
    }

    public UUID getTenantId() {
        return tenantId;
    }

    public TenantOperationType getOperationType() {
        return operationType;
    }

    /**
     * Type of tenant operation that failed
     */
    public enum TenantOperationType {
        CREATION,
        UPDATE,
        DELETION,
        PARTITION_MANAGEMENT,
        DATA_ISOLATION,
        CONTEXT_SWITCHING
    }
}
