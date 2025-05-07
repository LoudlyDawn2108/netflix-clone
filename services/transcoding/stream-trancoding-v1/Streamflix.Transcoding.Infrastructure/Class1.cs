using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Streamflix.Transcoding.Infrastructure.Extensions;

namespace Streamflix.Transcoding.Infrastructure;

public static class InfrastructureServiceRegistration
{
    /// <summary>
    /// Registers all infrastructure services with the dependency injection container
    /// </summary>
    public static IServiceCollection AddInfrastructureServices(this IServiceCollection services, IConfiguration configuration)
    {
        // Register database and repository
        services.AddTranscodingDatabase(configuration);
        
        // Register storage services
        services.AddS3Storage(configuration);
        
        // Register distributed locking
        services.AddDistributedLocking(configuration);
        
        return services;
    }
}
