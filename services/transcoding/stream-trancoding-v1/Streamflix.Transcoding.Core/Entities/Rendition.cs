using Streamflix.Transcoding.Core.Models;
using System;

namespace Streamflix.Transcoding.Core.Entities;

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
