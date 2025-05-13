using System.Net;
using Amazon;
using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using Amazon.S3.Transfer;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Polly;
using Polly.Retry;
using Streamflix.Transcoding.Core.Interfaces;

namespace Streamflix.Transcoding.Infrastructure.Services;

public class S3StorageOptions
{
    public string BucketName { get; set; } = string.Empty;
    public string Region { get; set; } = string.Empty;
    public string AccessKey { get; set; } = string.Empty;
    public string SecretKey { get; set; } = string.Empty;
    public string ServiceUrl { get; set; } = string.Empty;
    public bool ForcePathStyle { get; set; } = true;
}

public class S3StorageService : IS3StorageService, IDisposable
{
    private readonly IAmazonS3 _s3Client;
    private readonly string _bucketName;
    private readonly ILogger<S3StorageService> _logger;
    private readonly AsyncRetryPolicy _retryPolicy;

    public S3StorageService(IOptions<S3StorageOptions> options, ILogger<S3StorageService> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        
        var s3Options = options?.Value ?? throw new ArgumentNullException(nameof(options));
        _bucketName = s3Options.BucketName ?? throw new ArgumentNullException(nameof(s3Options.BucketName));
        
        // Configure S3 client
        var s3Config = new AmazonS3Config
        {
            ForcePathStyle = s3Options.ForcePathStyle
        };
        
        if (!string.IsNullOrEmpty(s3Options.Region))
        {
            s3Config.RegionEndpoint = RegionEndpoint.GetBySystemName(s3Options.Region);
        }
        
        if (!string.IsNullOrEmpty(s3Options.ServiceUrl))
        {
            s3Config.ServiceURL = s3Options.ServiceUrl;
        }
        
        // Create S3 client with credentials if provided, otherwise use instance profile
        if (!string.IsNullOrEmpty(s3Options.AccessKey) && !string.IsNullOrEmpty(s3Options.SecretKey))
        {
            var credentials = new BasicAWSCredentials(s3Options.AccessKey, s3Options.SecretKey);
            _s3Client = new AmazonS3Client(credentials, s3Config);
        }
        else
        {
            _s3Client = new AmazonS3Client(s3Config);
        }

        // Configure retry policy for transient errors
        _retryPolicy = Policy
            .Handle<AmazonS3Exception>(ex => 
                ex.StatusCode == HttpStatusCode.InternalServerError ||
                ex.StatusCode == HttpStatusCode.ServiceUnavailable ||
                ex.StatusCode == HttpStatusCode.RequestTimeout)
            .Or<WebException>()
            .WaitAndRetryAsync(
                3, // Retry 3 times
                retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)), // Exponential backoff
                (exception, timespan, retryCount, context) =>
                {
                    _logger.LogWarning(exception, 
                        "Error during S3 operation. Retrying in {RetryTimespan}ms. Attempt {RetryCount}/3", 
                        timespan.TotalMilliseconds, retryCount);
                }
            );
    }

    public async Task<bool> UploadFileAsync(string filePath, string targetKey, string contentType, IDictionary<string, string>? metadata = null)
    {
        try
        {
            _logger.LogInformation("Starting upload of {FilePath} to S3 bucket {BucketName}, key: {TargetKey}", 
                filePath, _bucketName, targetKey);

            return await _retryPolicy.ExecuteAsync(async () =>
            {
                // Configure TransferUtility for large file uploads
                using var transferUtility = new TransferUtility(_s3Client);
                var uploadRequest = new TransferUtilityUploadRequest
                {
                    FilePath = filePath,
                    BucketName = _bucketName,
                    Key = targetKey,
                    ContentType = contentType,
                    StorageClass = S3StorageClass.StandardInfrequentAccess // Use IA for cost optimization
                };

                // Add metadata if provided
                if (metadata != null)
                {
                    foreach (var item in metadata)
                    {
                        uploadRequest.Metadata.Add(item.Key, item.Value);
                    }
                }

                await transferUtility.UploadAsync(uploadRequest);
                _logger.LogInformation("Successfully uploaded {FilePath} to S3", filePath);
                return true;
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to upload file {FilePath} to S3", filePath);
            return false;
        }
    }

    public async Task<string> DownloadFileAsync(string sourceKey, string destinationPath)
    {
        try
        {
            _logger.LogInformation("Starting download from S3 bucket {BucketName}, key: {SourceKey} to {DestinationPath}", 
                _bucketName, sourceKey, destinationPath);
            
            // Ensure target directory exists
            var directory = Path.GetDirectoryName(destinationPath);
            if (!string.IsNullOrEmpty(directory))
            {
                Directory.CreateDirectory(directory);
            }

            await _retryPolicy.ExecuteAsync(async () =>
            {
                using var transferUtility = new TransferUtility(_s3Client);
                await transferUtility.DownloadAsync(
                    new TransferUtilityDownloadRequest
                    {
                        BucketName = _bucketName,
                        Key = sourceKey,
                        FilePath = destinationPath
                    });
            });

            _logger.LogInformation("Successfully downloaded {SourceKey} from S3", sourceKey);
            return destinationPath;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to download file {SourceKey} from S3", sourceKey);
            throw;
        }
    }

    public async Task<bool> FileExistsAsync(string key)
    {
        try
        {
            return await _retryPolicy.ExecuteAsync(async () =>
            {
                var request = new GetObjectMetadataRequest
                {
                    BucketName = _bucketName,
                    Key = key
                };

                try
                {
                    await _s3Client.GetObjectMetadataAsync(request);
                    return true;
                }
                catch (AmazonS3Exception ex) when (ex.StatusCode == HttpStatusCode.NotFound)
                {
                    return false;
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking if file exists in S3. Key: {Key}", key);
            return false;
        }
    }

    public async Task<string> GeneratePresignedUrlAsync(string key, TimeSpan expiration)
    {
        try
        {
            var request = new GetPreSignedUrlRequest
            {
                BucketName = _bucketName,
                Key = key,
                Expires = DateTime.UtcNow.Add(expiration),
                Verb = HttpVerb.GET
            };

            var url = await Task.Run(() => _s3Client.GetPreSignedURL(request));
            _logger.LogInformation("Generated presigned URL for {Key} with expiration {Expiration}", key, expiration);
            return url;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate presigned URL for {Key}", key);
            throw;
        }
    }

    public async Task<bool> DeleteFileAsync(string key)
    {
        try
        {
            return await _retryPolicy.ExecuteAsync(async () =>
            {
                var request = new DeleteObjectRequest
                {
                    BucketName = _bucketName,
                    Key = key
                };

                await _s3Client.DeleteObjectAsync(request);
                _logger.LogInformation("Successfully deleted object with key {Key} from S3", key);
                return true;
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete object with key {Key} from S3", key);
            return false;
        }
    }

    public async Task<IDictionary<string, string>> GetMetadataAsync(string key)
    {
        try
        {
            return await _retryPolicy.ExecuteAsync(async () =>
            {
                var request = new GetObjectMetadataRequest
                {
                    BucketName = _bucketName,
                    Key = key
                };

                var response = await _s3Client.GetObjectMetadataAsync(request);
                
                // Convert MetadataCollection to Dictionary
                var result = new Dictionary<string, string>();
                foreach (var item in response.Metadata.Keys)
                {
                    result[item] = response.Metadata[item];
                }
                return result;
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get metadata for object with key {Key} from S3", key);
            throw;
        }
    }

    public string GetBucketName() => _bucketName;

    public void Dispose()
    {
        _s3Client?.Dispose();
    }
}
