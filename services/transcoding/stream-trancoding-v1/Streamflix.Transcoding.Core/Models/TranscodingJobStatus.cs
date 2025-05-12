namespace Streamflix.Transcoding.Core.Models;

public enum TranscodingJobStatus
{
    Received,
    Queued,
    Processing,
    Completed,
    Failed,
    Retrying,
    Cancelled,
    Notified     // Added: Job completion has been notified to other services
}
