package com.streamflix.video.infrastructure.partitioning;

import com.streamflix.video.domain.model.Tenant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class PostgresPartitionManagerTest {

    @Mock
    private JdbcTemplate jdbcTemplate;
    
    private PostgresPartitionManager partitionManager;
    private Tenant testTenant;
    
    @BeforeEach
    void setup() {
        partitionManager = new PostgresPartitionManager(jdbcTemplate);
        
        // Create test tenant
        testTenant = new Tenant("Test Tenant", "test-tenant", Tenant.SubscriptionLevel.STANDARD);
        UUID tenantId = UUID.randomUUID();
        try {
            var field = testTenant.getClass().getDeclaredField("id");
            field.setAccessible(true);
            field.set(testTenant, tenantId);
        } catch (Exception e) {
            throw new RuntimeException("Failed to set tenant ID", e);
        }
    }
    
    @Test
    void testCreatePartitionForTenant() {
        // Arrange
        when(jdbcTemplate.update(anyString(), any())).thenReturn(1);
        
        // Act
        boolean result = partitionManager.createPartitionForTenant(testTenant, "videos");
        
        // Assert
        assertTrue(result);
        verify(jdbcTemplate, atLeastOnce()).update(contains("CREATE TABLE IF NOT EXISTS"), any());
    }
    
    @Test
    void testPartitionExists() {
        // Arrange
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), any()))
            .thenReturn(1);
        
        // Act
        boolean result = partitionManager.partitionExists(testTenant, "videos");
        
        // Assert
        assertTrue(result);
        verify(jdbcTemplate).queryForObject(anyString(), eq(Integer.class), any());
    }
    
    @Test
    void testPartitionDoesNotExist() {
        // Arrange
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), any()))
            .thenReturn(0);
        
        // Act
        boolean result = partitionManager.partitionExists(testTenant, "videos");
        
        // Assert
        assertFalse(result);
        verify(jdbcTemplate).queryForObject(anyString(), eq(Integer.class), any());
    }
    
    @Test
    void testGetTenantPartitionName() {
        // Act
        String partitionName = partitionManager.getTenantPartitionName(testTenant, "videos");
        
        // Assert
        assertTrue(partitionName.contains("videos"));
        assertTrue(partitionName.contains(testTenant.getId().toString().replace("-", "")));
    }
}
