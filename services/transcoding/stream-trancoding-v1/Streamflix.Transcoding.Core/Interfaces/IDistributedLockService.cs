namespace Streamflix.Transcoding.Core.Interfaces;

public interface IDistributedLockService : IAsyncDisposable
{
    /// <summary>
    /// Tries to acquire a distributed lock
    /// </summary>
    /// <param name="key">The lock key</param>
    /// <param name="expiry">The lock expiration time</param>
    /// <returns>True if lock was acquired, false otherwise</returns>
    Task<bool> AcquireLockAsync(string key, TimeSpan expiry);
    
    /// <summary>
    /// Releases a previously acquired lock
    /// </summary>
    /// <param name="key">The lock key to release</param>
    /// <returns>True if the lock was released, false otherwise</returns>
    Task<bool> ReleaseLockAsync(string key);
    
    /// <summary>
    /// Extends the expiration time of an existing lock
    /// </summary>
    /// <param name="key">The lock key to extend</param>
    /// <param name="expiry">New expiration time</param>
    /// <returns>True if the lock was extended, false if the lock does not exist</returns>
    Task<bool> ExtendLockAsync(string key, TimeSpan expiry);
    
    /// <summary>
    /// Checks if a lock exists
    /// </summary>
    /// <param name="key">The lock key to check</param>
    /// <returns>True if the lock exists, false otherwise</returns>
    Task<bool> LockExistsAsync(string key);
}
