package com.streamflix.video.application.port;

import com.streamflix.video.domain.Video;
import com.streamflix.video.domain.VideoStatus;
import com.streamflix.video.presentation.dto.VideoFilterParams;
import org.springframework.data.domain.Page;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

/**
 * Service interface for video management operations.
 * This is part of the application layer in the hexagonal architecture.
 */
public interface VideoService {

    /**
     * Create a new video with basic metadata
     * @param title The video title
     * @param description The video description
     * @param categoryId The ID of the category (optional)
     * @param tags The set of tags for the video (optional)
     * @return A CompletableFuture containing the created Video.
     */
    CompletableFuture<Video> createVideo(String title, String description, UUID categoryId, Set<String> tags);

    /**
     * Retrieve a video by its ID
     * @param id The video ID
     * @return A CompletableFuture containing an Optional with the Video if found, or an empty Optional otherwise.
     */
    CompletableFuture<Optional<Video>> getVideo(UUID id);

    /**
     * Update the metadata for an existing video
     * @param id The video ID
     * @param title The new title (optional, null to leave unchanged)
     * @param description The new description (optional, null to leave unchanged)
     * @param categoryId The new category ID (optional, null to leave unchanged)
     * @param releaseYear The new release year (optional, null to leave unchanged)
     * @param language The new language (optional, null to leave unchanged)
     * @return A CompletableFuture containing an Optional with the updated Video if found and updated, or an empty Optional otherwise.
     */
    CompletableFuture<Optional<Video>> updateVideo(UUID id, String title, String description, UUID categoryId, 
                                Integer releaseYear, String language);

    /**
     * Delete a video by its ID
     * @param id The video ID
     * @return A CompletableFuture containing true if the video was deleted, false otherwise.
     */
    CompletableFuture<Boolean> deleteVideo(UUID id);

    /**
     * Update the status of a video
     * @param id The video ID
     * @param status The new status
     * @return A CompletableFuture containing an Optional with the updated Video if found and status updated, or an empty Optional otherwise.
     */
    CompletableFuture<Optional<Video>> updateVideoStatus(UUID id, VideoStatus status);

    /**
     * Update the tags for a video
     * @param id The video ID
     * @param tags The new set of tags
     * @return A CompletableFuture containing an Optional with the updated Video if found and tags updated, or an empty Optional otherwise.
     */
    CompletableFuture<Optional<Video>> updateVideoTags(UUID id, Set<String> tags);

    /**
     * List all videos with pagination
     * @param page The page number (0-based)
     * @param size The page size
     * @return A CompletableFuture containing a List of Videos for the requested page.
     */
    CompletableFuture<List<Video>> listVideos(int page, int size);
    
    /**
     * Find videos by category
     * @param categoryId The category ID
     * @param page The page number (0-based)
     * @param size The page size
     * @return A CompletableFuture containing a List of Videos in the given category for the requested page.
     */
    CompletableFuture<List<Video>> findVideosByCategory(UUID categoryId, int page, int size);

    /**
     * Find videos by tag
     * @param tag The tag to search for
     * @param page The page number (0-based)
     * @param size The page size
     * @return A CompletableFuture containing a List of Videos with the given tag for the requested page.
     */
    CompletableFuture<List<Video>> findVideosByTag(String tag, int page, int size);
    
    /**
     * Find videos by filter parameters with pagination and sorting
     * @param filterParams The filter parameters
     * @param page The page number (0-based)
     * @param size The page size
     * @return A CompletableFuture containing a Page of Videos matching the filter criteria.
     */
    CompletableFuture<Page<Video>> findByFilterParams(VideoFilterParams filterParams, int page, int size);
}