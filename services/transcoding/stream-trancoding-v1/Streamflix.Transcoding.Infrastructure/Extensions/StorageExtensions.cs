using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Streamflix.Transcoding.Core.Interfaces;
using Streamflix.Transcoding.Infrastructure.Services;

namespace Streamflix.Transcoding.Infrastructure.Extensions;

public static class StorageExtensions
{
    public static IServiceCollection AddS3Storage(this IServiceCollection services, IConfiguration configuration)
    {
        // Register S3 storage configuration
        services.Configure<S3StorageOptions>(options => 
            configuration.GetSection("S3Storage").Bind(options));
        
        // Register S3 storage service
        services.AddSingleton<IS3StorageService, S3StorageService>();
        
        return services;
    }
    
    public static IServiceCollection AddDistributedLocking(this IServiceCollection services, IConfiguration configuration)
    {
        // Register Redis distributed lock configuration
        services.Configure<RedisDistributedLockOptions>(options => 
            configuration.GetSection("Redis:DistributedLock").Bind(options));
        
        // Register distributed lock service
        services.AddSingleton<IDistributedLockService, RedisDistributedLockService>();
        
        return services;
    }
}
