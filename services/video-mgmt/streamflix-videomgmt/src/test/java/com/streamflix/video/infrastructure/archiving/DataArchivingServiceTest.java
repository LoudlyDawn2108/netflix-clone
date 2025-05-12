package com.streamflix.video.infrastructure.archiving;

import com.streamflix.video.domain.VideoRepository;
import com.streamflix.video.domain.Video;
import com.streamflix.video.domain.model.Tenant;
import com.streamflix.video.domain.model.DataRetentionPolicy;
import com.streamflix.video.infrastructure.multitenancy.TenantContextHolder;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class DataArchivingServiceTest {

    @Mock
    private VideoRepository videoRepository;
    
    @Mock
    private S3ArchiveManager s3ArchiveManager;
    
    @Mock
    private JdbcTemplate jdbcTemplate;
    
    private DataArchivingService archivingService;
    private UUID tenantId;
    private DataRetentionPolicy retentionPolicy;
    
    @BeforeEach
    void setup() {
        archivingService = new DataArchivingService(videoRepository, jdbcTemplate, s3ArchiveManager);
        tenantId = UUID.randomUUID();
        
        // Set up retention policy
        retentionPolicy = new DataRetentionPolicy();
        retentionPolicy.setTenantId(tenantId);
        retentionPolicy.setVideoRetentionDays(90);
        retentionPolicy.setDeletedContentRetentionDays(30);
        retentionPolicy.setArchiveAfterDays(60);
        
        // Mock JDBC query for retention policy
        when(jdbcTemplate.queryForObject(
            anyString(), 
            any(RowMapper.class), 
            eq(tenantId.toString())
        )).thenReturn(retentionPolicy);
    }
    
    @AfterEach
    void cleanup() {
        TenantContextHolder.clear();
    }
    
    @Test
    void testArchiveOldVideos() {
        // Arrange
        TenantContextHolder.setTenantId(tenantId);
        
        List<Video> oldVideos = new ArrayList<>();
        Video video1 = mock(Video.class);
        Video video2 = mock(Video.class);
        when(video1.getId()).thenReturn(UUID.randomUUID());
        when(video2.getId()).thenReturn(UUID.randomUUID());
        oldVideos.add(video1);
        oldVideos.add(video2);
        
        when(videoRepository.findVideosOlderThan(any(LocalDateTime.class), eq(tenantId)))
            .thenReturn(oldVideos);
        
        // Act
        int archivedCount = archivingService.archiveOldVideos(tenantId);
        
        // Assert
        assertEquals(2, archivedCount);
        verify(s3ArchiveManager, times(2)).archiveVideo(any(Video.class));
        verify(videoRepository).findVideosOlderThan(any(LocalDateTime.class), eq(tenantId));
        verify(jdbcTemplate).queryForObject(anyString(), any(RowMapper.class), eq(tenantId.toString()));
    }
    
    @Test
    void testArchiveOldVideosWhenNoneExist() {
        // Arrange
        TenantContextHolder.setTenantId(tenantId);
        when(videoRepository.findVideosOlderThan(any(LocalDateTime.class), eq(tenantId)))
            .thenReturn(Collections.emptyList());
        
        // Act
        int archivedCount = archivingService.archiveOldVideos(tenantId);
        
        // Assert
        assertEquals(0, archivedCount);
        verify(s3ArchiveManager, never()).archiveVideo(any(Video.class));
    }
    
    @Test
    void testPurgeDeletedContent() {
        // Arrange
        TenantContextHolder.setTenantId(tenantId);
        
        when(jdbcTemplate.update(
            anyString(), 
            any(LocalDateTime.class),
            eq(tenantId.toString())
        )).thenReturn(3);
        
        // Act
        int purgedCount = archivingService.purgeDeletedContent(tenantId);
        
        // Assert
        assertEquals(3, purgedCount);
        verify(jdbcTemplate).update(anyString(), any(LocalDateTime.class), eq(tenantId.toString()));
    }
    
    @Test
    void testRestoreArchivedVideo() {
        // Arrange
        UUID videoId = UUID.randomUUID();
        Video video = mock(Video.class);
        when(video.getId()).thenReturn(videoId);
        when(video.isArchived()).thenReturn(true);
        when(videoRepository.findById(videoId)).thenReturn(Optional.of(video));
        
        // Act
        archivingService.restoreArchivedVideo(videoId);
        
        // Assert
        verify(s3ArchiveManager).restoreVideo(video);
        verify(video).setArchived(false);
        verify(videoRepository).save(video);
    }
    
    @Test
    void testRestoreArchivedVideoNotFound() {
        // Arrange
        UUID videoId = UUID.randomUUID();
        when(videoRepository.findById(videoId)).thenReturn(Optional.empty());
        
        // Act & Assert
        assertThrows(IllegalArgumentException.class, 
            () -> archivingService.restoreArchivedVideo(videoId));
        verify(s3ArchiveManager, never()).restoreVideo(any());
    }
    
    @Test
    void testRestoreArchivedVideoNotArchived() {
        // Arrange
        UUID videoId = UUID.randomUUID();
        Video video = mock(Video.class);
        when(video.isArchived()).thenReturn(false);
        when(videoRepository.findById(videoId)).thenReturn(Optional.of(video));
        
        // Act & Assert
        assertThrows(IllegalStateException.class, 
            () -> archivingService.restoreArchivedVideo(videoId));
        verify(s3ArchiveManager, never()).restoreVideo(any());
    }
}
