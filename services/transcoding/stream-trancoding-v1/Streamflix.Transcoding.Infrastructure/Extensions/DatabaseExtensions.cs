using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Streamflix.Transcoding.Core.Interfaces;
using Streamflix.Transcoding.Infrastructure.Data;

namespace Streamflix.Transcoding.Infrastructure.Extensions;

public static class DatabaseExtensions
{
    public static IServiceCollection AddTranscodingDatabase(this IServiceCollection services, IConfiguration configuration)
    {
        // Get the connection string from configuration
        var connectionString = configuration.GetConnectionString("TranscodingDb") 
            ?? throw new InvalidOperationException("Connection string 'TranscodingDb' not found.");
        
        // Add database context with PostgreSQL provider
        services.AddDbContext<TranscodingDbContext>(options =>
        {
            options.UseNpgsql(connectionString, npgsqlOptions =>
            {
                // Configure connection resiliency
                npgsqlOptions.EnableRetryOnFailure(
                    maxRetryCount: 5,
                    maxRetryDelay: TimeSpan.FromSeconds(30),
                    errorCodesToAdd: null);
                
                // Set up migration history table with schema
                npgsqlOptions.MigrationsHistoryTable("__EFMigrationsHistory", "transcoding");
            })
            .UseQueryTrackingBehavior(QueryTrackingBehavior.NoTrackingWithIdentityResolution)
            .EnableDetailedErrors()
            .EnableSensitiveDataLogging(configuration.GetSection("DatabaseOptions").GetValue<bool>("EnableSensitiveDataLogging"));
        });
        
        // Register the repository
        services.AddScoped<ITranscodingRepository, TranscodingRepository>();
        
        return services;
    }
}
