package com.streamflix.video.infrastructure.repository;

import com.streamflix.video.config.TestDatabaseConfig;
import com.streamflix.video.domain.Category;
import com.streamflix.video.domain.Video;
import com.streamflix.video.domain.VideoStatus;
import com.streamflix.video.infrastructure.persistence.JpaCategoryRepository;
import com.streamflix.video.infrastructure.persistence.JpaVideoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(TestDatabaseConfig.class)
@ActiveProfiles("test")
public class JpaVideoRepositoryIntegrationTest {

    @Autowired
    private JpaVideoRepository videoRepository;
    
    @Autowired
    private JpaCategoryRepository categoryRepository;

    private Category testCategory;
    private Video testVideo;
    
    @BeforeEach
    void setUp() {
        // Clear previous test data
        videoRepository.deleteAll();
        categoryRepository.deleteAll();
        
        // Create a test category using the proper constructor
        Category category = new Category("Action", "Action movies");
        testCategory = categoryRepository.save(category);
        
        // Create a test video using the proper constructor
        Video video = new Video("Test Video", "Test Description");
        video.setCategory(testCategory);
        video.setReleaseYear(2023);
        video.setLanguage("en");
        
        // Add some tags
        Set<String> tags = new HashSet<>();
        tags.add("action");
        tags.add("test");
        video.setTags(tags);
        
        testVideo = videoRepository.save(video);
    }

    @Test
    void shouldSaveAndRetrieveVideo() {
        // When
        Optional<Video> foundVideo = videoRepository.findById(testVideo.getId());

        // Then
        assertThat(foundVideo).isPresent();
        assertThat(foundVideo.get().getTitle()).isEqualTo("Test Video");
        assertThat(foundVideo.get().getStatus()).isEqualTo(VideoStatus.PENDING);
        assertThat(foundVideo.get().getCategory()).isNotNull();
        assertThat(foundVideo.get().getCategory().getId()).isEqualTo(testCategory.getId());
    }
    
    @Test
    void shouldFindVideosByCategory() {
        // When
        List<Video> videos = videoRepository.findByCategoryId(testCategory.getId(), PageRequest.of(0, 10));
        
        // Then
        assertThat(videos).isNotEmpty();
        assertThat(videos.get(0).getId()).isEqualTo(testVideo.getId());
    }
    
    @Test
    void shouldFindVideosByTag() {
        // When
        List<Video> videos = videoRepository.findByTag("action", PageRequest.of(0, 10));
        
        // Then
        assertThat(videos).isNotEmpty();
        assertThat(videos.get(0).getId()).isEqualTo(testVideo.getId());
    }
    
    @Test
    void shouldUpdateVideoProperties() {
        // Given
        testVideo.setTitle("Updated Title");
        testVideo.setDescription("Updated Description");
        testVideo.setReleaseYear(2024);
        
        // When
        Video updatedVideo = videoRepository.save(testVideo);
        
        // Then
        assertThat(updatedVideo.getTitle()).isEqualTo("Updated Title");
        assertThat(updatedVideo.getDescription()).isEqualTo("Updated Description");
        assertThat(updatedVideo.getReleaseYear()).isEqualTo(2024);
        
        // Verify the changes were persisted
        Optional<Video> reloadedVideo = videoRepository.findById(testVideo.getId());
        assertThat(reloadedVideo).isPresent();
        assertThat(reloadedVideo.get().getTitle()).isEqualTo("Updated Title");
    }
    
    @Test
    void shouldCountVideosByCategory() {
        // When
        long count = videoRepository.countByCategoryId(testCategory.getId());
        
        // Then
        assertThat(count).isEqualTo(1);
    }
    
    @Test
    void shouldCountVideosByTag() {
        // When
        long count = videoRepository.countByTag("test");
        
        // Then
        assertThat(count).isEqualTo(1);
        
        // And no videos with non-existent tag
        long nonExistentCount = videoRepository.countByTag("nonexistent");
        assertThat(nonExistentCount).isEqualTo(0);
    }
}
