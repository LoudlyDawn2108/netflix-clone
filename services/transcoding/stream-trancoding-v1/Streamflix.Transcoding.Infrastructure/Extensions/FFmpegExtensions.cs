using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Streamflix.Transcoding.Core.Interfaces;
using Streamflix.Transcoding.Infrastructure.Services;

namespace Streamflix.Transcoding.Infrastructure.Extensions;

public static class FFmpegExtensions
{    public static IServiceCollection AddFFmpegServices(this IServiceCollection services, IConfiguration configuration)
    {
        // Register FFmpeg options from configuration
        services.Configure<FFmpegOptions>(options =>
        {
            configuration.GetSection("FFmpeg").Bind(options);
        });
        
        // Register FFmpeg service
        services.AddSingleton<FFmpegService>();
        
        // Register FFmpeg transcoder
        services.AddSingleton<FFmpegTranscoder>();
        
        return services;
    }
}
