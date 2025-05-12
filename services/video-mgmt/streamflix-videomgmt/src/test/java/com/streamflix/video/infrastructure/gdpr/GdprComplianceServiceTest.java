package com.streamflix.video.infrastructure.gdpr;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.streamflix.video.domain.UserRepository;
import com.streamflix.video.domain.VideoRepository;
import com.streamflix.video.domain.Video;
import com.streamflix.video.domain.model.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class GdprComplianceServiceTest {

    @Mock
    private UserRepository userRepository;
    
    @Mock
    private VideoRepository videoRepository;
    
    @Mock
    private JdbcTemplate jdbcTemplate;
    
    @Mock
    private ObjectMapper objectMapper;
    
    private GdprComplianceService gdprService;
    private User testUser;
    private UUID userId;
    private List<Video> userVideos;
    
    @BeforeEach
    void setup() {
        gdprService = new GdprComplianceService(userRepository, videoRepository, jdbcTemplate, objectMapper);
        userId = UUID.randomUUID();
        
        testUser = mock(User.class);
        when(testUser.getUsername()).thenReturn("testuser");
        when(testUser.getEmail()).thenReturn("test@example.com");
        when(testUser.getCreatedAt()).thenReturn(new Date());
        when(testUser.getLastLogin()).thenReturn(new Date());
        when(testUser.getRoles()).thenReturn(Set.of("USER"));
        
        // Set up videos
        userVideos = new ArrayList<>();
        Video video1 = mock(Video.class);
        Video video2 = mock(Video.class);
        userVideos.add(video1);
        userVideos.add(video2);
    }
    
    @Test
    void testExportUserData() throws Exception {
        // Arrange
        when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));
        when(videoRepository.findByUserId(userId)).thenReturn(userVideos);
        when(jdbcTemplate.queryForList(anyString(), eq(userId.toString())))
            .thenReturn(Arrays.asList(Map.of("event_type", "LOGIN", "created_at", new Date())));
        when(objectMapper.writeValueAsString(any())).thenReturn("{}");
        
        // Act
        byte[] result = gdprService.exportUserData(userId);
        
        // Assert
        assertNotNull(result);
        assertTrue(result.length > 0);
        verify(userRepository).findById(userId);
        verify(videoRepository).findByUserId(userId);
        verify(jdbcTemplate).queryForList(anyString(), eq(userId.toString()));
        verify(objectMapper).writeValueAsString(any());
    }
    
    @Test
    void testExportUserDataWithNonExistentUser() {
        // Arrange
        when(userRepository.findById(userId)).thenReturn(Optional.empty());
        
        // Act & Assert
        assertThrows(IllegalArgumentException.class, () -> gdprService.exportUserData(userId));
        verify(userRepository).findById(userId);
        verify(videoRepository, never()).findByUserId(any());
    }
    
    @Test
    void testAnonymizeUser() {
        // Arrange
        when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));
        
        // Act
        gdprService.anonymizeUser(userId);
        
        // Assert
        verify(userRepository).findById(userId);
        verify(testUser).setEmail(argThat(email -> email.startsWith("anonymized-")));
        verify(testUser).setUsername(argThat(username -> username.startsWith("anonymized-")));
        verify(testUser).setPassword("[REDACTED]");
        verify(userRepository).save(testUser);
        verify(jdbcTemplate).update(contains("UPDATE video_metadata"), any(), eq(userId.toString()));
        verify(jdbcTemplate).update(contains("DELETE FROM user_activity_logs"), eq(userId.toString()));
    }
    
    @Test
    void testAnonymizeUserWithNonExistentUser() {
        // Arrange
        when(userRepository.findById(userId)).thenReturn(Optional.empty());
        
        // Act & Assert
        assertThrows(IllegalArgumentException.class, () -> gdprService.anonymizeUser(userId));
        verify(userRepository).findById(userId);
        verify(jdbcTemplate, never()).update(anyString(), any());
    }
    
    @Test
    void testAnonymizeExpiredUserData() {
        // Arrange
        UUID tenantId = UUID.randomUUID();
        List<String> userIdsToAnonymize = Arrays.asList(userId.toString());
        when(jdbcTemplate.queryForList(anyString(), eq(String.class), eq(tenantId.toString()), any()))
            .thenReturn(userIdsToAnonymize);
        when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));
        
        // Act
        int result = gdprService.anonymizeExpiredUserData(tenantId);
        
        // Assert
        assertEquals(1, result);
        verify(jdbcTemplate).queryForList(anyString(), eq(String.class), eq(tenantId.toString()), any());
        verify(userRepository).findById(userId);
        verify(testUser).setEmail(argThat(email -> email.startsWith("anonymized-")));
        verify(testUser).setUsername(argThat(username -> username.startsWith("anonymized-")));
        verify(jdbcTemplate).update(contains("UPDATE user_deletion_requests"), eq(userId.toString()));
    }
}
