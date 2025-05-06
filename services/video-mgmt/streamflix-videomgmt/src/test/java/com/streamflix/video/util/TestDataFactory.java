package com.streamflix.video.util;

import com.streamflix.video.domain.Category;
import com.streamflix.video.domain.Thumbnail;
import com.streamflix.video.domain.Video;
import com.streamflix.video.domain.VideoStatus;
import com.streamflix.video.presentation.dto.VideoFilterParams;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Factory class to create test data objects for unit tests
 */
public class TestDataFactory {

    /**
     * Create a test video with default values
     */
    public static Video createTestVideo() {
        Video video = new Video("Test Video", "Test Description");
        return video;
    }

    /**
     * Create a test video with custom values
     */
    public static Video createTestVideo(String title, String description, VideoStatus status, 
                                       UUID id, Category category, Set<String> tags) {
        Video video = new Video(title, description);
        
        // Use reflection to set ID for testing
        try {
            var idField = Video.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(video, id);
        } catch (Exception e) {
            throw new RuntimeException("Failed to set test ID", e);
        }
        
        if (status != null) {
            // Set the appropriate status through state transitions
            try {
                switch(status) {
                    case UPLOADED -> video.markAsUploaded();
                    case PROCESSING -> {
                        video.markAsUploaded();
                        video.markAsProcessing();
                    }
                    case READY -> {
                        video.markAsUploaded();
                        video.markAsProcessing();
                        video.markAsReady();
                    }
                    case FAILED -> {
                        video.markAsUploaded();
                        video.markAsFailed();
                    }
                    case DELETED -> video.markAsDeleted();
                    // PENDING is the default state
                }
            } catch (IllegalStateException e) {
                // For testing purposes, we'll force the status if the state machine doesn't allow it
                try {
                    var statusField = Video.class.getDeclaredField("status");
                    statusField.setAccessible(true);
                    statusField.set(video, status);
                } catch (Exception ex) {
                    throw new RuntimeException("Failed to set test status", ex);
                }
            }
        }
        
        if (category != null) {
            video.setCategory(category);
        }
        
        if (tags != null && !tags.isEmpty()) {
            video.setTags(tags);
        }
        
        return video;
    }

    /**
     * Create a test category
     */
    public static Category createTestCategory() {
        return createTestCategory("Test Category", UUID.randomUUID());
    }

    /**
     * Create a test category with custom values
     */
    public static Category createTestCategory(String name, UUID id) {
        Category category = new Category();
        
        try {
            var nameField = Category.class.getDeclaredField("name");
            nameField.setAccessible(true);
            nameField.set(category, name);
            
            var idField = Category.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(category, id);
        } catch (Exception e) {
            throw new RuntimeException("Failed to set test category fields", e);
        }
        
        return category;
    }

    /**
     * Create a test thumbnail
     */
    public static Thumbnail createTestThumbnail(Video video) {
        Thumbnail thumbnail = new Thumbnail();
        
        try {
            var idField = Thumbnail.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(thumbnail, UUID.randomUUID());
            
            var filePathField = Thumbnail.class.getDeclaredField("filePath");
            filePathField.setAccessible(true);
            filePathField.set(thumbnail, "test/path/thumbnail.jpg");
            
            var widthField = Thumbnail.class.getDeclaredField("width");
            widthField.setAccessible(true);
            widthField.set(thumbnail, 1280);
            
            var heightField = Thumbnail.class.getDeclaredField("height");
            heightField.setAccessible(true);
            heightField.set(thumbnail, 720);
            
            var typeField = Thumbnail.class.getDeclaredField("type");
            typeField.setAccessible(true);
            typeField.set(thumbnail, "DEFAULT");
            
            if (video != null) {
                thumbnail.setVideo(video);
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to set test thumbnail fields", e);
        }
        
        return thumbnail;
    }

    /**
     * Create a video filter params object for testing
     */
    public static VideoFilterParams createTestFilterParams() {
        VideoFilterParams params = new VideoFilterParams();
        params.setTitle("Test");
        params.setCategoryId(UUID.randomUUID());
        params.setYear(2023);
        params.setLanguage("en");
        params.setTags(List.of("action", "drama"));
        params.setStatus(VideoStatus.READY);
        params.setSortBy("title");
        params.setSortDirection("asc");
        return params;
    }
}