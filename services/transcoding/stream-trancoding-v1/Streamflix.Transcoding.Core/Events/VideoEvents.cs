namespace Streamflix.Transcoding.Core.Events;

public class VideoUploadedEvent
{
    public Guid VideoId { get; set; }
    public string InputPath { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public string ContentType { get; set; } = string.Empty;
    public string TenantId { get; set; } = string.Empty;
    public Dictionary<string, string> Metadata { get; set; } = new Dictionary<string, string>();
}

public class VideoTranscodedEvent
{
    public Guid VideoId { get; set; }
    public string ManifestPath { get; set; } = string.Empty;
    public DateTime CompletedAt { get; set; }
    public string TenantId { get; set; } = string.Empty;
    public List<RenditionInfo> Renditions { get; set; } = new List<RenditionInfo>();
    public Dictionary<string, string> TechnicalMetadata { get; set; } = new Dictionary<string, string>();
    public Dictionary<string, string> QualityMetrics { get; set; } = new Dictionary<string, string>();
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