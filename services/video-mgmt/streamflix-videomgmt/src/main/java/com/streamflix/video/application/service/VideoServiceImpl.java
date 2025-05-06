package com.streamflix.video.application.service;

import com.streamflix.video.application.VideoEventPublisher;
import com.streamflix.video.application.port.VideoService;
import com.streamflix.video.domain.*;
import com.streamflix.video.domain.exception.CategoryNotFoundException;
import com.streamflix.video.domain.exception.ValidationException;
import com.streamflix.video.domain.exception.VideoNotFoundException;
import com.streamflix.video.presentation.dto.VideoFilterParams;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Implementation of the VideoService interface.
 * This is part of the application layer and orchestrates domain operations.
 */
@Service
public class VideoServiceImpl implements VideoService {
    
    private static final Logger logger = LoggerFactory.getLogger(VideoServiceImpl.class);
    
    private final VideoRepository videoRepository;
    private final CategoryRepository categoryRepository;
    private final VideoEventPublisher eventPublisher;
    
    public VideoServiceImpl(VideoRepository videoRepository, 
                            CategoryRepository categoryRepository,
                            VideoEventPublisher eventPublisher) {
        this.videoRepository = videoRepository;
        this.categoryRepository = categoryRepository;
        this.eventPublisher = eventPublisher;
    }

    @Override
    @Transactional
    public Video createVideo(String title, String description, UUID categoryId, Set<String> tags) {
        logger.info("Creating new video with title: {}", title);
        
        // Validate input
        if (!StringUtils.hasText(title)) {
            throw new ValidationException("Video title cannot be empty");
        }
        
        Video video = new Video(title, description);
        
        if (categoryId != null) {
            categoryRepository.findById(categoryId)
                .orElseThrow(() -> new CategoryNotFoundException(categoryId))
                .ifPresent(video::setCategory);
        }
        
        if (tags != null && !tags.isEmpty()) {
            video.setTags(tags);
        }
        
        Video savedVideo = videoRepository.save(video);
        
        // Publish event that a new video was created
        eventPublisher.publishVideoCreated(savedVideo);
        
        return savedVideo;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Video> getVideo(UUID id) {
        logger.info("Retrieving video by id: {}", id);
        return videoRepository.findById(id);
    }

    @Override
    @Transactional
    public Optional<Video> updateVideo(UUID id, String title, String description, UUID categoryId, 
                                       Integer releaseYear, String language) {
        logger.info("Updating video with id: {}", id);
        
        Video video = videoRepository.findById(id)
            .orElseThrow(() -> new VideoNotFoundException(id));
        
        if (title != null) {
            if (!StringUtils.hasText(title)) {
                throw new ValidationException("Video title cannot be empty");
            }
            video.setTitle(title);
        }
        
        if (description != null) {
            video.setDescription(description);
        }
        
        if (categoryId != null) {
            Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new CategoryNotFoundException(categoryId));
            video.setCategory(category);
        }
        
        if (releaseYear != null) {
            if (releaseYear < 1900 || releaseYear > 2100) {
                throw new ValidationException("Release year must be between 1900 and 2100");
            }
            video.setReleaseYear(releaseYear);
        }
        
        if (language != null) {
            video.setLanguage(language);
        }
        
        Video updatedVideo = videoRepository.save(video);
        
        // Publish event that video was updated
        eventPublisher.publishVideoUpdated(updatedVideo);
        
        return Optional.of(updatedVideo);
    }

    @Override
    @Transactional
    public Optional<Video> updateVideoTags(UUID id, Set<String> tags) {
        logger.info("Updating tags for video with id: {}", id);
        
        Video video = videoRepository.findById(id)
            .orElseThrow(() -> new VideoNotFoundException(id));
        
        video.setTags(tags != null ? tags : new HashSet<>());
        
        Video updatedVideo = videoRepository.save(video);
        
        // Publish event that video tags were updated
        eventPublisher.publishVideoUpdated(updatedVideo);
        
        return Optional.of(updatedVideo);
    }

    @Override
    @Transactional
    public boolean deleteVideo(UUID id) {
        logger.info("Deleting video with id: {}", id);
        
        Video video = videoRepository.findById(id)
            .orElseThrow(() -> new VideoNotFoundException(id));
        
        video.markAsDeleted();
        videoRepository.save(video);
        
        // Publish event that video was deleted
        eventPublisher.publishVideoDeleted(video);
        
        return true;
    }

    @Override
    @Transactional
    public Optional<Video> updateVideoStatus(UUID id, VideoStatus status) {
        logger.info("Updating status for video with id: {} to {}", id, status);
        
        Video video = videoRepository.findById(id)
            .orElseThrow(() -> new VideoNotFoundException(id));
        
        // Apply the status update according to the domain rules
        switch (status) {
            case UPLOADED -> video.markAsUploaded();
            case PROCESSING -> video.markAsProcessing();
            case READY -> video.markAsReady();
            case FAILED -> video.markAsFailed();
            case DELETED -> video.markAsDeleted();
            default -> logger.warn("Unsupported status update to: {}", status);
        }
        
        Video updatedVideo = videoRepository.save(video);
        
        // Publish event that video status was updated
        eventPublisher.publishVideoStatusChanged(updatedVideo);
        
        return Optional.of(updatedVideo);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Video> findVideosByCategory(UUID categoryId, int page, int size) {
        logger.info("Finding videos by category id: {}", categoryId);
        
        if (!categoryRepository.existsById(categoryId)) {
            throw new CategoryNotFoundException(categoryId);
        }
        
        return videoRepository.findByCategory(categoryId, page, size);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Video> findVideosByTag(String tag, int page, int size) {
        logger.info("Finding videos by tag: {}", tag);
        return videoRepository.findByTag(tag, page, size);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Video> listVideos(int page, int size) {
        logger.info("Listing all videos, page: {}, size: {}", page, size);
        return videoRepository.findAll(page, size);
    }
    
    @Override
    @Transactional(readOnly = true)
    public Page<Video> findByFilterParams(VideoFilterParams filterParams, int page, int size) {
        logger.info("Finding videos by filter params: {}, page: {}, size: {}", filterParams, page, size);
        
        // Validate pagination parameters
        if (page < 0) {
            throw new ValidationException("Page number must be 0 or greater");
        }
        
        if (size <= 0 || size > 100) {
            throw new ValidationException("Page size must be between 1 and 100");
        }
        
        // Validate that if categoryId is provided, it exists
        if (filterParams.getCategoryId() != null && 
            !categoryRepository.existsById(filterParams.getCategoryId())) {
            throw new CategoryNotFoundException(filterParams.getCategoryId());
        }
        
        return videoRepository.findByFilterParams(filterParams, page, size);
    }
}