package com.streamflix.video.infrastructure.multitenancy;

import com.streamflix.video.application.port.TenantService;
import com.streamflix.video.application.service.VideoServiceImpl;
import com.streamflix.video.domain.Category;
import com.streamflix.video.domain.CategoryRepository;
import com.streamflix.video.domain.Video;
import com.streamflix.video.domain.VideoRepository;
import com.streamflix.video.domain.model.Tenant;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureTestDatabase
@Transactional
public class MultiTenancyIntegrationTest {

    @Autowired
    private VideoRepository videoRepository;
    
    @Autowired
    private CategoryRepository categoryRepository;
    
    @Autowired
    private JdbcTemplate jdbcTemplate;
    
    @MockBean
    private TenantService tenantService;
    
    private UUID tenant1Id = UUID.randomUUID();
    private UUID tenant2Id = UUID.randomUUID();
    
    @BeforeEach
    void setup() {
        // Clean up test data
        jdbcTemplate.update("DELETE FROM videos");
        jdbcTemplate.update("DELETE FROM categories");
        
        // Set up mock tenant service
        when(tenantService.getTenantById(any())).thenAnswer(invocation -> {
            UUID id = invocation.getArgument(0);
            Tenant tenant = new Tenant(
                id.equals(tenant1Id) ? "Tenant 1" : "Tenant 2",
                id.equals(tenant1Id) ? "tenant1" : "tenant2", 
                Tenant.SubscriptionLevel.STANDARD
            );
            try {
                var field = Tenant.class.getDeclaredField("id");
                field.setAccessible(true);
                field.set(tenant, id);
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
            return java.util.Optional.of(tenant);
        });
    }
    
    @AfterEach
    void cleanup() {
        TenantContextHolder.clear();
    }
    
    @Test
    void testMultiTenancyDataIsolation() {
        // Set tenant 1 context
        TenantContextHolder.setTenantId(tenant1Id);
        
        // Create some categories and videos for tenant 1
        Category tenant1Category = new Category("Action", "Action movies", tenant1Id);
        categoryRepository.save(tenant1Category);
        
        Video tenant1Video1 = new Video("Tenant 1 Video 1", "Description 1", tenant1Id);
        tenant1Video1.setCategory(tenant1Category);
        videoRepository.save(tenant1Video1);
        
        Video tenant1Video2 = new Video("Tenant 1 Video 2", "Description 2", tenant1Id);
        tenant1Video2.setCategory(tenant1Category);
        videoRepository.save(tenant1Video2);
        
        // Switch to tenant 2 context
        TenantContextHolder.setTenantId(tenant2Id);
        
        // Create some categories and videos for tenant 2
        Category tenant2Category = new Category("Comedy", "Comedy movies", tenant2Id);
        categoryRepository.save(tenant2Category);
        
        Video tenant2Video = new Video("Tenant 2 Video", "Description", tenant2Id);
        tenant2Video.setCategory(tenant2Category);
        videoRepository.save(tenant2Video);
        
        // Verify tenant 2 can only see its own data
        List<Video> tenant2Videos = videoRepository.findAll(0, 10);
        assertEquals(1, tenant2Videos.size());
        assertEquals("Tenant 2 Video", tenant2Videos.get(0).getTitle());
        
        // Switch back to tenant 1
        TenantContextHolder.setTenantId(tenant1Id);
        
        // Verify tenant 1 can only see its own data
        List<Video> tenant1Videos = videoRepository.findAll(0, 10);
        assertEquals(2, tenant1Videos.size());
        assertTrue(tenant1Videos.stream().anyMatch(v -> v.getTitle().equals("Tenant 1 Video 1")));
        assertTrue(tenant1Videos.stream().anyMatch(v -> v.getTitle().equals("Tenant 1 Video 2")));
        
        // Verify category isolation
        List<Category> tenant1Categories = categoryRepository.findAll();
        assertEquals(1, tenant1Categories.size());
        assertEquals("Action", tenant1Categories.get(0).getName());
    }
}
