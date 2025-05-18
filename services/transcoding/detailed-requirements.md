# Detailed Requirements Specification for Transcoding Service

This document provides detailed requirements for each component of the Streamflix Transcoding Service, ensuring your AI assistant can implement the service with high quality and completeness.

## System Architecture Requirements

### Service Architecture

- Implement as a .NET 8 Worker Service with hosted background services
- Follow clean architecture principles with clear separation of concerns
- Use dependency injection throughout the application
- Implement health checks for all external dependencies
- Create a modular design that allows for easy extension and maintenance

### API Requirements

- Create RESTful API endpoints following OpenAPI/Swagger standards
- Implement proper versioning (e.g., /api/v1/...)
- Support pagination, filtering, and sorting for list operations
- Return appropriate HTTP status codes with descriptive error messages
- Include CORS configuration for API endpoints

## Database Requirements

### PostgreSQL Schema

- Create `TranscodingJobs` table with the following fields:

  - `Id` (UUID): Primary key for job tracking
  - `TenantId` (UUID): For multi-tenant support
  - `VideoId` (UUID): References the source video
  - `Status` (Enum): PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED
  - `InputPath` (String): S3 path to master video
  - `OutputBasePath` (String): S3 base path for renditions
  - `CreatedAt` (DateTime): Job creation timestamp
  - `UpdatedAt` (DateTime): Last status update timestamp
  - `CompletedAt` (DateTime, nullable): Job completion timestamp
  - `ErrorDetails` (String, nullable): Error information if failed
  - `Priority` (Int): Job priority for processing order
  - `RetryCount` (Int): Number of retry attempts
  - `RequestId` (String): For idempotency check
  - `Metadata` (JSONB): Additional job metadata

- Create `TranscodingRenditions` table with the following fields:
  - `Id` (UUID): Primary key
  - `JobId` (UUID): Foreign key to TranscodingJobs
  - `Resolution` (String): Resolution (e.g., "1920x1080")
  - `Bitrate` (Int): Target bitrate in kbps
  - `Format` (String): Output format (e.g., "mp4")
  - `Status` (Enum): PENDING, PROCESSING, COMPLETED, FAILED
  - `OutputPath` (String): S3 path to rendition
  - `Duration` (Float): Duration in seconds
  - `FileSize` (Long): File size in bytes
  - `QualityMetrics` (JSONB): Quality assessment data

### Entity Framework Configuration

- Configure PostgreSQL provider with appropriate connection string
- Set max connection pool size to 30
- Use code-first approach with migrations
- Configure appropriate indexes for frequent query patterns
- Implement soft delete pattern where appropriate
- Use EF Core batching for bulk operations

## Messaging Requirements

### Kafka Integration

- Use MassTransit as the messaging framework
- Configure consumer for `video-service.video-uploaded` topic
- Configure producer for `transcoding-service.video-transcoded` topic
- Implement dead letter queue for failed messages
- Use appropriate serialization format (JSON) with case conventions matching Java services

### Message Schemas

- `VideoUploaded` event schema:

  ```json
  {
    "videoId": "UUID",
    "tenantId": "UUID",
    "s3Path": "String",
    "filename": "String",
    "fileSize": "Long",
    "mimeType": "String",
    "metadata": {
      "duration": "Float",
      "originalResolution": "String",
      "hasAudio": "Boolean"
    },
    "requestId": "String",
    "timestamp": "DateTime"
  }
  ```

- `VideoTranscoded` event schema:
  ```json
  {
    "videoId": "UUID",
    "tenantId": "UUID",
    "jobId": "UUID",
    "status": "String",
    "manifestUrls": {
      "hls": "String",
      "dash": "String"
    },
    "renditions": [
      {
        "resolution": "String",
        "bitrate": "Integer",
        "fileSize": "Long",
        "s3Path": "String"
      }
    ],
    "technicalMetadata": {
      "duration": "Float",
      "audioTracks": "Integer",
      "hasSubtitles": "Boolean"
    },
    "qualityMetrics": {
      "psnr": "Float",
      "vmaf": "Float"
    },
    "requestId": "String",
    "timestamp": "DateTime"
  }
  ```

## Transcoding Requirements

### FFmpeg Integration

- Use Xabe.FFmpeg library for FFmpeg integration
- Create wrapper service for FFmpeg operations
- Implement proper command-line safety and validation
- Configure FFmpeg path for both development and container environments
- Enable hardware acceleration when available

### Encoding Profiles

- Implement the following adaptive bitrate profiles:

  **SD Profile (540p)**

  - Resolution: 960x540
  - Video codec: H.264
  - Video bitrate: 1500 kbps
  - Audio codec: AAC
  - Audio bitrate: 128 kbps

  **HD Profile (720p)**

  - Resolution: 1280x720
  - Video codec: H.264
  - Video bitrate: 3000 kbps
  - Audio codec: AAC
  - Audio bitrate: 128 kbps

  **Full HD Profile (1080p)**

  - Resolution: 1920x1080
  - Video codec: H.264
  - Video bitrate: 5000 kbps
  - Audio codec: AAC
  - Audio bitrate: 192 kbps

  **UHD Profile (4K)**

  - Resolution: 3840x2160
  - Video codec: H.265/HEVC
  - Video bitrate: 15000 kbps
  - Audio codec: AAC
  - Audio bitrate: 192 kbps

### Manifest Generation

- Generate HLS manifests (index.m3u8) with proper segment durations (6 seconds)
- Generate DASH manifests (manifest.mpd) with proper segment durations
- Include proper codec and bitrate signaling in manifests
- Support DRM signaling in manifests (Widevine and PlayReady)
- Use standardized naming convention for segments

## Storage Requirements

### S3 Integration

- Use AWSSDK.S3 for integration with S3-compatible storage
- Implement TransferUtility for large file uploads
- Use multipart uploads for files larger than 100 MB
- Implement proper error handling and retry logic
- Set appropriate content types and metadata

### File Organization

- Organize files using the following path structure:
  ```
  {bucket}/{tenant-id}/{video-id}/
    master/
      original.{ext}
    renditions/
      {resolution}/
        segment_{sequence}.ts
    manifests/
      hls/
        master.m3u8
        {resolution}.m3u8
      dash/
        manifest.mpd
    thumbnails/
      poster.jpg
      thumbnail_{n}.jpg
  ```

## Authentication and Security Requirements

### JWT Authentication

- Implement JWT validation matching Video Management Service
- Extract tenant ID from JWT for multi-tenant operations
- Configure appropriate token lifetime and refresh mechanism
- Implement proper role-based authorization
- Use secure JWT storage and handling

### S3 Security

- Use IAM roles for S3 access where possible
- Use pre-signed URLs for temporary access
- Implement least privilege principle for S3 operations
- Configure proper bucket policies and ACLs

## Observability Requirements

### Logging

- Use Serilog for structured logging
- Configure console and file sinks for development
- Configure Elastic sink for production
- Include correlation IDs in all logs
- Log appropriate levels (Debug, Info, Warning, Error)

### Metrics

- Use OpenTelemetry for metrics collection
- Export metrics to Prometheus
- Implement custom metrics:
  - Job processing time
  - Transcoding throughput (MB/s)
  - Queue depth
  - Error rate
  - Resource utilization

### Tracing

- Use OpenTelemetry for distributed tracing
- Configure Jaeger or Zipkin exporter
- Include trace context in messages
- Trace external calls (S3, PostgreSQL, Redis)
- Set appropriate sampling rate

## Deployment Requirements

### Docker Configuration

- Create multi-stage Dockerfile
- Use Alpine-based images where possible
- Configure proper health checks
- Set appropriate resource limits
- Include FFmpeg installation in container

### Kubernetes Configuration

- Create deployment manifests with appropriate resource requests/limits
- Configure horizontal pod autoscaling
- Create ConfigMaps for configuration
- Create Secrets for sensitive information
- Configure appropriate liveness and readiness probes

## Testing Requirements

### Unit Tests

- Implement xUnit or NUnit tests for all services
- Use mock frameworks (Moq) for external dependencies
- Achieve at least 80% code coverage
- Test error handling and edge cases
- Use test fixtures for common test scenarios

### Integration Tests

- Use TestContainers for PostgreSQL testing
- Use LocalStack for S3 testing
- Create test consumers for message testing
- Implement end-to-end test scenarios
- Test with various video formats and sizes

By following these detailed specifications, your AI agent will be able to implement a fully featured Transcoding Service that meets all the requirements outlined in the README.
