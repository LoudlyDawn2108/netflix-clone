namespace Streamflix.Transcoding.Core.Entities;

public class TranscodingJob
{
    public Guid Id { get; set; }
    public Guid VideoId { get; set; }
    public string InputPath { get; set; } = string.Empty;
    public string OutputBasePath { get; set; } = string.Empty;
    public JobStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string? ErrorMessage { get; set; }
    public int Attempts { get; set; }
    public string? TenantId { get; set; }
    public List<Rendition> Renditions { get; set; } = new List<Rendition>();
}

public class Rendition
{
    public Guid Id { get; set; }
    public Guid TranscodingJobId { get; set; }
    public TranscodingJob? TranscodingJob { get; set; }
    public string Resolution { get; set; } = string.Empty;
    public int Bitrate { get; set; }
    public string OutputPath { get; set; } = string.Empty;
    public RenditionStatus Status { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
}

public enum JobStatus
{
    Pending,
    Processing,
    Completed,
    Failed
}

public enum RenditionStatus
{
    Pending,
    Processing,
    Completed,
    Failed
}
