using System.Text.Json.Serialization;

namespace Streamflix.Transcoding.API.Models;

public class TranscodingJobResponse
{
    public Guid Id { get; set; }
    public Guid VideoId { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string? ErrorMessage { get; set; }
    public int RetryCount { get; set; }
    public string TenantId { get; set; } = string.Empty;
    public string? OutputManifestS3Path { get; set; }
}

public class TranscodingJobDetailResponse : TranscodingJobResponse
{
    public string InputFileS3Path { get; set; } = string.Empty;
    public string? OutputManifestS3Path { get; set; }
    public List<RenditionResponse> Renditions { get; set; } = new List<RenditionResponse>();
}

public class RenditionResponse
{
    public Guid Id { get; set; }
    public string Resolution { get; set; } = string.Empty;
    public int Bitrate { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime? CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string OutputPath { get; set; } = string.Empty;
}

public class JobStatistics
{
    public int TotalJobs { get; set; }
    public int PendingJobs { get; set; }
    public int ProcessingJobs { get; set; }
    public int CompletedJobs { get; set; }
    public int FailedJobs { get; set; }
}
