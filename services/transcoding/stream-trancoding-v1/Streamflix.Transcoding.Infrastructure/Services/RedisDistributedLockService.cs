using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using StackExchange.Redis;
using Streamflix.Transcoding.Core.Interfaces;

namespace Streamflix.Transcoding.Infrastructure.Services;

public class RedisDistributedLockOptions
{
    public string ConnectionString { get; set; } = string.Empty;
    public int ConnectionPoolSize { get; set; } = 10;
    public string KeyPrefix { get; set; } = "streamflix:lock:";
    public int RetryCount { get; set; } = 3;
    public int RetryDelayMilliseconds { get; set; } = 200;
}

public class RedisDistributedLockService : IDistributedLockService
{
    private readonly IConnectionMultiplexer _redisConnection;
    private readonly IDatabase _redisDb;
    private readonly ILogger<RedisDistributedLockService> _logger;
    private readonly string _keyPrefix;
    private readonly int _retryCount;
    private readonly int _retryDelayMilliseconds;

    public RedisDistributedLockService(
        IOptions<RedisDistributedLockOptions> options,
        ILogger<RedisDistributedLockService> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        
        var lockOptions = options?.Value ?? throw new ArgumentNullException(nameof(options));
        
        if (string.IsNullOrEmpty(lockOptions.ConnectionString))
        {
            throw new ArgumentException("Redis connection string cannot be empty", nameof(lockOptions.ConnectionString));
        }
        
        _keyPrefix = lockOptions.KeyPrefix;
        _retryCount = lockOptions.RetryCount;
        _retryDelayMilliseconds = lockOptions.RetryDelayMilliseconds;
        
        // Configure Redis connection with connection pooling
        var configOptions = ConfigurationOptions.Parse(lockOptions.ConnectionString);
        configOptions.AbortOnConnectFail = false;
        configOptions.ConnectRetry = 3;
        configOptions.ConnectTimeout = 5000;
        configOptions.SyncTimeout = 5000;
        configOptions.ReconnectRetryPolicy = new ExponentialRetry(100);
        
        // Use explicit connection pool size (if available in this version of StackExchange.Redis)
        // Note: Removed the PoolSize configuration as it may not be available in all versions
        
        try
        {
            _redisConnection = ConnectionMultiplexer.Connect(configOptions);
            _redisDb = _redisConnection.GetDatabase();
            _logger.LogInformation("Connected to Redis server for distributed locking");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to connect to Redis server for distributed locking");
            throw;
        }
    }

    public async Task<bool> AcquireLockAsync(string key, TimeSpan expiry)
    {
        var fullKey = FormatKey(key);
        var value = Guid.NewGuid().ToString(); // Unique value for this lock instance
        
        _logger.LogDebug("Attempting to acquire lock for key {Key} with expiry {Expiry}", fullKey, expiry);
        
        // Try multiple times to acquire the lock with a delay between attempts
        for (int i = 0; i < _retryCount; i++)
        {
            if (i > 0)
            {
                await Task.Delay(_retryDelayMilliseconds);
            }
            
            // SetNX (SET if Not eXists) is the Redis command for acquiring a lock
            // It only sets the value if the key doesn't already exist
            bool acquired = await _redisDb.StringSetAsync(fullKey, value, expiry, When.NotExists);
            
            if (acquired)
            {
                _logger.LogInformation("Successfully acquired lock for key {Key}", fullKey);
                return true;
            }
            
            _logger.LogDebug("Failed to acquire lock for key {Key} on attempt {Attempt}", fullKey, i + 1);
        }
        
        _logger.LogWarning("Failed to acquire lock for key {Key} after {RetryCount} attempts", fullKey, _retryCount);
        return false;
    }

    public async Task<bool> ReleaseLockAsync(string key)
    {
        var fullKey = FormatKey(key);
        
        try
        {
            bool released = await _redisDb.KeyDeleteAsync(fullKey);
            
            if (released)
            {
                _logger.LogInformation("Successfully released lock for key {Key}", fullKey);
            }
            else
            {
                _logger.LogWarning("Failed to release lock for key {Key}, the lock may have expired", fullKey);
            }
            
            return released;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error releasing lock for key {Key}", fullKey);
            return false;
        }
    }

    public async Task<bool> ExtendLockAsync(string key, TimeSpan expiry)
    {
        var fullKey = FormatKey(key);
        
        try
        {
            // Check if the lock exists first
            if (!await LockExistsAsync(key))
            {
                _logger.LogWarning("Cannot extend non-existent lock for key {Key}", fullKey);
                return false;
            }
            
            // Extend the expiration time
            bool extended = await _redisDb.KeyExpireAsync(fullKey, expiry);
            
            if (extended)
            {
                _logger.LogInformation("Successfully extended lock for key {Key} with expiry {Expiry}", fullKey, expiry);
            }
            else
            {
                _logger.LogWarning("Failed to extend lock for key {Key}", fullKey);
            }
            
            return extended;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error extending lock for key {Key}", fullKey);
            return false;
        }
    }

    public async Task<bool> LockExistsAsync(string key)
    {
        var fullKey = FormatKey(key);
        
        try
        {
            return await _redisDb.KeyExistsAsync(fullKey);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking existence of lock for key {Key}", fullKey);
            return false;
        }
    }
    
    private string FormatKey(string key)
    {
        // Ensure consistent key format with prefix
        return $"{_keyPrefix}{key}";
    }

    public async ValueTask DisposeAsync()
    {
        try
        {
            if (_redisConnection != null)
            {
                await _redisConnection.CloseAsync();
                _redisConnection.Dispose();
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error disposing Redis connection");
        }
    }
}
