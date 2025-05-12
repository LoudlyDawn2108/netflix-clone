package com.streamflix.video.presentation.exception;

import com.streamflix.video.domain.exception.TenantOperationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Global exception handler for tenant-related exceptions.
 */
@ControllerAdvice
public class TenantExceptionHandler {

    private static final Logger logger = LoggerFactory.getLogger(TenantExceptionHandler.class);

    @ExceptionHandler(TenantOperationException.class)
    public ResponseEntity<Object> handleTenantOperationException(TenantOperationException ex) {
        logger.error("Tenant operation failed: {} for tenant: {}, operation: {}", 
            ex.getMessage(), ex.getTenantId(), ex.getOperationType(), ex);
        
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", LocalDateTime.now().toString());
        body.put("status", HttpStatus.BAD_REQUEST.value());
        body.put("error", "Tenant Operation Failed");
        body.put("message", ex.getMessage());
        body.put("tenantId", ex.getTenantId());
        body.put("operationType", ex.getOperationType());
        
        return new ResponseEntity<>(body, HttpStatus.BAD_REQUEST);
    }
    
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Object> handleIllegalStateException(IllegalStateException ex) {
        if (ex.getMessage() != null && ex.getMessage().contains("No tenant ID found")) {
            logger.error("Tenant context error: {}", ex.getMessage(), ex);
            
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("timestamp", LocalDateTime.now().toString());
            body.put("status", HttpStatus.BAD_REQUEST.value());
            body.put("error", "Tenant Context Error");
            body.put("message", "Missing tenant context. Please include a valid tenant ID in your request.");
            
            return new ResponseEntity<>(body, HttpStatus.BAD_REQUEST);
        }
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
}
