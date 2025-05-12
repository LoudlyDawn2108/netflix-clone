package com.streamflix.video.infrastructure.partitioning;

import com.streamflix.video.domain.Video;
import com.streamflix.video.domain.VideoRepository;
import com.streamflix.video.domain.model.Tenant;
import com.streamflix.video.domain.model.TenantSubscriptionLevel;
import com.streamflix.video.infrastructure.multitenancy.TenantContextHolder;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.transaction.annotation.Transactional;

import javax.sql.DataSource;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Sql(scripts = {"/db/testdata/create_partitions.sql"})
public class PostgresPartitioningIntegrationTest {

    @Autowired
    private VideoRepository videoRepository;
    
    @Autowired
    private DataSource dataSource;
    
    @Autowired
    private PostgresPartitionManager partitionManager;
    
    @Autowired
    private TenantPartitionRoutingService routingService;
    
    private JdbcTemplate jdbcTemplate;
    private UUID tenant1Id;
    private UUID tenant2Id;
    
    @BeforeEach
    void setup() {
        jdbcTemplate = new JdbcTemplate(dataSource);
        tenant1Id = UUID.randomUUID();
        tenant2Id = UUID.randomUUID();
        
        // Create test tenants
        createTestTenant(tenant1Id, "test-tenant-1", TenantSubscriptionLevel.STANDARD);
        createTestTenant(tenant2Id, "test-tenant-2", TenantSubscriptionLevel.PREMIUM);
        
        // Create partitions for test tenants
        partitionManager.createPartitionForTenant(tenant1Id);
        partitionManager.createPartitionForTenant(tenant2Id);
    }
    
    @AfterEach
    void cleanup() {
        TenantContextHolder.clear();
        
        // Clean up test data
        jdbcTemplate.update("DELETE FROM videos WHERE tenant_id IN (?, ?)", tenant1Id.toString(), tenant2Id.toString());
        
        // Drop test partitions
        try {
            jdbcTemplate.update("DROP TABLE IF EXISTS videos_tenant_" + tenant1Id.toString().replace("-", "_"));
            jdbcTemplate.update("DROP TABLE IF EXISTS videos_tenant_" + tenant2Id.toString().replace("-", "_"));
        } catch (Exception e) {
            // Ignore cleanup errors
        }
    }
    
    @Test
    @Transactional
    void testDataPartitioning() {
        // Set tenant context for tenant 1
        TenantContextHolder.setTenantId(tenant1Id);
        
        // Create videos for tenant 1
        Video video1 = new Video("Tenant 1 Video 1", "Test video for tenant 1", tenant1Id);
        Video video2 = new Video("Tenant 1 Video 2", "Another test video for tenant 1", tenant1Id);
        videoRepository.save(video1);
        videoRepository.save(video2);
        
        // Set tenant context for tenant 2
        TenantContextHolder.setTenantId(tenant2Id);
        
        // Create videos for tenant 2
        Video video3 = new Video("Tenant 2 Video 1", "Test video for tenant 2", tenant2Id);
        videoRepository.save(video3);
        
        // Verify that data is stored in the correct partitions
        List<Map<String, Object>> tenant1Rows = jdbcTemplate.queryForList(
            "SELECT * FROM videos_tenant_" + tenant1Id.toString().replace("-", "_")
        );
        
        List<Map<String, Object>> tenant2Rows = jdbcTemplate.queryForList(
            "SELECT * FROM videos_tenant_" + tenant2Id.toString().replace("-", "_")
        );
        
        // Verify partition counts
        assertEquals(2, tenant1Rows.size(), "Tenant 1 should have 2 videos in its partition");
        assertEquals(1, tenant2Rows.size(), "Tenant 2 should have 1 video in its partition");
        
        // Verify routing works
        TenantContextHolder.setTenantId(tenant1Id);
        List<Video> tenant1Videos = videoRepository.findAll(0, 10);
        assertEquals(2, tenant1Videos.size(), "Should find 2 videos for tenant 1");
        
        TenantContextHolder.setTenantId(tenant2Id);
        List<Video> tenant2Videos = videoRepository.findAll(0, 10);
        assertEquals(1, tenant2Videos.size(), "Should find 1 video for tenant 2");
    }
    
    @Test
    @Transactional
    void testPartitionManagement() {
        // Test creating a partition
        UUID newTenantId = UUID.randomUUID();
        
        // Create test tenant
        createTestTenant(newTenantId, "new-test-tenant", TenantSubscriptionLevel.BASIC);
        
        // Create partition
        boolean created = partitionManager.createPartitionForTenant(newTenantId);
        assertTrue(created, "Should successfully create partition");
        
        // Verify partition exists
        String partitionTableName = "videos_tenant_" + newTenantId.toString().replace("-", "_");
        List<Map<String, Object>> tables = jdbcTemplate.queryForList(
            "SELECT * FROM pg_tables WHERE tablename = ?",
            partitionTableName.toLowerCase()
        );
        
        assertFalse(tables.isEmpty(), "Partition table should exist");
        
        // Test routing through the new partition
        TenantContextHolder.setTenantId(newTenantId);
        Video video = new Video("New Tenant Video", "Test video for new tenant", newTenantId);
        videoRepository.save(video);
        
        List<Video> videos = videoRepository.findAll(0, 10);
        assertEquals(1, videos.size(), "Should find 1 video in the new partition");
    }
    
    private void createTestTenant(UUID id, String identifier, TenantSubscriptionLevel level) {
        jdbcTemplate.update(
            "INSERT INTO tenants (id, identifier, name, subscription_level, active) VALUES (?, ?, ?, ?, true)",
            id.toString(), identifier, "Test " + identifier, level.name()
        );
    }
}
