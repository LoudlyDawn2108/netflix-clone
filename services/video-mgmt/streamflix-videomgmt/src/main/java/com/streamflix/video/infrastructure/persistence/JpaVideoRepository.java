package com.streamflix.video.infrastructure.persistence;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import com.streamflix.video.domain.Video;
import com.streamflix.video.domain.VideoStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Spring Data JPA repository for Video entities.
 * Extended with JpaSpecificationExecutor to support dynamic queries.
 */
@Repository
public interface JpaVideoRepository extends VideoRepository, JpaRepository<Video, UUID>, JpaSpecificationExecutor<Video> {
    
    @Query("SELECT v FROM Video v WHERE v.category.id = :categoryId")
    List<Video> findByCategoryId(@Param("categoryId") UUID categoryId, Pageable pageable);
    
    @Query("SELECT v FROM Video v JOIN v.tags tag WHERE tag = :tag")
    List<Video> findByTag(@Param("tag") String tag, Pageable pageable);
    
    @Query("SELECT COUNT(v) FROM Video v WHERE v.category.id = :categoryId")
    long countByCategoryId(@Param("categoryId") UUID categoryId);
    
    @Query("SELECT COUNT(v) FROM Video v JOIN v.tags tag WHERE tag = :tag")
    long countByTag(@Param("tag") String tag);
    
    /**
     * Find videos by tag and tenant ID
     * @param tag The tag to search for
     * @param tenantId The tenant ID
     * @param pageable Pagination information
     * @return List of videos matching the criteria
     */
    @Query("SELECT v FROM Video v JOIN v.tags tag WHERE tag = :tag AND v.tenantId = :tenantId")
    List<Video> findByTagAndTenantId(@Param("tag") String tag, @Param("tenantId") UUID tenantId, Pageable pageable);
    
    /**
     * Count videos by tag and tenant ID
     * @param tag The tag to count
     * @param tenantId The tenant ID
     * @return Count of videos matching the criteria
     */
    @Query("SELECT COUNT(v) FROM Video v JOIN v.tags tag WHERE tag = :tag AND v.tenantId = :tenantId")
    long countByTagAndTenantId(@Param("tag") String tag, @Param("tenantId") UUID tenantId);
    
    /**
     * Find a video containing a thumbnail with the given ID
     * @param thumbnailId The thumbnail ID to search for
     * @return Optional containing the video if found
     */
    @Query("SELECT v FROM Video v JOIN v.thumbnails t WHERE t.id = :thumbnailId")
    Optional<Video> findByThumbnailId(@Param("thumbnailId") UUID thumbnailId);
    
    @Override
    @EntityGraph(value = "Video.withCategoryAndThumbnails")
    Optional<Video> findById(UUID id);

    @Modifying
    @Transactional
    @Query("UPDATE Video v SET v.status = :newStatus WHERE v.id IN :videoIds")
    int batchUpdateStatus(@Param("videoIds") List<UUID> videoIds, @Param("newStatus") VideoStatus newStatus);
}