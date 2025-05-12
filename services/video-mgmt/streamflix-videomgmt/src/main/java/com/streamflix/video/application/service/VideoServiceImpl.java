package com.streamflix.video.application.service;

import com.streamflix.video.application.VideoEventPublisher;
import com.streamflix.video.application.port.VideoService;
import com.streamflix.video.domain.*;
import com.streamflix.video.domain.event.VideoCreatedDomainEvent;
import com.streamflix.video.domain.event.VideoStatusChangedDomainEvent;
import com.streamflix.video.domain.exception.CategoryNotFoundException;
import com.streamflix.video.domain.exception.ValidationException;
import com.streamflix.video.domain.exception.VideoNotFoundException;
import com.streamflix.video.infrastructure.archiving.S3ArchiveManager;
import com.streamflix.video.presentation.dto.VideoFilterParams;
import io.micrometer.core.annotation.Timed;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.instrumentation.annotations.WithSpan;
import org.springframework.context.ApplicationEventPublisher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

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
    private final VideoServiceMetrics metrics;
    private final ApplicationEventPublisher applicationEventPublisher;
    private final S3ArchiveManager archiveManager;
    
    public VideoServiceImpl(VideoRepository videoRepository, 
                            CategoryRepository categoryRepository,
                            VideoEventPublisher eventPublisher,
                            VideoServiceMetrics metrics,
                            ApplicationEventPublisher applicationEventPublisher,
                            S3ArchiveManager archiveManager) {
        this.videoRepository = videoRepository;
        this.categoryRepository = categoryRepository;
        this.eventPublisher = eventPublisher;
        this.metrics = metrics;
        this.applicationEventPublisher = applicationEventPublisher;
        this.archiveManager = archiveManager;
    }

    @Async("taskExecutor")
    @Override
    @CachePut(cacheNames = CacheConfig.VIDEO_CACHE, keyGenerator = "cacheKeyGenerator")
    @WithSpan
    @Timed(value = "video.service.create.time", description = "Time taken to create video")
    @Transactional
    public CompletableFuture<Video> createVideo(String title, String description, UUID categoryId, Set<String> tags) {
        logger.info("Creating new video with title: {}", title);
        Span.current().setAttribute("video.title", title);
        Span.current().setAttribute("video.category_id", categoryId != null ? categoryId.toString() : "");
        Span.current().setAttribute("video.tags.count", tags != null ? tags.size() : 0);
        
        // Validate input
        if (!StringUtils.hasText(title)) {
            throw new ValidationException("Video title cannot be empty");
        }
        
        Video video = new Video(title, description);
        
        if (categoryId != null) {
            Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new CategoryNotFoundException(categoryId));
            video.setCategory(category);
        }
        
        if (tags != null && !tags.isEmpty()) {
            video.setTags(tags);
        }
        
        Video savedVideo = videoRepository.save(video);
        metrics.incrementCreate();
          // Publish external event that a new video was created
        eventPublisher.publishVideoCreated(savedVideo);
        
        // Publish internal domain event for workflow initialization
        applicationEventPublisher.publishEvent(new VideoCreatedDomainEvent(savedVideo));
        
        return CompletableFuture.completedFuture(savedVideo);
    }

    @Async("taskExecutor")
    @Override
    @Cacheable(cacheNames = CacheConfig.VIDEO_CACHE, keyGenerator = "cacheKeyGenerator")
    @WithSpan
    @Timed(value = "video.service.read.time", description = "Time taken to read video")
    @Transactional(readOnly = true)
    public CompletableFuture<Optional<Video>> getVideo(UUID id) {
        logger.info("Retrieving video by id: {}", id);
        Span.current().setAttribute("video.id", id.toString());
        return CompletableFuture.completedFuture(videoRepository.findById(id));
    }

    @Async("taskExecutor")
    @Override
    @CacheEvict(cacheNames = {CacheConfig.VIDEOS_BY_CATEGORY_CACHE, CacheConfig.VIDEOS_BY_TAG_CACHE}, allEntries = true)
    @CachePut(cacheNames = CacheConfig.VIDEO_CACHE, keyGenerator = "cacheKeyGenerator", condition = "#result.isPresent()")
    @WithSpan
    @Timed(value = "video.service.update.time", description = "Time taken to update video")
    @Transactional
    public CompletableFuture<Optional<Video>> updateVideo(UUID id, String title, String description, UUID categoryId, 
                                       Integer releaseYear, String language) {
        logger.info("Updating video with id: {}", id);
        Span.current().setAttribute("video.id", id.toString());
        if (title != null) Span.current().setAttribute("video.new.title", title);
        
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
        metrics.incrementUpdate();
        
        // Publish event that video was updated
        eventPublisher.publishVideoUpdated(updatedVideo);
        
        return CompletableFuture.completedFuture(Optional.of(updatedVideo));
    }

    @Async("taskExecutor")
    @Override
    @CacheEvict(cacheNames = {CacheConfig.VIDEOS_BY_CATEGORY_CACHE, CacheConfig.VIDEOS_BY_TAG_CACHE}, allEntries = true)
    @CachePut(cacheNames = CacheConfig.VIDEO_CACHE, keyGenerator = "cacheKeyGenerator", condition = "#result.isPresent()")
    @WithSpan
    @Timed(value = "video.service.update.time", description = "Time taken to update video tags")
    @Transactional
    public CompletableFuture<Optional<Video>> updateVideoTags(UUID id, Set<String> tags) {
        logger.info("Updating tags for video with id: {}", id);
        Span.current().setAttribute("video.id", id.toString());
        Span.current().setAttribute("video.tags.count", tags != null ? tags.size() : 0);
        
        Video video = videoRepository.findById(id)
            .orElseThrow(() -> new VideoNotFoundException(id));
        
        video.setTags(tags != null ? tags : new HashSet<>());
        
        Video updatedVideo = videoRepository.save(video);
        metrics.incrementUpdate();
        
        // Publish event that video tags were updated
        eventPublisher.publishVideoUpdated(updatedVideo);
        
        return CompletableFuture.completedFuture(Optional.of(updatedVideo));
    }

    @Async("taskExecutor")
    @Override
    @CacheEvict(cacheNames = {CacheConfig.VIDEO_CACHE, CacheConfig.VIDEOS_BY_CATEGORY_CACHE, CacheConfig.VIDEOS_BY_TAG_CACHE}, keyGenerator = "cacheKeyGenerator")
    @WithSpan
    @Timed(value = "video.service.delete.time", description = "Time taken to delete video")
    @Transactional
    public CompletableFuture<Boolean> deleteVideo(UUID id) {
        logger.info("Deleting video with id: {}", id);
        Span.current().setAttribute("video.id", id.toString());
        
        Video video = videoRepository.findById(id)
            .orElseThrow(() -> new VideoNotFoundException(id));
        
        video.markAsDeleted();
        videoRepository.save(video);
        metrics.incrementDelete();
        
        // Publish event that video was deleted
        eventPublisher.publishVideoDeleted(video);
        
        return CompletableFuture.completedFuture(true);
    }

    @Async("taskExecutor")
    @Override
    @CacheEvict(cacheNames = {CacheConfig.VIDEOS_BY_CATEGORY_CACHE, CacheConfig.VIDEOS_BY_TAG_CACHE}, allEntries = true)
    @CachePut(cacheNames = CacheConfig.VIDEO_CACHE, keyGenerator = "cacheKeyGenerator", condition = "#result.isPresent()")
    @WithSpan
    @Timed(value = "video.service.update.time", description = "Time taken to update video status")
    @Transactional
    public CompletableFuture<Optional<Video>> updateVideoStatus(UUID id, VideoStatus status) {
        logger.info("Updating status for video with id: {} to {}", id, status);
        Span.current().setAttribute("video.id", id.toString());
        Span.current().setAttribute("video.new.status", status.name());
        
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
        metrics.incrementUpdate();
        
        // Publish external event that video status was updated
        eventPublisher.publishVideoStatusChanged(updatedVideo);
        
        // Publish internal domain event for workflow state machine
        applicationEventPublisher.publishEvent(new VideoStatusChangedDomainEvent(updatedVideo, status));
        
        return CompletableFuture.completedFuture(Optional.of(updatedVideo));
    }

    @Async("taskExecutor")
    @Override
    @Cacheable(cacheNames = CacheConfig.VIDEOS_BY_CATEGORY_CACHE, keyGenerator = "cacheKeyGenerator")
    @Transactional(readOnly = true)
    public CompletableFuture<List<Video>> findVideosByCategory(UUID categoryId, int page, int size) {
        logger.info("Finding videos by category id: {}", categoryId);
        
        if (!categoryRepository.existsById(categoryId)) {
            throw new CategoryNotFoundException(categoryId);
        }
        
        return CompletableFuture.completedFuture(videoRepository.findByCategory(categoryId, page, size));
    }

    @Async("taskExecutor")
    @Override
    @Cacheable(cacheNames = CacheConfig.VIDEOS_BY_TAG_CACHE, keyGenerator = "cacheKeyGenerator")
    @Transactional(readOnly = true)
    public CompletableFuture<List<Video>> findVideosByTag(String tag, int page, int size) {
        logger.info("Finding videos by tag: {}", tag);
        return CompletableFuture.completedFuture(videoRepository.findByTag(tag, page, size));
    }

    @Async("taskExecutor")
    @Override
    @Transactional(readOnly = true)
    public CompletableFuture<List<Video>> listVideos(int page, int size) {
        logger.info("Listing all videos, page: {}, size: {}", page, size);
        return CompletableFuture.completedFuture(videoRepository.findAll(page, size));
    }
    
    @Async("taskExecutor")
    @Override
    @Transactional(readOnly = true)
    public CompletableFuture<Page<Video>> findByFilterParams(VideoFilterParams filterParams, int page, int size) {
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
        
        return CompletableFuture.completedFuture(videoRepository.findByFilterParams(filterParams, page, size));
    }

    @Async("taskExecutor")
    @Override
    @CacheEvict(cacheNames = {CacheConfig.VIDEOS_BY_CATEGORY_CACHE, CacheConfig.VIDEOS_BY_TAG_CACHE}, allEntries = true)
    @CachePut(cacheNames = CacheConfig.VIDEO_CACHE, keyGenerator = "cacheKeyGenerator", condition = "#result.isPresent()")
    @WithSpan
    @Timed(value = "video.service.archive.time", description = "Time taken to archive video")
    @Transactional
    public CompletableFuture<Optional<Video>> archiveVideo(UUID id) {
        logger.info("Archiving video with id: {}", id);
        Span.current().setAttribute("video.id", id.toString());
        
        try {
            Video video = videoRepository.findById(id)
                .orElseThrow(() -> new VideoNotFoundException(id));
            
            // Check if video is already archived
            if (video.isArchived()) {
                logger.warn("Video {} is already archived", id);
                return CompletableFuture.completedFuture(Optional.of(video));
            }
            
            // Archive video to cold storage
            archiveManager.archiveVideo(video);
            
            // Save the updated video entity
            Video archivedVideo = videoRepository.save(video);
            metrics.incrementUpdate();
            
            // Publish event that video was archived
            eventPublisher.publishVideoUpdated(archivedVideo);
            
            return CompletableFuture.completedFuture(Optional.of(archivedVideo));
        } catch (VideoNotFoundException e) {
            logger.error("Video not found for archiving: {}", id);
            throw e;
        } catch (Exception e) {
            logger.error("Error archiving video {}: {}", id, e.getMessage(), e);
            throw new RuntimeException("Failed to archive video", e);
        }
    }

    @Async("taskExecutor")
    @Override
    @CacheEvict(cacheNames = {CacheConfig.VIDEOS_BY_CATEGORY_CACHE, CacheConfig.VIDEOS_BY_TAG_CACHE}, allEntries = true)
    @CachePut(cacheNames = CacheConfig.VIDEO_CACHE, keyGenerator = "cacheKeyGenerator", condition = "#result.isPresent()")
    @WithSpan
    @Timed(value = "video.service.restore.time", description = "Time taken to restore archived video")
    @Transactional
    public CompletableFuture<Optional<Video>> restoreArchivedVideo(UUID id) {
        logger.info("Restoring archived video with id: {}", id);
        Span.current().setAttribute("video.id", id.toString());
        
        try {
            Video video = videoRepository.findById(id)
                .orElseThrow(() -> new VideoNotFoundException(id));
            
            // Check if video is actually archived
            if (!video.isArchived()) {
                logger.warn("Video {} is not archived and cannot be restored", id);
                throw new IllegalStateException("Video is not archived and cannot be restored");
            }
            
            // Restore video from cold storage
            archiveManager.restoreVideo(video);
            
            // Save the updated video entity
            Video restoredVideo = videoRepository.save(video);
            metrics.incrementUpdate();
            
            // Publish event that video was restored
            eventPublisher.publishVideoUpdated(restoredVideo);
            
            return CompletableFuture.completedFuture(Optional.of(restoredVideo));
        } catch (VideoNotFoundException e) {
            logger.error("Video not found for restoration: {}", id);
            throw e;
        } catch (IllegalStateException e) {
            logger.error("Cannot restore non-archived video: {}", id);
            throw e;
        } catch (Exception e) {
            logger.error("Error restoring video {}: {}", id, e.getMessage(), e);
            throw new RuntimeException("Failed to restore archived video", e);
        }
    }

    @Override
    @Transactional(readOnly = true)
    @WithSpan
    public List<Video> findArchivedVideos(int page, int size) {
        logger.info("Finding archived videos, page: {}, size: {}", page, size);
        
        // Validate pagination parameters
        if (page < 0) {
            throw new ValidationException("Page number must be 0 or greater");
        }
        
        if (size <= 0 || size > 100) {
            throw new ValidationException("Page size must be between 1 and 100");
        }
        
        return videoRepository.findArchivedVideos(page, size);
    }
 }