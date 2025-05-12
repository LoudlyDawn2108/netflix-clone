using System.Text.Json.Serialization;

namespace Streamflix.Transcoding.API.Models;

public class TranscodingJobResponse
{
    public Guid Id { get; set; }
    public Guid VideoId { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string? ErrorMessage { get; set; }
    public int Attempts { get; set; }
    public string? TenantId { get; set; }
}

public class TranscodingJobDetailResponse : TranscodingJobResponse
{
    public string InputPath { get; set; } = string.Empty;
    public string OutputBasePath { get; set; } = string.Empty;
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