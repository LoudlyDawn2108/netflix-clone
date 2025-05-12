package com.streamflix.video.infrastructure.multitenancy;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

public class TenantContextHolderTest {

    @AfterEach
    void cleanup() {
        // Clean up after each test to avoid affecting other tests
        TenantContextHolder.clear();
    }

    @Test
    void testSetAndGetTenantId() {
        // Arrange
        UUID tenantId = UUID.randomUUID();
        
        // Act
        TenantContextHolder.setTenantId(tenantId);
        UUID retrievedTenantId = TenantContextHolder.getTenantId();
        
        // Assert
        assertEquals(tenantId, retrievedTenantId, "Retrieved tenant ID should match the set tenant ID");
    }    @Test
    void testGetTenantIdWhenNotSet() {
        // Act & Assert
        assertThrows(RuntimeException.class, TenantContextHolder::getTenantId,
                "Getting tenant ID when not set should throw a TenantOperationException");
    }

    @Test
    void testGetTenantIdOptionalWhenNotSet() {
        // Act
        UUID retrievedTenantId = TenantContextHolder.getTenantIdOptional();
        
        // Assert
        assertNull(retrievedTenantId, "Optional tenant ID should be null when not set");
    }

    @Test
    void testClearTenantId() {
        // Arrange
        UUID tenantId = UUID.randomUUID();
        TenantContextHolder.setTenantId(tenantId);
        
        // Act
        TenantContextHolder.clear();
        
        // Assert
        assertNull(TenantContextHolder.getTenantIdOptional(), "Tenant ID should be null after clearing");
        assertThrows(IllegalStateException.class, TenantContextHolder::getTenantId,
                "Getting tenant ID after clearing should throw IllegalStateException");
    }

    @Test
    void testHasTenantContext() {
        // Initially no tenant context should be set
        assertFalse(TenantContextHolder.hasTenantContext(), "Should not have tenant context initially");
        
        // Set tenant context
        UUID tenantId = UUID.randomUUID();
        TenantContextHolder.setTenantId(tenantId);
        
        // Should have tenant context now
        assertTrue(TenantContextHolder.hasTenantContext(), "Should have tenant context after setting it");
        
        // Clear and check again
        TenantContextHolder.clear();
        assertFalse(TenantContextHolder.hasTenantContext(), "Should not have tenant context after clearing");
    }
    
    @Test
    void testSetNullTenantId() {
        // Act & Assert
        assertThrows(RuntimeException.class, () -> TenantContextHolder.setTenantId(null),
                "Setting null tenant ID should throw a TenantOperationException");
    }
}
