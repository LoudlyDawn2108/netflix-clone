package com.streamflix.video.infrastructure.service;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.io.InputStream;
import java.net.MalformedURLException;
import java.net.URL;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@Service
public class AwsS3Service implements S3Service {

    private static final Logger logger = LoggerFactory.getLogger(AwsS3Service.class);
    
    private final S3Client s3Client;
    private final S3Presigner s3Presigner;
    private final String bucketName;
    
    public AwsS3Service(
            S3Client s3Client,
            S3Presigner s3Presigner,
            @Value("${cloud.aws.s3.bucket-name}") String bucketName) {
        this.s3Client = s3Client;
        this.s3Presigner = s3Presigner;
        this.bucketName = bucketName;
    }
    
    @Override
    @CircuitBreaker(name = "s3Service", fallbackMethod = "fallbackGeneratePresignedUploadUrl")
    @Retry(name = "s3Service")
    public URL generatePresignedUploadUrl(String key, String contentType, Duration expiration) {
        logger.debug("Generating presigned upload URL for key: {} with content type: {}", key, contentType);
        
        PutObjectRequest objectRequest = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .contentType(contentType)
                .build();
                
        PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                .signatureDuration(expiration)
                .putObjectRequest(objectRequest)
                .build();
                
        PresignedPutObjectRequest presignedRequest = s3Presigner.presignPutObject(presignRequest);
        
        logger.info("Generated presigned upload URL for key: {}", key);
        return presignedRequest.url();
    }
    
    @Override
    @CircuitBreaker(name = "s3Service", fallbackMethod = "fallbackGeneratePresignedDownloadUrl")
    @Retry(name = "s3Service")
    public URL generatePresignedDownloadUrl(String key, Duration expiration) {
        logger.debug("Generating presigned download URL for key: {}", key);
        
        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .build();
                
        GetObjectPresignRequest getObjectPresignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(expiration)
                .getObjectRequest(getObjectRequest)
                .build();
                
        PresignedGetObjectRequest presignedGetObjectRequest = s3Presigner.presignGetObject(getObjectPresignRequest);
        
        logger.info("Generated presigned download URL for key: {}", key);
        return presignedGetObjectRequest.url();
    }
    
    @Override
    @CircuitBreaker(name = "s3Service", fallbackMethod = "fallbackUploadFile")
    @Retry(name = "s3Service")
    public boolean uploadFile(String key, InputStream content, String contentType) {
        try {
            logger.debug("Uploading file to S3 with key: {} and content type: {}", key, contentType);
            
            byte[] bytes = content.readAllBytes();
            
            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .contentType(contentType)
                    .contentLength((long) bytes.length)
                    .build();
                    
            s3Client.putObject(putObjectRequest, RequestBody.fromBytes(bytes));
            
            logger.info("Successfully uploaded file to S3 with key: {}", key);
            return true;
        } catch (Exception e) {
            logger.error("Failed to upload file to S3 with key: {}", key, e);
            return false;
        }
    }
    
    @Override
    @CircuitBreaker(name = "s3Service", fallbackMethod = "fallbackDeleteFile")
    @Retry(name = "s3Service")
    public boolean deleteFile(String key) {
        try {
            logger.debug("Deleting file from S3 with key: {}", key);
            
            DeleteObjectRequest deleteObjectRequest = DeleteObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .build();
                    
            s3Client.deleteObject(deleteObjectRequest);
            
            logger.info("Successfully deleted file from S3 with key: {}", key);
            return true;
        } catch (Exception e) {
            logger.error("Failed to delete file from S3 with key: {}", key, e);
            return false;
        }
    }
    
    @Override
    @CircuitBreaker(name = "s3Service", fallbackMethod = "fallbackFileExists")
    @Retry(name = "s3Service")
    public boolean fileExists(String key) {
        try {
            logger.debug("Checking if file exists in S3 with key: {}", key);
            
            HeadObjectRequest headObjectRequest = HeadObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .build();
                    
            s3Client.headObject(headObjectRequest);
            
            logger.debug("File exists in S3 with key: {}", key);
            return true;
        } catch (NoSuchKeyException e) {
            logger.debug("File does not exist in S3 with key: {}", key);
            return false;
        } catch (Exception e) {
            logger.error("Error checking if file exists in S3 with key: {}", key, e);
            return false;
        }
    }

    @Override
    @CircuitBreaker(name = "s3Service", fallbackMethod = "fallbackListFiles")
    @Retry(name = "s3Service")
    public List<String> listFiles(String prefix) {
        logger.debug("Listing files in S3 with prefix: {}", prefix);
        
        List<String> keys = new ArrayList<>();
        
        try {
            ListObjectsV2Request listObjectsRequest = ListObjectsV2Request.builder()
                    .bucket(bucketName)
                    .prefix(prefix)
                    .build();
                    
            ListObjectsV2Response response = s3Client.listObjectsV2(listObjectsRequest);
            
            response.contents().forEach(s3Object -> keys.add(s3Object.key()));
            
            logger.debug("Found {} files in S3 with prefix: {}", keys.size(), prefix);
        } catch (Exception e) {
            logger.error("Failed to list files in S3 with prefix: {}", prefix, e);
            return Collections.emptyList(); // Return empty list on failure
        }
        
        return keys;
    }

    // Fallback methods
    public URL fallbackGeneratePresignedUploadUrl(String key, String contentType, Duration expiration, Throwable t) {
        logger.error("S3 Fallback: Could not generate presigned upload URL for key: {}. Reason: {}", key, t.getMessage());
        try {
            return new URL("http://fallback.url/error"); // Return a dummy or error URL
        } catch (MalformedURLException e) {
            return null;
        }
    }

    public URL fallbackGeneratePresignedDownloadUrl(String key, Duration expiration, Throwable t) {
        logger.error("S3 Fallback: Could not generate presigned download URL for key: {}. Reason: {}", key, t.getMessage());
        try {
            return new URL("http://fallback.url/error"); // Return a dummy or error URL
        } catch (MalformedURLException e) {
            return null;
        }
    }

    public boolean fallbackUploadFile(String key, InputStream content, String contentType, Throwable t) {
        logger.error("S3 Fallback: Could not upload file for key: {}. Reason: {}", key, t.getMessage());
        return false;
    }

    public boolean fallbackDeleteFile(String key, Throwable t) {
        logger.error("S3 Fallback: Could not delete file for key: {}. Reason: {}", key, t.getMessage());
        return false;
    }

    public boolean fallbackFileExists(String key, Throwable t) {
        logger.error("S3 Fallback: Could not check existence for key: {}. Reason: {}", key, t.getMessage());
        return false; // Or true, depending on desired behavior (e.g., assume exists to prevent re-processing)
    }

    public List<String> fallbackListFiles(String prefix, Throwable t) {
        logger.error("S3 Fallback: Could not list files for prefix: {}. Reason: {}", prefix, t.getMessage());
        return Collections.emptyList();
    }
}