using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Streamflix.Transcoding.Core.Interfaces;
using Streamflix.Transcoding.Infrastructure.Extensions;
using Streamflix.Transcoding.Infrastructure.Services;

namespace Streamflix.Transcoding.Infrastructure;

public static class InfrastructureServiceRegistration
{
    public static IServiceCollection AddInfrastructureServices(this IServiceCollection services, IConfiguration configuration)
    {
        // Add database services
        services.AddTranscodingDatabase(configuration);
        
        // Add S3 storage services
        services.AddS3Storage(configuration);
        
        // Add Redis distributed locking
        services.AddRedisServices(configuration);
        
        // Add FFmpeg services
        services.AddFFmpegServices(configuration);
          // Register the transcoding service
        services.Configure<TranscodingServiceOptions>(options => 
        {
            configuration.GetSection("TranscodingService").Bind(options);
        });
        services.AddScoped<ITranscodingService, TranscodingService>();
        
        return services;
    }
}
