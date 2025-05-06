package com.streamflix.video.infrastructure.service;

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
import java.net.URL;
import java.time.Duration;
import java.util.ArrayList;
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
        }
        
        return keys;
    }
}