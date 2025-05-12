package com.streamflix.video.infrastructure.multitenancy;

import com.streamflix.video.domain.TenantRepository;
import com.streamflix.video.domain.model.Tenant;
import com.streamflix.video.domain.model.Tenant.SubscriptionLevel;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.io.IOException;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class TenantIdentificationFilterTest {

    @Mock
    private TenantRepository tenantRepository;
    
    @Mock
    private HttpServletRequest request;
    
    @Mock
    private HttpServletResponse response;
    
    @Mock
    private FilterChain filterChain;
    
    private TenantIdentificationFilter filter;
    private Tenant testTenant;
    
    @BeforeEach
    void setup() {
        filter = new TenantIdentificationFilter(tenantRepository);
        testTenant = new Tenant("Test Tenant", "test-tenant", SubscriptionLevel.STANDARD);
        
        // Use reflection to set the ID field
        try {
            var field = testTenant.getClass().getDeclaredField("id");
            field.setAccessible(true);
            field.set(testTenant, UUID.randomUUID());
        } catch (Exception e) {
            throw new RuntimeException("Failed to set tenant ID", e);
        }
    }
    
    @AfterEach
    void cleanup() {
        TenantContextHolder.clear();
    }
    
    @Test
    void testFilterWithValidHeaderTenant() throws ServletException, IOException {
        // Arrange
        when(request.getHeader("X-Tenant-ID")).thenReturn("test-tenant");
        when(tenantRepository.findByIdentifier("test-tenant")).thenReturn(Optional.of(testTenant));
        when(request.getRequestURI()).thenReturn("/api/v1/videos");
        
        // Act
        filter.doFilterInternal(request, response, filterChain);
        
        // Assert
        verify(filterChain).doFilter(request, response);
        // Can't easily verify TenantContextHolder since it's static and we'd need thread isolation
    }
    
    @Test
    void testFilterWithValidQueryParamTenant() throws ServletException, IOException {
        // Arrange
        when(request.getHeader("X-Tenant-ID")).thenReturn(null);
        when(request.getParameter("tenant")).thenReturn("test-tenant");
        when(tenantRepository.findByIdentifier("test-tenant")).thenReturn(Optional.of(testTenant));
        when(request.getRequestURI()).thenReturn("/api/v1/videos");
        
        // Act
        filter.doFilterInternal(request, response, filterChain);
        
        // Assert
        verify(filterChain).doFilter(request, response);
    }
    
    @Test
    void testFilterWithInvalidTenant() throws ServletException, IOException {
        // Arrange
        when(request.getHeader("X-Tenant-ID")).thenReturn("non-existent-tenant");
        when(tenantRepository.findByIdentifier("non-existent-tenant")).thenReturn(Optional.empty());
        when(request.getRequestURI()).thenReturn("/api/v1/videos");
        
        // Act
        filter.doFilterInternal(request, response, filterChain);
        
        // Assert
        verify(response).sendError(eq(HttpStatus.UNAUTHORIZED.value()), anyString());
        verify(filterChain, never()).doFilter(request, response);
    }
    
    @Test
    void testFilterSkipForActuatorEndpoint() throws ServletException, IOException {
        // Arrange
        when(request.getRequestURI()).thenReturn("/actuator/health");
        
        // Act
        filter.doFilterInternal(request, response, filterChain);
        
        // Assert
        verify(filterChain).doFilter(request, response);
        verify(tenantRepository, never()).findByIdentifier(anyString());
    }
}
