package com.streamflix.video.application.service;

import com.streamflix.video.application.VideoEventPublisher;
import com.streamflix.video.domain.*;
import com.streamflix.video.domain.exception.CategoryNotFoundException;
import com.streamflix.video.domain.exception.ValidationException;
import com.streamflix.video.domain.exception.VideoNotFoundException;
import com.streamflix.video.infrastructure.metrics.VideoServiceMetrics;
import com.streamflix.video.presentation.dto.VideoFilterParams;
import com.streamflix.video.util.TestDataFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class VideoServiceImplTest {

    @Mock
    private VideoRepository videoRepository;

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private VideoEventPublisher eventPublisher;

    @Mock
    private VideoServiceMetrics metrics;

    @InjectMocks
    private VideoServiceImpl videoService;

    private UUID validVideoId;
    private UUID validCategoryId;
    private Video testVideo;
    private Category testCategory;

    @BeforeEach
    void setUp() {
        validVideoId = UUID.randomUUID();
        validCategoryId = UUID.randomUUID();
        testCategory = TestDataFactory.createTestCategory("Action", validCategoryId);
        testVideo = TestDataFactory.createTestVideo("Test Video", "Test Description", null, validVideoId, testCategory, Set.of("action"));
    }

    @Nested
    @DisplayName("Create video tests")
    class CreateVideoTests {

        @Test
        @DisplayName("Should create video with valid data")
        void shouldCreateVideoWithValidData() {
            // Arrange
            String title = "Test Video";
            String description = "Test Description";
            Set<String> tags = Set.of("action", "thriller");
            
            when(categoryRepository.findById(validCategoryId)).thenReturn(Optional.of(testCategory));
            when(videoRepository.save(any(Video.class))).thenAnswer(invocation -> invocation.getArgument(0));
            
            // Act
            Video result = videoService.createVideo(title, description, validCategoryId, tags);
            
            // Assert
            assertNotNull(result);
            assertEquals(title, result.getTitle());
            assertEquals(description, result.getDescription());
            assertEquals(testCategory, result.getCategory());
            assertEquals(tags.size(), result.getTags().size());
            assertTrue(result.getTags().containsAll(tags));
            assertEquals(VideoStatus.PENDING, result.getStatus());
            
            verify(videoRepository).save(any(Video.class));
            verify(eventPublisher).publishVideoCreated(any(Video.class));
        }

        @Test
        @DisplayName("Should create video without optional fields")
        void shouldCreateVideoWithoutOptionalFields() {
            // Arrange
            String title = "Test Video";
            String description = "Test Description";
            
            when(videoRepository.save(any(Video.class))).thenAnswer(invocation -> invocation.getArgument(0));
            
            // Act
            Video result = videoService.createVideo(title, description, null, null);
            
            // Assert
            assertNotNull(result);
            assertEquals(title, result.getTitle());
            assertEquals(description, result.getDescription());
            assertNull(result.getCategory());
            assertTrue(result.getTags().isEmpty());
            
            verify(videoRepository).save(any(Video.class));
            verify(eventPublisher).publishVideoCreated(any(Video.class));
        }

        @Test
        @DisplayName("Should throw validation exception when title is empty")
        void shouldThrowValidationExceptionWhenTitleIsEmpty() {
            // Act & Assert
            assertThrows(ValidationException.class, () -> videoService.createVideo("", "Description", null, null));
            assertThrows(ValidationException.class, () -> videoService.createVideo(null, "Description", null, null));
            
            verify(videoRepository, never()).save(any(Video.class));
            verify(eventPublisher, never()).publishVideoCreated(any(Video.class));
        }

        @Test
        @DisplayName("Should throw exception when category not found")
        void shouldThrowExceptionWhenCategoryNotFound() {
            // Arrange
            UUID nonExistentCategoryId = UUID.randomUUID();
            when(categoryRepository.findById(nonExistentCategoryId)).thenReturn(Optional.empty());
            
            // Act & Assert
            assertThrows(CategoryNotFoundException.class, 
                () -> videoService.createVideo("Test", "Description", nonExistentCategoryId, null));
            
            verify(videoRepository, never()).save(any(Video.class));
            verify(eventPublisher, never()).publishVideoCreated(any(Video.class));
        }
    }

    @Nested
    @DisplayName("Get video tests")
    class GetVideoTests {        @Test
        @DisplayName("Should get video by valid ID")
        void shouldGetVideoByValidId() {
            // Arrange
            when(videoRepository.findById(validVideoId)).thenReturn(Optional.of(testVideo));
            
            doAnswer(invocation -> {
                java.util.function.Supplier<?> supplier = invocation.getArgument(0);
                return supplier.get();
            }).when(metrics).recordExecution(any(java.util.function.Supplier.class));
            
            // Act
            Optional<Video> result = videoService.getVideo(validVideoId);
            
            // Assert
            assertTrue(result.isPresent());
            assertEquals(testVideo, result.get());
        }        @Test
        @DisplayName("Should return empty when video not found")
        void shouldReturnEmptyWhenVideoNotFound() {
            // Arrange
            UUID nonExistentId = UUID.randomUUID();
            when(videoRepository.findById(nonExistentId)).thenReturn(Optional.empty());
            
            doAnswer(invocation -> {
                java.util.function.Supplier<?> supplier = invocation.getArgument(0);
                return supplier.get();
            }).when(metrics).recordExecution(any(java.util.function.Supplier.class));
            
            // Act
            Optional<Video> result = videoService.getVideo(nonExistentId);
            
            // Assert
            assertTrue(result.isEmpty());
        }
    }

    @Nested
    @DisplayName("Update video tests")
    class UpdateVideoTests {

        @Test
        @DisplayName("Should update video with valid data")
        void shouldUpdateVideoWithValidData() {
            // Arrange
            String newTitle = "Updated Title";
            String newDescription = "Updated Description";
            Integer releaseYear = 2023;
            String language = "en";
            
            when(videoRepository.findById(validVideoId)).thenReturn(Optional.of(testVideo));
            when(categoryRepository.findById(validCategoryId)).thenReturn(Optional.of(testCategory));
            when(videoRepository.save(any(Video.class))).thenAnswer(invocation -> invocation.getArgument(0));
            
            // Act
            Optional<Video> result = videoService.updateVideo(
                validVideoId, newTitle, newDescription, validCategoryId, releaseYear, language
            );
            
            // Assert
            assertTrue(result.isPresent());
            assertEquals(newTitle, result.get().getTitle());
            assertEquals(newDescription, result.get().getDescription());
            assertEquals(testCategory, result.get().getCategory());
            assertEquals(releaseYear, result.get().getReleaseYear());
            assertEquals(language, result.get().getLanguage());
            
            verify(videoRepository).save(any(Video.class));
            verify(eventPublisher).publishVideoUpdated(any(Video.class));
        }

        @Test
        @DisplayName("Should update only provided fields")
        void shouldUpdateOnlyProvidedFields() {
            // Arrange
            String originalTitle = testVideo.getTitle();
            String originalDescription = testVideo.getDescription();
            String newDescription = "Updated Description";
            
            when(videoRepository.findById(validVideoId)).thenReturn(Optional.of(testVideo));
            when(videoRepository.save(any(Video.class))).thenAnswer(invocation -> invocation.getArgument(0));
            
            // Act
            Optional<Video> result = videoService.updateVideo(
                validVideoId, null, newDescription, null, null, null
            );
            
            // Assert
            assertTrue(result.isPresent());
            assertEquals(originalTitle, result.get().getTitle()); // title unchanged
            assertEquals(newDescription, result.get().getDescription());
            
            verify(videoRepository).save(any(Video.class));
            verify(eventPublisher).publishVideoUpdated(any(Video.class));
        }

        @Test
        @DisplayName("Should throw exception when release year is invalid")
        void shouldThrowExceptionWhenReleaseYearIsInvalid() {
            // Arrange
            when(videoRepository.findById(validVideoId)).thenReturn(Optional.of(testVideo));
            
            // Act & Assert
            assertThrows(ValidationException.class, () -> 
                videoService.updateVideo(validVideoId, null, null, null, 1800, null));
                
            assertThrows(ValidationException.class, () -> 
                videoService.updateVideo(validVideoId, null, null, null, 2200, null));
            
            verify(videoRepository, never()).save(any(Video.class));
            verify(eventPublisher, never()).publishVideoUpdated(any(Video.class));
        }

        @Test
        @DisplayName("Should throw exception when video not found")
        void shouldThrowExceptionWhenVideoNotFound() {
            // Arrange
            UUID nonExistentId = UUID.randomUUID();
            when(videoRepository.findById(nonExistentId)).thenReturn(Optional.empty());
            
            // Act & Assert
            assertThrows(VideoNotFoundException.class, () -> 
                videoService.updateVideo(nonExistentId, "Title", null, null, null, null));
            
            verify(videoRepository, never()).save(any(Video.class));
            verify(eventPublisher, never()).publishVideoUpdated(any(Video.class));
        }
    }

    @Nested
    @DisplayName("Update video tags tests")
    class UpdateVideoTagsTests {

        @Test
        @DisplayName("Should update video tags")
        void shouldUpdateVideoTags() {
            // Arrange
            Set<String> newTags = Set.of("comedy", "romance");
            when(videoRepository.findById(validVideoId)).thenReturn(Optional.of(testVideo));
            when(videoRepository.save(any(Video.class))).thenAnswer(invocation -> invocation.getArgument(0));
            
            // Act
            Optional<Video> result = videoService.updateVideoTags(validVideoId, newTags);
            
            // Assert
            assertTrue(result.isPresent());
            assertEquals(newTags.size(), result.get().getTags().size());
            assertTrue(result.get().getTags().containsAll(newTags));
            
            verify(videoRepository).save(any(Video.class));
            verify(eventPublisher).publishVideoUpdated(any(Video.class));
        }

        @Test
        @DisplayName("Should clear tags when null is provided")
        void shouldClearTagsWhenNullIsProvided() {
            // Arrange
            when(videoRepository.findById(validVideoId)).thenReturn(Optional.of(testVideo));
            when(videoRepository.save(any(Video.class))).thenAnswer(invocation -> invocation.getArgument(0));
            
            // Act
            Optional<Video> result = videoService.updateVideoTags(validVideoId, null);
            
            // Assert
            assertTrue(result.isPresent());
            assertTrue(result.get().getTags().isEmpty());
            
            verify(videoRepository).save(any(Video.class));
            verify(eventPublisher).publishVideoUpdated(any(Video.class));
        }
    }

    @Nested
    @DisplayName("Delete video tests")
    class DeleteVideoTests {

        @Test
        @DisplayName("Should mark video as deleted")
        void shouldMarkVideoAsDeleted() {
            // Arrange
            when(videoRepository.findById(validVideoId)).thenReturn(Optional.of(testVideo));
            when(videoRepository.save(any(Video.class))).thenAnswer(invocation -> {
                Video video = invocation.getArgument(0);
                assertEquals(VideoStatus.DELETED, video.getStatus());
                return video;
            });
            
            // Act
            boolean result = videoService.deleteVideo(validVideoId);
            
            // Assert
            assertTrue(result);
            verify(videoRepository).save(any(Video.class));
            verify(eventPublisher).publishVideoDeleted(any(Video.class));
        }

        @Test
        @DisplayName("Should throw when video not found for deletion")
        void shouldThrowWhenVideoNotFoundForDeletion() {
            // Arrange
            UUID nonExistentId = UUID.randomUUID();
            when(videoRepository.findById(nonExistentId)).thenReturn(Optional.empty());
            
            // Act & Assert
            assertThrows(VideoNotFoundException.class, () -> videoService.deleteVideo(nonExistentId));
            
            verify(videoRepository, never()).save(any(Video.class));
            verify(eventPublisher, never()).publishVideoDeleted(any(Video.class));
        }
    }

    @Nested
    @DisplayName("Update video status tests")
    class UpdateVideoStatusTests {

        @Test
        @DisplayName("Should update video status")
        void shouldUpdateVideoStatus() {
            // Arrange - Create a video in PENDING status
            Video pendingVideo = TestDataFactory.createTestVideo(
                "Test Video", "Test Description", VideoStatus.PENDING, 
                validVideoId, testCategory, Set.of("action")
            );
            
            when(videoRepository.findById(validVideoId)).thenReturn(Optional.of(pendingVideo));
            when(videoRepository.save(any(Video.class))).thenAnswer(invocation -> invocation.getArgument(0));
            
            // Act
            Optional<Video> result = videoService.updateVideoStatus(validVideoId, VideoStatus.UPLOADED);
            
            // Assert
            assertTrue(result.isPresent());
            assertEquals(VideoStatus.UPLOADED, result.get().getStatus());
            
            verify(videoRepository).save(any(Video.class));
            verify(eventPublisher).publishVideoStatusChanged(any(Video.class));
        }

        @Test
        @DisplayName("Should throw when invalid status transition")
        void shouldThrowWhenInvalidStatusTransition() {
            // Arrange - Create a video in PENDING status
            Video pendingVideo = TestDataFactory.createTestVideo(
                "Test Video", "Test Description", VideoStatus.PENDING, 
                validVideoId, testCategory, Set.of("action")
            );
            
            when(videoRepository.findById(validVideoId)).thenReturn(Optional.of(pendingVideo));
            
            // Act & Assert - Cannot go from PENDING to READY
            assertThrows(IllegalStateException.class, 
                () -> videoService.updateVideoStatus(validVideoId, VideoStatus.READY));
            
            verify(videoRepository, never()).save(any(Video.class));
        }
    }

    @Nested
    @DisplayName("Filter and search tests")
    class FilterAndSearchTests {

        @Test
        @DisplayName("Should find videos by category")
        void shouldFindVideosByCategory() {
            // Arrange
            List<Video> expectedVideos = List.of(testVideo);
            when(categoryRepository.existsById(validCategoryId)).thenReturn(true);
            when(videoRepository.findByCategory(validCategoryId, 0, 10)).thenReturn(expectedVideos);
            
            // Act
            List<Video> result = videoService.findVideosByCategory(validCategoryId, 0, 10);
            
            // Assert
            assertEquals(expectedVideos.size(), result.size());
            assertEquals(expectedVideos.get(0), result.get(0));
        }

        @Test
        @DisplayName("Should throw when category not found for video search")
        void shouldThrowWhenCategoryNotFoundForVideoSearch() {
            // Arrange
            UUID nonExistentCategoryId = UUID.randomUUID();
            when(categoryRepository.existsById(nonExistentCategoryId)).thenReturn(false);
            
            // Act & Assert
            assertThrows(CategoryNotFoundException.class, 
                () -> videoService.findVideosByCategory(nonExistentCategoryId, 0, 10));
        }

        @Test
        @DisplayName("Should find videos by tag")
        void shouldFindVideosByTag() {
            // Arrange
            List<Video> expectedVideos = List.of(testVideo);
            when(videoRepository.findByTag("action", 0, 10)).thenReturn(expectedVideos);
            
            // Act
            List<Video> result = videoService.findVideosByTag("action", 0, 10);
            
            // Assert
            assertEquals(expectedVideos.size(), result.size());
            assertEquals(expectedVideos.get(0), result.get(0));
        }
        
        @Test
        @DisplayName("Should list all videos")
        void shouldListAllVideos() {
            // Arrange
            List<Video> expectedVideos = List.of(testVideo);
            when(videoRepository.findAll(0, 10)).thenReturn(expectedVideos);
            
            // Act
            List<Video> result = videoService.listVideos(0, 10);
            
            // Assert
            assertEquals(expectedVideos.size(), result.size());
            assertEquals(expectedVideos.get(0), result.get(0));
        }

        @Test
        @DisplayName("Should find by filter params")
        void shouldFindByFilterParams() {
            // Arrange
            VideoFilterParams params = TestDataFactory.createTestFilterParams();
            List<Video> videos = List.of(testVideo);
            Page<Video> expectedPage = new PageImpl<>(videos);
            
            when(categoryRepository.existsById(any(UUID.class))).thenReturn(true);
            when(videoRepository.findByFilterParams(params, 0, 10)).thenReturn(expectedPage);
            
            // Act
            Page<Video> result = videoService.findByFilterParams(params, 0, 10);
            
            // Assert
            assertEquals(expectedPage.getTotalElements(), result.getTotalElements());
            assertEquals(expectedPage.getContent().get(0), result.getContent().get(0));
        }

        @Test
        @DisplayName("Should throw when filter params have invalid pagination")
        void shouldThrowWhenFilterParamsHaveInvalidPagination() {
            // Arrange
            VideoFilterParams params = TestDataFactory.createTestFilterParams();
            
            // Act & Assert
            assertThrows(ValidationException.class, () -> videoService.findByFilterParams(params, -1, 10));
            assertThrows(ValidationException.class, () -> videoService.findByFilterParams(params, 0, 0));
            assertThrows(ValidationException.class, () -> videoService.findByFilterParams(params, 0, 101));
        }
    }
}