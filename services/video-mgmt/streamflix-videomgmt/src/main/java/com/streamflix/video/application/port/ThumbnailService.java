package com.streamflix.video.application.port;

import com.streamflix.video.domain.Thumbnail;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Service interface for thumbnail management operations.
 * This is part of the application layer in the hexagonal architecture.
 */
public interface ThumbnailService {

    /**
     * Create a new thumbnail for a video
     * @param videoId The video ID to associate the thumbnail with
     * @param url The URL to the thumbnail image
     * @param width The width of the thumbnail image
     * @param height The height of the thumbnail image
     * @param isPrimary Whether this is the primary thumbnail for the video
     * @return The created thumbnail entity
     */
    Thumbnail createThumbnail(UUID videoId, String url, Integer width, Integer height, boolean isPrimary);

    /**
     * Retrieve a thumbnail by its ID
     * @param id The thumbnail ID
     * @return Optional containing the thumbnail if found
     */
    Optional<Thumbnail> getThumbnail(UUID id);

    /**
     * Update an existing thumbnail
     * @param id The thumbnail ID
     * @param url The new URL (optional, null to leave unchanged)
     * @param width The new width (optional, null to leave unchanged)
     * @param height The new height (optional, null to leave unchanged)
     * @param isPrimary Whether this is the primary thumbnail (optional, null to leave unchanged)
     * @return The updated thumbnail entity or empty if not found
     */
    Optional<Thumbnail> updateThumbnail(UUID id, String url, Integer width, Integer height, Boolean isPrimary);

    /**
     * Delete a thumbnail by its ID
     * @param id The thumbnail ID
     * @return true if the thumbnail was deleted, false if not found
     */
    boolean deleteThumbnail(UUID id);

    /**
     * Get all thumbnails for a specific video
     * @param videoId The video ID
     * @return List of thumbnails for the video
     */
    List<Thumbnail> getThumbnailsForVideo(UUID videoId);

    /**
     * Set the primary thumbnail for a video
     * This will clear the primary flag from any other thumbnails for this video
     * @param videoId The video ID
     * @param thumbnailId The ID of the thumbnail to set as primary
     * @return The updated thumbnail or empty if not found
     */
    Optional<Thumbnail> setPrimaryThumbnail(UUID videoId, UUID thumbnailId);
}