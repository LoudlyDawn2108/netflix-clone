package com.streamflix.video.infrastructure.statemachine;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Repository for video processing state persistence.
 */
@Repository
public interface VideoProcessingStateRepository extends JpaRepository<VideoProcessingStateEntity, UUID> {
    
    /**
     * Find all entities with the given state
     * @param state The state to filter by
     * @return List of matching entities
     */
    List<VideoProcessingStateEntity> findByCurrentState(VideoProcessingState state);
    
    /**
     * Find all entities in compensating transaction state
     * @return List of entities that need rollback
     */
    List<VideoProcessingStateEntity> findByCompensatingTransactionTrue();
}
