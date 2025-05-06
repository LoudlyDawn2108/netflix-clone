package com.streamflix.video.application.service;

import com.streamflix.video.application.VideoEventPublisher;
import com.streamflix.video.application.port.ThumbnailService;
import com.streamflix.video.domain.Thumbnail;
import com.streamflix.video.domain.Video;
import com.streamflix.video.domain.VideoRepository;
import com.streamflix.video.domain.exception.ValidationException;
import com.streamflix.video.domain.exception.VideoNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Implementation of the ThumbnailService interface.
 * This is part of the application layer and orchestrates domain operations.
 */
@Service
public class ThumbnailServiceImpl implements ThumbnailService {

    private static final Logger logger = LoggerFactory.getLogger(ThumbnailServiceImpl.class);
    
    private final VideoRepository videoRepository;
    private final VideoEventPublisher eventPublisher;

    public ThumbnailServiceImpl(VideoRepository videoRepository, VideoEventPublisher eventPublisher) {
        this.videoRepository = videoRepository;
        this.eventPublisher = eventPublisher;
    }

    @Override
    @Transactional
    public Thumbnail createThumbnail(UUID videoId, String url, Integer width, Integer height, boolean isPrimary) {
        logger.info("Creating new thumbnail for video id: {}", videoId);
        
        // Validate input
        if (!StringUtils.hasText(url)) {
            throw new ValidationException("Thumbnail URL cannot be empty");
        }
        
        if (width != null && width <= 0) {
            throw new ValidationException("Thumbnail width must be positive");
        }
        
        if (height != null && height <= 0) {
            throw new ValidationException("Thumbnail height must be positive");
        }
        
        // Get the video
        Video video = videoRepository.findById(videoId)
            .orElseThrow(() -> new VideoNotFoundException(videoId));
        
        // Create thumbnail
        Thumbnail thumbnail = new Thumbnail(url);
        thumbnail.setWidth(width);
        thumbnail.setHeight(height);
        thumbnail.setPrimary(isPrimary);
        
        // Add thumbnail to video
        video.addThumbnail(thumbnail);
        
        // If this is set as primary, ensure other thumbnails are not primary
        if (isPrimary) {
            video.getThumbnails().stream()
                .filter(t -> !t.equals(thumbnail) && t.isPrimary())
                .forEach(t -> t.setPrimary(false));
        }
        
        // Save the video which cascades to the thumbnail
        Video updatedVideo = videoRepository.save(video);
        
        // Publish event about the video update
        eventPublisher.publishVideoUpdated(updatedVideo);
        
        // Return the created thumbnail
        return thumbnail;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Thumbnail> getThumbnail(UUID id) {
        logger.info("Retrieving thumbnail by id: {}", id);
        
        // Find videos with this thumbnail ID
        Optional<Video> videoWithThumbnail = videoRepository.findByThumbnailId(id);
        
        // Extract the thumbnail if found
        return videoWithThumbnail.flatMap(video -> 
            video.getThumbnails().stream()
                .filter(thumbnail -> thumbnail.getId().equals(id))
                .findFirst()
        );
    }

    @Override
    @Transactional
    public Optional<Thumbnail> updateThumbnail(UUID id, String url, Integer width, Integer height, Boolean isPrimary) {
        logger.info("Updating thumbnail with id: {}", id);
        
        // Find the video containing this thumbnail
        Optional<Video> optionalVideo = videoRepository.findByThumbnailId(id);
        
        if (optionalVideo.isEmpty()) {
            return Optional.empty();
        }
        
        Video video = optionalVideo.get();
        
        // Find the thumbnail to update
        Optional<Thumbnail> optionalThumbnail = video.getThumbnails().stream()
            .filter(thumbnail -> thumbnail.getId().equals(id))
            .findFirst();
        
        if (optionalThumbnail.isEmpty()) {
            return Optional.empty();
        }
        
        Thumbnail thumbnail = optionalThumbnail.get();
        
        // Apply updates
        if (StringUtils.hasText(url)) {
            thumbnail.setUrl(url);
        }
        
        if (width != null) {
            if (width <= 0) {
                throw new ValidationException("Thumbnail width must be positive");
            }
            thumbnail.setWidth(width);
        }
        
        if (height != null) {
            if (height <= 0) {
                throw new ValidationException("Thumbnail height must be positive");
            }
            thumbnail.setHeight(height);
        }
        
        if (isPrimary != null) {
            if (isPrimary) {
                // Clear primary flag from other thumbnails
                video.getThumbnails().stream()
                    .filter(t -> !t.equals(thumbnail))
                    .forEach(t -> t.setPrimary(false));
            }
            thumbnail.setPrimary(isPrimary);
        }
        
        // Save the video which cascades to the thumbnails
        Video updatedVideo = videoRepository.save(video);
        
        // Publish event about the video update
        eventPublisher.publishVideoUpdated(updatedVideo);
        
        return Optional.of(thumbnail);
    }

    @Override
    @Transactional
    public boolean deleteThumbnail(UUID id) {
        logger.info("Deleting thumbnail with id: {}", id);
        
        // Find the video containing this thumbnail
        Optional<Video> optionalVideo = videoRepository.findByThumbnailId(id);
        
        if (optionalVideo.isEmpty()) {
            return false;
        }
        
        Video video = optionalVideo.get();
        
        // Find and remove the thumbnail
        boolean removed = video.removeThumbnailById(id);
        
        if (removed) {
            // Save the video which cascades the thumbnail deletion
            videoRepository.save(video);
            
            // Publish event about the video update
            eventPublisher.publishVideoUpdated(video);
        }
        
        return removed;
    }

    @Override
    @Transactional(readOnly = true)
    public List<Thumbnail> getThumbnailsForVideo(UUID videoId) {
        logger.info("Getting thumbnails for video id: {}", videoId);
        
        return videoRepository.findById(videoId)
            .map(Video::getThumbnails)
            .orElse(Collections.emptyList());
    }

    @Override
    @Transactional
    public Optional<Thumbnail> setPrimaryThumbnail(UUID videoId, UUID thumbnailId) {
        logger.info("Setting thumbnail id: {} as primary for video id: {}", thumbnailId, videoId);
        
        // Get the video
        Video video = videoRepository.findById(videoId)
            .orElseThrow(() -> new VideoNotFoundException(videoId));
        
        // Find the thumbnail to set as primary
        Optional<Thumbnail> primaryThumbnail = video.getThumbnails().stream()
            .filter(thumbnail -> thumbnail.getId().equals(thumbnailId))
            .findFirst();
        
        if (primaryThumbnail.isEmpty()) {
            return Optional.empty();
        }
        
        // Set this thumbnail as primary and clear others
        video.getThumbnails().forEach(thumbnail -> {
            thumbnail.setPrimary(thumbnail.getId().equals(thumbnailId));
        });
        
        // Save the video
        videoRepository.save(video);
        
        // Publish event about the video update
        eventPublisher.publishVideoUpdated(video);
        
        return primaryThumbnail;
    }
}