package com.streamflix.video.domain;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for the Video domain entity
 */
class VideoTest {

    @Test
    @DisplayName("Should create video with required fields")
    void shouldCreateVideoWithRequiredFields() {
        // Arrange & Act
        Video video = new Video("Test Title", "Test Description");
        
        // Assert
        assertEquals("Test Title", video.getTitle());
        assertEquals("Test Description", video.getDescription());
        assertEquals(VideoStatus.PENDING, video.getStatus());
        assertNotNull(video.getCreatedAt());
        assertNotNull(video.getUpdatedAt());
        assertTrue(video.getTags().isEmpty());
    }
    
    @Nested
    @DisplayName("Tag management tests")
    class TagTests {
        
        @Test
        @DisplayName("Should add tag to video")
        void shouldAddTag() {
            // Arrange
            Video video = new Video("Test Video", "Test Description");
            
            // Act
            video.addTag("action");
            
            // Assert
            assertTrue(video.getTags().contains("action"));
            assertEquals(1, video.getTags().size());
        }
        
        @Test
        @DisplayName("Should remove tag from video")
        void shouldRemoveTag() {
            // Arrange
            Video video = new Video("Test Video", "Test Description");
            video.addTag("action");
            
            // Act
            video.removeTag("action");
            
            // Assert
            assertFalse(video.getTags().contains("action"));
            assertEquals(0, video.getTags().size());
        }
        
        @Test
        @DisplayName("Should set multiple tags at once")
        void shouldSetMultipleTags() {
            // Arrange
            Video video = new Video("Test Video", "Test Description");
            Set<String> tags = new HashSet<>();
            tags.add("action");
            tags.add("drama");
            
            // Act
            video.setTags(tags);
            
            // Assert
            assertEquals(2, video.getTags().size());
            assertTrue(video.getTags().contains("action"));
            assertTrue(video.getTags().contains("drama"));
        }
        
        @Test
        @DisplayName("Should not modify original tag collection")
        void shouldReturnUnmodifiableTags() {
            // Arrange
            Video video = new Video("Test Video", "Test Description");
            video.addTag("action");
            
            // Act & Assert
            Set<String> tags = video.getTags();
            assertThrows(UnsupportedOperationException.class, () -> tags.add("drama"));
        }
    }
    
    @Nested
    @DisplayName("Status transition tests")
    class StatusTransitionTests {
        
        @Test
        @DisplayName("Should transition from PENDING to UPLOADED")
        void shouldTransitionFromPendingToUploaded() {
            // Arrange
            Video video = new Video("Test Video", "Test Description");
            assertEquals(VideoStatus.PENDING, video.getStatus());
            
            // Act
            video.markAsUploaded();
            
            // Assert
            assertEquals(VideoStatus.UPLOADED, video.getStatus());
        }
        
        @Test
        @DisplayName("Should transition from UPLOADED to PROCESSING")
        void shouldTransitionFromUploadedToProcessing() {
            // Arrange
            Video video = new Video("Test Video", "Test Description");
            video.markAsUploaded();
            assertEquals(VideoStatus.UPLOADED, video.getStatus());
            
            // Act
            video.markAsProcessing();
            
            // Assert
            assertEquals(VideoStatus.PROCESSING, video.getStatus());
        }
        
        @Test
        @DisplayName("Should transition from PROCESSING to READY")
        void shouldTransitionFromProcessingToReady() {
            // Arrange
            Video video = new Video("Test Video", "Test Description");
            video.markAsUploaded();
            video.markAsProcessing();
            assertEquals(VideoStatus.PROCESSING, video.getStatus());
            
            // Act
            video.markAsReady();
            
            // Assert
            assertEquals(VideoStatus.READY, video.getStatus());
        }
        
        @Test
        @DisplayName("Should transition from PROCESSING to FAILED")
        void shouldTransitionFromProcessingToFailed() {
            // Arrange
            Video video = new Video("Test Video", "Test Description");
            video.markAsUploaded();
            video.markAsProcessing();
            assertEquals(VideoStatus.PROCESSING, video.getStatus());
            
            // Act
            video.markAsFailed();
            
            // Assert
            assertEquals(VideoStatus.FAILED, video.getStatus());
        }
        
        @Test
        @DisplayName("Should transition from UPLOADED to FAILED")
        void shouldTransitionFromUploadedToFailed() {
            // Arrange
            Video video = new Video("Test Video", "Test Description");
            video.markAsUploaded();
            assertEquals(VideoStatus.UPLOADED, video.getStatus());
            
            // Act
            video.markAsFailed();
            
            // Assert
            assertEquals(VideoStatus.FAILED, video.getStatus());
        }
        
        @Test
        @DisplayName("Should throw when transitioning from PENDING to PROCESSING")
        void shouldThrowWhenTransitioningFromPendingToProcessing() {
            // Arrange
            Video video = new Video("Test Video", "Test Description");
            assertEquals(VideoStatus.PENDING, video.getStatus());
            
            // Act & Assert
            assertThrows(IllegalStateException.class, video::markAsProcessing);
        }
        
        @Test
        @DisplayName("Should throw when transitioning from PENDING to READY")
        void shouldThrowWhenTransitioningFromPendingToReady() {
            // Arrange
            Video video = new Video("Test Video", "Test Description");
            assertEquals(VideoStatus.PENDING, video.getStatus());
            
            // Act & Assert
            assertThrows(IllegalStateException.class, video::markAsReady);
        }
    }
    
    @Test
    @DisplayName("Should update timestamp when properties change")
    void shouldUpdateTimestampOnPropertyChange() {
        // Arrange
        Video video = new Video("Test Video", "Test Description");
        LocalDateTime originalUpdatedAt = video.getUpdatedAt();
        
        // Add delay to ensure timestamp is different
        try {
            Thread.sleep(10);
        } catch (InterruptedException e) {
            // Ignore
        }
        
        // Act
        video.setTitle("Updated Title");
        
        // Assert
        assertNotEquals(originalUpdatedAt, video.getUpdatedAt());
    }
    
    @Test
    @DisplayName("Should handle category assignment")
    void shouldHandleCategoryAssignment() {
        // Arrange
        Video video = new Video("Test Video", "Test Description");
        Category category = new Category();
        
        // Act
        video.setCategory(category);
        
        // Assert
        assertEquals(category, video.getCategory());
    }
    
    @Test
    @DisplayName("Should handle thumbnail management")
    void shouldHandleThumbnailManagement() {
        // Arrange
        Video video = new Video("Test Video", "Test Description");
        Thumbnail thumbnail = new Thumbnail();
        
        // Act
        video.addThumbnail(thumbnail);
        
        // Assert
        assertEquals(1, video.getThumbnails().size());
        assertEquals(video, thumbnail.getVideo());
        
        // Act - remove thumbnail
        video.removeThumbnail(thumbnail);
        
        // Assert
        assertEquals(0, video.getThumbnails().size());
        assertNull(thumbnail.getVideo());
    }
}