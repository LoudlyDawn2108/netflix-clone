package com.streamflix.video.presentation.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.streamflix.video.application.port.VideoService;
import com.streamflix.video.config.TestSecurityConfig;
import com.streamflix.video.domain.Video;
import com.streamflix.video.domain.VideoStatus;
import com.streamflix.video.presentation.VideoController;
import com.streamflix.video.presentation.dto.CreateVideoRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.Optional;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(VideoController.class)
@Import(TestSecurityConfig.class)
@ActiveProfiles("test")
public class VideoControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private VideoService videoService;

    private UUID testVideoId;
    private Video testVideo;

    @BeforeEach
    void setUp() {
        testVideoId = UUID.randomUUID();
        
        // Create test video with proper constructor
        testVideo = new Video("Test Video", "Test Description");
    }

    @Test
    void shouldGetVideoById() throws Exception {
        // Given
        when(videoService.getVideo(eq(testVideoId))).thenReturn(Optional.of(testVideo));

        // When/Then
        mockMvc.perform(get("/api/v1/videos/{id}", testVideoId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title", is("Test Video")))
                .andExpect(jsonPath("$.description", is("Test Description")))
                .andExpect(jsonPath("$.status", is("PENDING")));
    }

    @Test
    void shouldReturn404WhenVideoNotFound() throws Exception {
        // Given
        when(videoService.getVideo(any(UUID.class))).thenReturn(Optional.empty());

        // When/Then
        mockMvc.perform(get("/api/v1/videos/{id}", UUID.randomUUID()))
                .andExpect(status().isNotFound());
    }

    @Test
    void shouldCreateVideo() throws Exception {
        // Given
        CreateVideoRequest request = new CreateVideoRequest();
        request.setTitle("New Video");
        request.setDescription("New Description");
        request.setTags(Collections.singleton("test"));

        // Create video object that will be returned by our mocked service
        Video createdVideo = new Video("New Video", "New Description");
        createdVideo.setTags(Collections.singleton("test"));
        
        when(videoService.createVideo(
                eq("New Video"), 
                eq("New Description"), 
                eq(null), 
                eq(Collections.singleton("test"))
        )).thenReturn(createdVideo);
        
        when(videoService.updateVideo(
                any(), eq(null), eq(null), eq(null), any(), any()
        )).thenReturn(Optional.of(createdVideo));

        // When/Then
        mockMvc.perform(post("/api/v1/videos")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title", is("New Video")))
                .andExpect(jsonPath("$.description", is("New Description")))
                .andExpect(jsonPath("$.tags", hasSize(1)))
                .andExpect(jsonPath("$.tags[0]", is("test")));
    }

    @Test
    void shouldUpdateVideoStatus() throws Exception {
        // Given
        Video updatedVideo = new Video("Test Video", "Test Description");
        
        when(videoService.updateVideoStatus(eq(testVideoId), eq(VideoStatus.UPLOADED)))
                .thenReturn(Optional.of(updatedVideo));

        // When/Then
        mockMvc.perform(patch("/api/v1/videos/{id}/status", testVideoId)
                .param("status", "UPLOADED"))
                .andExpect(status().isOk());
    }
}
