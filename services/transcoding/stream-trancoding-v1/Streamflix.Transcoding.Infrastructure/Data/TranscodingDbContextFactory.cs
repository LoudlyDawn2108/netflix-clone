using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace Streamflix.Transcoding.Infrastructure.Data;

public class TranscodingDbContextFactory : IDesignTimeDbContextFactory<TranscodingDbContext>
{
    public TranscodingDbContext CreateDbContext(string[] args)
    {
        // Build configuration from appsettings.json in parent directories
        var configBuilder = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("appsettings.json", optional: true, reloadOnChange: true)
            .AddJsonFile("appsettings.Development.json", optional: true, reloadOnChange: true)
            .AddEnvironmentVariables();

        var config = configBuilder.Build();
        
        // Get connection string from configuration
        var connectionString = config.GetConnectionString("TranscodingDb") 
            ?? "Host=localhost;Database=streamflix_transcoding;Username=postgres;Password=postgres;Pooling=true;Maximum Pool Size=30";
            
        // Configure DbContext options
        var optionsBuilder = new DbContextOptionsBuilder<TranscodingDbContext>();
        optionsBuilder.UseNpgsql(connectionString, npgsqlOptions =>
        {
            npgsqlOptions.MigrationsHistoryTable("__EFMigrationsHistory", "transcoding");
        });
        
        return new TranscodingDbContext(optionsBuilder.Options);
    }
}
