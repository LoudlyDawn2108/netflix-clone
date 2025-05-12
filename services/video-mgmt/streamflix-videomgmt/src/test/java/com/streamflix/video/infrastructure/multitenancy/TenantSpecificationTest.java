package com.streamflix.video.infrastructure.multitenancy;

import com.streamflix.video.domain.Video;
import jakarta.persistence.criteria.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.jpa.domain.Specification;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class TenantSpecificationTest {

    @Mock
    private Root<Video> root;
    
    @Mock
    private CriteriaQuery<?> query;
    
    @Mock
    private CriteriaBuilder cb;
    
    @Mock
    private Path<Object> tenantIdPath;
    
    @Mock
    private Predicate predicate;
    
    private UUID testTenantId;
    
    @BeforeEach
    void setup() {
        testTenantId = UUID.randomUUID();
        when(root.get("tenantId")).thenReturn(tenantIdPath);
        when(cb.equal(tenantIdPath, testTenantId)).thenReturn(predicate);
    }
    
    @AfterEach
    void cleanup() {
        TenantContextHolder.clear();
    }
    
    @Test
    void testSpecificationCreation() {
        // Arrange
        TenantSpecification<Video> specification = new TenantSpecification<>(testTenantId);
        
        // Act
        Predicate result = specification.toPredicate(root, query, cb);
        
        // Assert
        assertNotNull(result);
        verify(cb).equal(tenantIdPath, testTenantId);
    }
    
    @Test
    void testFromCurrentTenant() {
        // Arrange
        TenantContextHolder.setTenantId(testTenantId);
        
        // Act
        try {
            TenantSpecification<Video> specification = TenantSpecification.fromCurrentTenant();
            Predicate result = specification.toPredicate(root, query, cb);
            
            // Assert
            assertNotNull(result);
            verify(cb).equal(tenantIdPath, testTenantId);
        } finally {
            TenantContextHolder.clear();
        }
    }
    
    @Test
    void testAndWithTenant() {
        // Arrange
        TenantContextHolder.setTenantId(testTenantId);
        Specification<Video> otherSpec = (videoRoot, videoQuery, videoCb) -> 
                videoCb.equal(videoRoot.get("status"), "READY");
        
        // Mock for the additional specification
        when(root.get("status")).thenReturn(mock(Path.class));
        when(cb.equal(any(), eq("READY"))).thenReturn(mock(Predicate.class));
        when(cb.and(any(Predicate.class), any(Predicate.class))).thenReturn(mock(Predicate.class));
        
        // Act
        try {
            Specification<Video> combinedSpec = TenantSpecification.andWithTenant(otherSpec);
            Predicate result = combinedSpec.toPredicate(root, query, cb);
            
            // Assert
            assertNotNull(result);
            verify(cb).and(any(Predicate.class), any(Predicate.class));
        } finally {
            TenantContextHolder.clear();
        }
    }
}
