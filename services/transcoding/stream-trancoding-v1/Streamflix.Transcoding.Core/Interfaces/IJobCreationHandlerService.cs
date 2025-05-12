using Streamflix.Transcoding.Core.Events;
using System.Threading.Tasks;

namespace Streamflix.Transcoding.Core.Interfaces
{
    public interface IJobCreationHandlerService
    {
        Task HandleVideoUploadedAsync(VideoUploaded videoUploadedEvent);
    }
}
