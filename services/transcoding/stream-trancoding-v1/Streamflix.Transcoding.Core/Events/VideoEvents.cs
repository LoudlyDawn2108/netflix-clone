namespace Streamflix.Transcoding.Core.Events;

public class VideoProcessingFailedEvent
{
    public Guid VideoId { get; set; }
    public string ErrorMessage { get; set; } = string.Empty;
    public string ExceptionType { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public string TenantId { get; set; } = string.Empty;
    public Dictionary<string, string> DiagnosticInfo { get; set; } = new Dictionary<string, string>();
}

public class RenditionInfo
{
    public string Resolution { get; set; } = string.Empty;
    public int Width { get; set; }
    public int Height { get; set; }
    public int Bitrate { get; set; }
    public string Codec { get; set; } = string.Empty;
    public string Path { get; set; } = string.Empty;
}

public class VideoUploaded
{
    public Guid VideoId { get; set; }
    public string FilePath { get; set; } = null!;
    public string TenantId { get; set; } = null!;
}

public class VideoTranscoded
{
    public Guid JobId { get; set; }
    public Guid VideoId { get; set; }
    public string TenantId { get; set; } = null!;
    public bool Success { get; set; }
    public string? ManifestUrl { get; set; }
    public List<string>? ErrorMessages { get; set; }
    public DateTimeOffset TranscodingStartedAt { get; set; }
    public DateTimeOffset TranscodingCompletedAt { get; set; }
    public Dictionary<string, string>? OutputDetails { get; set; } // e.g., resolution, bitrate, S3 path
}
