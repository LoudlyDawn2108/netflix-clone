using MassTransit;
using Microsoft.EntityFrameworkCore;
using Streamflix.Transcoding.Infrastructure;
using Streamflix.Transcoding.Infrastructure.Data;
using Streamflix.Transcoding.Infrastructure.Services;
using Streamflix.Transcoding.Worker;
using Streamflix.Transcoding.Worker.Consumers;
using Streamflix.Transcoding.Worker.Handlers;

var builder = Host.CreateApplicationBuilder(args);

// Add services to the container
builder.Services.AddInfrastructureServices(builder.Configuration);

// Configure MassTransit with Kafka
builder.Services.AddMassTransit(x =>
{
    // Configure Kafka
    x.UsingKafka((context, cfg) =>
    {
        cfg.Host(builder.Configuration.GetSection("Kafka:BootstrapServers").Value);

        // Configure consumer endpoints
        cfg.ConfigureConsumer<VideoUploadedConsumer>(context);

        // Configure VideoUploaded topic
        cfg.TopicEndpoint<VideoUploadedEvent>(
            "video-service.video-uploaded",
            "transcoding-service-consumer-group",
            e =>
            {
                e.ConfigureConsumer<VideoUploadedConsumer>(context);
                
                // Configure retry policy
                e.UseMessageRetry(r => r.Intervals(
                    TimeSpan.FromSeconds(1),
                    TimeSpan.FromSeconds(5),
                    TimeSpan.FromSeconds(15)));
            });
    });

    // Register all consumers
    x.AddConsumer<VideoUploadedConsumer>();
});

// Configure TranscodingService options
builder.Services.Configure<TranscodingServiceOptions>(
    builder.Configuration.GetSection("TranscodingService"));

// Add background services
builder.Services.AddHostedService<JobCompletionHandler>();

// Add health checks
builder.Services.AddHealthChecks()
    .AddDbContextCheck<TranscodingDbContext>()
    .AddKafka(
        kafkaSettings => builder.Configuration.GetSection("Kafka").Bind(kafkaSettings),
        name: "kafka");

var host = builder.Build();
host.Run();
