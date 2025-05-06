package com.streamflix.video.infrastructure.persistence;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.streamflix.video.domain.Video;
import java.util.List;
import java.util.UUID;

/**
 * Spring Data JPA repository for Video entities.
 * Extended with JpaSpecificationExecutor to support dynamic queries.
 */
@Repository
public interface JpaVideoRepository extends JpaRepository<Video, UUID>, JpaSpecificationExecutor<Video> {
    
    @Query("SELECT v FROM Video v WHERE v.category.id = :categoryId")
    List<Video> findByCategoryId(@Param("categoryId") UUID categoryId, Pageable pageable);
    
    @Query("SELECT v FROM Video v JOIN v.tags tag WHERE tag = :tag")
    List<Video> findByTag(@Param("tag") String tag, Pageable pageable);
    
    @Query("SELECT COUNT(v) FROM Video v WHERE v.category.id = :categoryId")
    long countByCategoryId(@Param("categoryId") UUID categoryId);
    
    @Query("SELECT COUNT(v) FROM Video v JOIN v.tags tag WHERE tag = :tag")
    long countByTag(@Param("tag") String tag);
}