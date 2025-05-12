package com.streamflix.video.infrastructure.archiving;

import com.streamflix.video.domain.Video;
import com.streamflix.video.domain.VideoRepository;
import com.streamflix.video.infrastructure.multitenancy.TenantContextHolder;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class S3ArchiveManagerTest {

    @Mock
    private VideoRepository videoRepository;
    
    private S3ArchiveManager archiveManager;
    private UUID tenantId;
    private Video testVideo;
    
    @BeforeEach
    void setup() {
        archiveManager = new S3ArchiveManager(videoRepository);
        
        // Configure S3 client properties through reflection
        ReflectionTestUtils.setField(archiveManager, "bucketName", "test-archive-bucket");
        ReflectionTestUtils.setField(archiveManager, "region", "us-east-1");
        ReflectionTestUtils.setField(archiveManager, "endpointOverride", "http://localhost:4566");
        
        // Initialize tenant and video for testing
        tenantId = UUID.randomUUID();
        TenantContextHolder.setTenantId(tenantId);
        
        testVideo = new Video("Test Video", "Test Description", tenantId);
        UUID videoId = UUID.randomUUID();
        try {
            var field = testVideo.getClass().getDeclaredField("id");
            field.setAccessible(true);
            field.set(testVideo, videoId);
            
            // Set storage location
            ReflectionTestUtils.setField(testVideo, "storageLocation", "videos/original/video-" + videoId + ".mp4");
            ReflectionTestUtils.setField(testVideo, "metadataJson", "{\"duration\":120, \"resolution\":\"1080p\"}");
        } catch (Exception e) {
            throw new RuntimeException("Failed to setup test video", e);
        }
    }
    
    @AfterEach
    void cleanup() {
        TenantContextHolder.clear();
    }
    
    @Test
    void testArchiveVideo() {
        // Mock the video repository to simulate video update
        when(videoRepository.save(any(Video.class))).thenAnswer(invocation -> invocation.getArgument(0));
        
        // Act - In a real integration test, this would interact with S3
        // Here we're just testing the behavior of our manager
        archiveManager.archiveVideo(testVideo);
        
        // Assert
        assertTrue(testVideo.isArchived());
        assertNotNull(testVideo.getArchivedAt());
        verify(videoRepository).save(testVideo);
    }
    
    @Test
    void testRestoreVideo() {
        // Setup an archived video
        try {
            ReflectionTestUtils.setField(testVideo, "archived", true);
            ReflectionTestUtils.setField(testVideo, "archivedAt", java.time.LocalDateTime.now().minusDays(30));
            ReflectionTestUtils.setField(testVideo, "archiveStorageLocation", "archive/videos/video-" + testVideo.getId() + ".mp4");
        } catch (Exception e) {
            throw new RuntimeException("Failed to setup archived video", e);
        }
        
        when(videoRepository.save(any(Video.class))).thenAnswer(invocation -> invocation.getArgument(0));
        
        // Act - In a real integration test, this would interact with S3
        archiveManager.restoreVideo(testVideo);
        
        // Assert
        assertFalse(testVideo.isArchived());
        assertNull(testVideo.getArchivedAt());
        assertNull(testVideo.getArchiveStorageLocation());
        verify(videoRepository).save(testVideo);
    }
    
    @Test
    void testGetObjectMetadata() {
        // Setup metadata
        Map<String, String> metadata = new HashMap<>();
        metadata.put("tenant-id", tenantId.toString());
        metadata.put("content-type", "video/mp4");
        metadata.put("original-path", "videos/original/video-123.mp4");
        
        // In an actual integration test, we would upload a file and get its metadata
        // Here we're just testing the behavior of our manager's method
        
        // For now, we'll just verify our mapped metadata would be correct
        Map<String, String> builtMetadata = archiveManager.buildArchiveMetadata(testVideo);
        
        assertNotNull(builtMetadata);
        assertEquals(tenantId.toString(), builtMetadata.get("tenant-id"));
        assertTrue(builtMetadata.containsKey("original-path"));
        assertTrue(builtMetadata.containsKey("archive-date"));
        assertTrue(builtMetadata.containsKey("content-type"));
    }
}
