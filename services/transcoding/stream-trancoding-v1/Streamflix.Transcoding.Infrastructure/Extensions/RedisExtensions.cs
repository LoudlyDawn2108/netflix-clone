using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Streamflix.Transcoding.Core.Interfaces;
using Streamflix.Transcoding.Infrastructure.Services;

namespace Streamflix.Transcoding.Infrastructure.Extensions;

public static class RedisExtensions
{
    public static IServiceCollection AddRedisServices(this IServiceCollection services, IConfiguration configuration)
    {
        // Register Redis distributed lock options
        services.Configure<RedisDistributedLockOptions>(configuration.GetSection("Redis"));
        
        // Register Redis distributed lock service
        services.AddSingleton<IDistributedLockService, RedisDistributedLockService>();
        
        // Register Redis health check
        services.AddHealthChecks()
            .AddCheck<RedisHealthCheck>(
                name: "redis", 
                failureStatus: HealthStatus.Degraded, 
                tags: new[] { "ready", "redis" });
        
        return services;
    }
}
