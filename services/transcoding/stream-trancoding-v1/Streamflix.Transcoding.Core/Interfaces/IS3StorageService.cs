namespace Streamflix.Transcoding.Core.Interfaces;

public interface IS3StorageService
{
    Task<bool> UploadFileAsync(string filePath, string targetKey, string contentType, IDictionary<string, string>? metadata = null);
    Task<string> DownloadFileAsync(string sourceKey, string destinationPath);
    Task<bool> FileExistsAsync(string key);
    Task<string> GeneratePresignedUrlAsync(string key, TimeSpan expiration);
    Task<bool> DeleteFileAsync(string key);
    Task<IDictionary<string, string>> GetMetadataAsync(string key);
    string GetBucketName();
}