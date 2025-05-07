using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using StackExchange.Redis;

namespace Streamflix.Transcoding.Infrastructure.Services;

public class RedisHealthCheck : IHealthCheck
{
    private readonly RedisDistributedLockOptions _options;
    private readonly ILogger<RedisHealthCheck> _logger;

    public RedisHealthCheck(
        IOptions<RedisDistributedLockOptions> options, 
        ILogger<RedisHealthCheck> logger)
    {
        _options = options.Value ?? throw new ArgumentNullException(nameof(options));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        try
        {
            if (string.IsNullOrEmpty(_options.ConnectionString))
            {
                return HealthCheckResult.Degraded("Redis connection string is not configured");
            }

            var configOptions = ConfigurationOptions.Parse(_options.ConnectionString);
            configOptions.AbortOnConnectFail = false;
            configOptions.ConnectTimeout = 2000; // Short timeout for health check

            using var connection = await ConnectionMultiplexer.ConnectAsync(configOptions);
            var database = connection.GetDatabase();
            
            // Simple ping test
            var pingResult = await database.PingAsync();
            
            if (pingResult.TotalMilliseconds > 200)
            {
                return HealthCheckResult.Degraded($"Redis ping took {pingResult.TotalMilliseconds}ms which is over the 200ms threshold");
            }
            
            return HealthCheckResult.Healthy($"Redis ping took {pingResult.TotalMilliseconds}ms");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Redis health check failed");
            return HealthCheckResult.Unhealthy("Could not connect to Redis", ex);
        }
    }
}