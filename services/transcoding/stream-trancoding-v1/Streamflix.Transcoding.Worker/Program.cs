using MassTransit;
using Microsoft.EntityFrameworkCore;
using Polly;
using Polly.Extensions.Http;
using Streamflix.Transcoding.Core.Events;
using Streamflix.Transcoding.Core.Interfaces;
using Streamflix.Transcoding.Infrastructure;
using Streamflix.Transcoding.Infrastructure.Data;
using Streamflix.Transcoding.Infrastructure.Services;
using Streamflix.Transcoding.Worker;
using Streamflix.Transcoding.Worker.Consumers;
using Streamflix.Transcoding.Worker.Handlers;
using System.Net;
using Microsoft.Extensions.DependencyInjection;

var builder = Host.CreateApplicationBuilder(args);

// Add services to the container
builder.Services.AddInfrastructureServices(builder.Configuration);
builder.Services.AddScoped<IJobCreationHandlerService, JobCreationHandlerService>(); 

// Add HttpClient with manual retry policy instead of using AddPolicyHandler
builder.Services.AddHttpClient("S3Client")
    .ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler
    {
        // Configure handler properties as needed
    })
    .AddHttpMessageHandler(() => 
    {
        // Create and configure a DelegatingHandler that implements retry logic
        return new RetryHandler(GetRetryPolicy());
    });

// Configure MassTransit with Kafka
builder.Services.AddMassTransit(x =>
{
    x.SetKebabCaseEndpointNameFormatter();

    // Register Consumers
    x.AddConsumer<VideoUploadedConsumer>();
    x.AddConsumer<VideoProcessingFailedConsumer>();

    x.UsingInMemory((context, cfg) => 
    {
        cfg.ConfigureEndpoints(context);
    });

    // Configure Kafka Rider
    x.AddRider(rider =>
    {
        var kafkaConfig = builder.Configuration.GetSection("Kafka");
        var bootstrapServers = kafkaConfig.GetValue<string>("BootstrapServers");
        var videoUploadedTopic = kafkaConfig.GetValue<string>("Topics:VideoUploaded");
        var videoTranscodedTopic = kafkaConfig.GetValue<string>("Topics:VideoTranscoded");
        var consumerGroup = kafkaConfig.GetValue<string>("ConsumerGroup");

        rider.AddProducer<VideoTranscoded>(videoTranscodedTopic);

        rider.AddConsumer<VideoUploadedConsumer>(c =>
        {
            c.UseMessageRetry(r => r.Exponential(
                retryLimit: 3,
                minInterval: TimeSpan.FromSeconds(1),
                maxInterval: TimeSpan.FromSeconds(30),
                intervalDelta: TimeSpan.FromSeconds(5)));
        });

        rider.UsingKafka((context, k) =>
        {
            k.Host(bootstrapServers);
            k.TopicEndpoint<VideoUploaded>(videoUploadedTopic, consumerGroup, e =>
            {
                e.ConfigureConsumer<VideoUploadedConsumer>(context);
                e.UseMessageRetry(r => r.Exponential(3, TimeSpan.FromSeconds(1), TimeSpan.FromSeconds(30), TimeSpan.FromSeconds(5)));
            });
        });
    });
});

// Configure TranscodingService options
builder.Services.Configure<TranscodingServiceOptions>(
    builder.Configuration.GetSection("TranscodingService"));

// Add background services
builder.Services.AddHostedService<JobCompletionHandler>();
builder.Services.AddHostedService<JobCreationHandler>();

// Add health checks
builder.Services.AddHealthChecks()
    .AddDbContextCheck<TranscodingDbContext>();

var host = builder.Build();
host.Run();

// Polly Retry Policy for HTTP requests
static IAsyncPolicy<HttpResponseMessage> GetRetryPolicy()
{
    return HttpPolicyExtensions
        .HandleTransientHttpError()
        .OrResult(msg => msg.StatusCode == HttpStatusCode.NotFound)
        .WaitAndRetryAsync(
            3,
            retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)),
            onRetry: (outcome, timespan, retryAttempt, context) =>
            {
                Console.WriteLine($"Delaying for {timespan.TotalSeconds} seconds, then making retry {retryAttempt}");
            });
}

// Custom DelegatingHandler that implements retry logic
public class RetryHandler : DelegatingHandler
{
    private readonly IAsyncPolicy<HttpResponseMessage> _retryPolicy;

    public RetryHandler(IAsyncPolicy<HttpResponseMessage> retryPolicy)
    {
        _retryPolicy = retryPolicy;
    }

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        return await _retryPolicy.ExecuteAsync(async () =>
        {
            return await base.SendAsync(request, cancellationToken);
        });
    }
}
