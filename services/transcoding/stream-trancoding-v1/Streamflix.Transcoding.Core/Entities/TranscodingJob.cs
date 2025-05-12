using Streamflix.Transcoding.Core.Models;
using System;
using System.Collections.Generic;

namespace Streamflix.Transcoding.Core.Entities 
{
    public class TranscodingJob
    {
        public Guid Id { get; set; }
        public Guid VideoId { get; set; }
        public string TenantId { get; set; } = null!;
        public string InputFileS3Path { get; set; } = null!;
        public TranscodingJobStatus Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public string? OutputManifestS3Path { get; set; }
        public string? ErrorMessage { get; set; }
        public int RetryCount { get; set; }
        
        // Navigation property for Renditions
        public ICollection<Rendition> Renditions { get; set; } = new List<Rendition>();
    }
}
