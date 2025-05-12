package com.streamflix.video.presentation;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.streamflix.video.domain.model.Tenant;
import com.streamflix.video.infrastructure.gdpr.GdprComplianceService;
import com.streamflix.video.infrastructure.multitenancy.TenantContextHolder;
import java.util.Map;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class GdprControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;
    
    @Autowired
    private ObjectMapper objectMapper;
    
    @MockBean
    private GdprComplianceService gdprComplianceService;
    
    private UUID tenantId;
    private UUID userId;
    
    @BeforeEach
    void setup() {
        tenantId = UUID.randomUUID();
        userId = UUID.randomUUID();
        TenantContextHolder.setTenantId(tenantId);
        
        // Setup mock data export response
        when(gdprComplianceService.exportUserData(any(UUID.class)))
            .thenReturn("User data export".getBytes());
    }
    
    @AfterEach
    void cleanup() {
        TenantContextHolder.clear();
    }
    
    @Test
    void testExportUserData() throws Exception {
        // Act & Assert
        MvcResult result = mockMvc.perform(get("/api/v1/gdpr/users/{userId}/export", userId)
                .header("X-Tenant-ID", tenantId.toString())
                .accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andExpect(content().contentType("application/zip"))
            .andReturn();
            
        MockHttpServletResponse response = result.getResponse();
        assertEquals("attachment; filename=user-data-export.zip", 
            response.getHeader("Content-Disposition"));
        
        verify(gdprComplianceService).exportUserData(userId);
    }
    
    @Test
    void testRequestRightToBeForgotten() throws Exception {
        // Arrange
        doNothing().when(gdprComplianceService).anonymizeUser(any(UUID.class));
        
        // Act & Assert
        mockMvc.perform(post("/api/v1/gdpr/users/{userId}/forget", userId)
                .header("X-Tenant-ID", tenantId.toString()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.message").exists())
            .andExpect(jsonPath("$.userId").value(userId.toString()));
            
        verify(gdprComplianceService).anonymizeUser(userId);
    }
    
    @Test
    void testGetGdprStatus() throws Exception {
        // Arrange
        when(gdprComplianceService.getComplianceStatus(any(UUID.class)))
            .thenReturn(Map.of(
                "dataRetentionCompliant", true,
                "pendingDeletions", 0,
                "pendingAnonymizations", 2,
                "lastComplianceScan", "2023-06-01T10:15:30"
            ));
        
        // Act & Assert
        mockMvc.perform(get("/api/v1/gdpr/status")
                .header("X-Tenant-ID", tenantId.toString())
                .accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.dataRetentionCompliant").value(true))
            .andExpect(jsonPath("$.pendingDeletions").value(0))
            .andExpect(jsonPath("$.pendingAnonymizations").value(2))
            .andExpect(jsonPath("$.lastComplianceScan").value("2023-06-01T10:15:30"));
            
        verify(gdprComplianceService).getComplianceStatus(tenantId);
    }
    
    @Test
    void testRunGdprComplianceScan() throws Exception {
        // Arrange
        when(gdprComplianceService.runComplianceScan(any(UUID.class)))
            .thenReturn(5); // 5 records processed
        
        // Act & Assert
        mockMvc.perform(post("/api/v1/gdpr/scan")
                .header("X-Tenant-ID", tenantId.toString())
                .accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.message").exists())
            .andExpect(jsonPath("$.recordsProcessed").value(5));
            
        verify(gdprComplianceService).runComplianceScan(tenantId);
    }
}
