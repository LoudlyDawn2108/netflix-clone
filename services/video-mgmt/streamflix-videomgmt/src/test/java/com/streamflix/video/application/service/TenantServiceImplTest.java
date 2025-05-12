package com.streamflix.video.application.service;

import com.streamflix.video.domain.TenantRepository;
import com.streamflix.video.domain.model.Tenant;
import com.streamflix.video.domain.model.Tenant.SubscriptionLevel;
import com.streamflix.video.infrastructure.partitioning.TenantPartitionRoutingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class TenantServiceImplTest {

    @Mock
    private TenantRepository tenantRepository;
    
    @Mock
    private TenantPartitionRoutingService partitionRoutingService;
    
    private TenantServiceImpl tenantService;
    private Tenant testTenant;
    private UUID tenantId;
    
    @BeforeEach
    void setup() {
        tenantService = new TenantServiceImpl(tenantRepository, Optional.of(partitionRoutingService));
        tenantId = UUID.randomUUID();
        testTenant = new Tenant("Test Tenant", "test-tenant", SubscriptionLevel.STANDARD);
        
        // Use reflection to set the ID field
        try {
            var field = testTenant.getClass().getDeclaredField("id");
            field.setAccessible(true);
            field.set(testTenant, tenantId);
        } catch (Exception e) {
            throw new RuntimeException("Failed to set tenant ID", e);
        }
    }
    
    @Test
    void testCreateTenant() {
        // Arrange
        when(tenantRepository.save(any(Tenant.class))).thenAnswer(invocation -> invocation.getArgument(0));
        
        // Act
        Tenant result = tenantService.createTenant("Test Tenant", "test-tenant", SubscriptionLevel.STANDARD);
        
        // Assert
        assertNotNull(result);
        assertEquals("Test Tenant", result.getName());
        assertEquals("test-tenant", result.getIdentifier());
        assertEquals(SubscriptionLevel.STANDARD, result.getSubscriptionLevel());
        verify(tenantRepository).save(any(Tenant.class));
        verify(partitionRoutingService).ensurePartitionExists(any(Tenant.class));
    }
    
    @Test
    void testGetTenantById() {
        // Arrange
        when(tenantRepository.findById(tenantId)).thenReturn(Optional.of(testTenant));
        
        // Act
        Optional<Tenant> result = tenantService.getTenantById(tenantId);
        
        // Assert
        assertTrue(result.isPresent());
        assertEquals(testTenant, result.get());
        verify(tenantRepository).findById(tenantId);
    }
    
    @Test
    void testGetTenantByIdentifier() {
        // Arrange
        when(tenantRepository.findByIdentifier("test-tenant")).thenReturn(Optional.of(testTenant));
        
        // Act
        Optional<Tenant> result = tenantService.getTenantByIdentifier("test-tenant");
        
        // Assert
        assertTrue(result.isPresent());
        assertEquals(testTenant, result.get());
        verify(tenantRepository).findByIdentifier("test-tenant");
    }
    
    @Test
    void testGetAllTenants() {
        // Arrange
        Tenant tenant2 = new Tenant("Another Tenant", "another-tenant", SubscriptionLevel.PREMIUM);
        List<Tenant> tenants = Arrays.asList(testTenant, tenant2);
        when(tenantRepository.findAll()).thenReturn(tenants);
        
        // Act
        List<Tenant> result = tenantService.getAllTenants();
        
        // Assert
        assertNotNull(result);
        assertEquals(2, result.size());
        assertEquals(tenants, result);
        verify(tenantRepository).findAll();
    }
    
    @Test
    void testUpdateSubscriptionLevel() {
        // Arrange
        when(tenantRepository.findById(tenantId)).thenReturn(Optional.of(testTenant));
        when(tenantRepository.save(any(Tenant.class))).thenAnswer(invocation -> invocation.getArgument(0));
        
        // Act
        Tenant result = tenantService.updateSubscriptionLevel(tenantId, SubscriptionLevel.PREMIUM);
        
        // Assert
        assertNotNull(result);
        assertEquals(SubscriptionLevel.PREMIUM, result.getSubscriptionLevel());
        verify(tenantRepository).findById(tenantId);
        verify(tenantRepository).save(any(Tenant.class));
    }
    
    @Test
    void testSetActive() {
        // Arrange
        when(tenantRepository.findById(tenantId)).thenReturn(Optional.of(testTenant));
        when(tenantRepository.save(any(Tenant.class))).thenAnswer(invocation -> invocation.getArgument(0));
        
        // Act
        Tenant result = tenantService.setActive(tenantId, false);
        
        // Assert
        assertNotNull(result);
        assertFalse(result.isActive());
        verify(tenantRepository).findById(tenantId);
        verify(tenantRepository).save(any(Tenant.class));
    }
    
    @Test
    void testUpdateSubscriptionLevelWithNonExistentTenant() {
        // Arrange
        when(tenantRepository.findById(tenantId)).thenReturn(Optional.empty());
        
        // Act & Assert
        assertThrows(IllegalArgumentException.class, 
                () -> tenantService.updateSubscriptionLevel(tenantId, SubscriptionLevel.PREMIUM));
        verify(tenantRepository).findById(tenantId);
        verify(tenantRepository, never()).save(any(Tenant.class));
    }
}
