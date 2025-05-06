package com.streamflix.video.infrastructure.service;

import java.io.InputStream;
import java.net.URL;
import java.time.Duration;
import java.util.List;
import java.util.Optional;

/**
 * Service interface for S3 operations
 */
public interface S3Service {
    
    /**
     * Generate a pre-signed URL for uploading a file to S3
     *
     * @param key The object key (path in the bucket)
     * @param contentType The content type of the file
     * @param expiration How long the URL should be valid
     * @return A pre-signed URL for upload
     */
    URL generatePresignedUploadUrl(String key, String contentType, Duration expiration);
    
    /**
     * Generate a pre-signed URL for downloading a file from S3
     *
     * @param key The object key (path in the bucket)
     * @param expiration How long the URL should be valid
     * @return A pre-signed URL for download
     */
    URL generatePresignedDownloadUrl(String key, Duration expiration);
    
    /**
     * Upload a file to S3
     *
     * @param key The object key (path in the bucket)
     * @param content The file content as input stream
     * @param contentType The content type of the file
     * @return true if successful, false otherwise
     */
    boolean uploadFile(String key, InputStream content, String contentType);
    
    /**
     * Delete a file from S3
     *
     * @param key The object key (path in the bucket)
     * @return true if successful, false otherwise
     */
    boolean deleteFile(String key);
    
    /**
     * Check if a file exists in S3
     *
     * @param key The object key (path in the bucket)
     * @return true if the file exists, false otherwise
     */
    boolean fileExists(String key);

    /**
     * List files in a directory in S3
     *
     * @param prefix The directory prefix
     * @return List of object keys
     */
    List<String> listFiles(String prefix);
}