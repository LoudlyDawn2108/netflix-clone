# Streamflix Transcoding Service Implementation Framework

This document provides session-by-session instructions for building the Streamflix Transcoding Service. Each session contains 4 focused tasks with clear instructions and deliverables.

## Implementation Approach

-   Each session focuses on a specific area of functionality
-   Complete one session before moving to the next
-   Each session builds on the previous work
-   Reference the README.md for overall service requirements
-   **Always start each session by reading the system-context.md file to maintain awareness of the overall system**
-   Your implementation should intergrate nicely with the current code base

## Overall Conventions

To ensure consistency, maintainability, and collaboration, please adhere to the following conventions throughout the development process:

-   **Coding Style:**
    -   Follow the official [Microsoft C# Coding Conventions](https://docs.microsoft.com/en-us/dotnet/csharp/fundamentals/coding-style/coding-conventions).
    -   Use `async/await` for all I/O-bound operations to maintain responsiveness.
    -   Employ LINQ for data manipulation where it enhances readability and conciseness.
    -   Prefer expression-bodied members for simple, single-line methods and properties.
-   **Naming Conventions:**
    -   Use PascalCase for class names, method names, and properties.
    -   Use camelCase for local variables and method parameters.
    -   Prefix interfaces with `I` (e.g., `ITranscodingService`).
    -   Avoid abbreviations and use descriptive names.
-   **Error Handling:**
    -   Use exceptions for exceptional situations, not for control flow.
    -   Provide clear and informative error messages.
    -   Implement robust error handling and logging for all external service interactions.
    -   Utilize `try-catch-finally` blocks appropriately for resource cleanup.
-   **Logging:**
    -   Implement structured logging (e.g., using Serilog) for all significant events, errors, and diagnostic information.
    -   Include correlation IDs in logs to trace requests across services.
    -   Avoid logging sensitive information.
-   **Testing:**
    -   Write unit tests for all business logic in the Core project. Aim for high test coverage.
    -   Write integration tests for interactions between components (e.g., database, message queues, external APIs).
    -   Ensure all tests pass before committing code.
-   **Code Comments and Documentation:**
    -   Write clear and concise comments to explain complex logic or non-obvious decisions.
    -   Use XML documentation comments for all public APIs, classes, and methods.
    -   Keep comments and documentation up-to-date with code changes.
-   **Dependency Management:**
    -   Keep NuGet packages updated to their latest stable versions, unless there's a specific reason not to.
    -   Minimize dependencies in the Core project.
-   **Configuration:**
    -   Use the `IOptions` pattern for accessing configuration settings.
    -   Store sensitive configuration values securely (e.g., using user secrets in development, Azure Key Vault or similar in production).

## IMPORTANT RULE MUST CONFORM

-   When using any method or function please make sure that it exist before using and make sure that the parameter and argument are match if not please implement it or modify it appropriately with the code base

## Session Workflow

Before starting each session:

1. Read system-context.md to understand how the Transcoding Service fits in the broader architecture
2. Review README.md for specific requirements related to the current session
3. Check the tasks.md file to see how this session's work contributes to the overall implementation
4. Review your previous session's code to refresh your understanding

After completing each session:

1. Run build and all tests to ensure nothing was broken
2. Update the tasks.md file to mark completed items

## Session 1: Project Setup & Basic Structure

### Session Context

You are building a Transcoding Service for Streamflix, a cloud-native video streaming platform. This service will convert uploaded master video files into adaptive bitrate streaming formats for playback on various devices. Your task in this session is to set up the initial project structure following clean architecture principles.

**Objectives:**

-   Create a well-structured .NET 8 solution following clean architecture principles
-   Set up the basic domain models to represent transcoding jobs and renditions
-   Configure the initial project dependencies for all components
-   Establish a configuration system that supports different environments

### Instructions

1. Create a new .NET 8 Worker Service project with the following structure:

    - `Streamflix.Transcoding.API` - HTTP API endpoints and controllers
    - `Streamflix.Transcoding.Core` - Domain models, interfaces, and business logic
    - `Streamflix.Transcoding.Infrastructure` - External services, repositories, message handlers
    - `Streamflix.Transcoding.Worker` - Background service for processing jobs

2. Configure the initial dependencies in each project:

    - Core: minimal external dependencies
    - Infrastructure: Entity Framework Core, AWSSDK.S3, MassTransit, Xabe.FFmpeg
    - API: ASP.NET Core, Swagger, health check packages
    - Worker: Worker Service, MassTransit.Kafka

3. Create the basic domain models in Core project:

    - `TranscodingJob`: ID, VideoId, Status, CreatedAt, UpdatedAt, CompletedAt, FailureReason
    - `JobStatus` enum: Pending, Processing, Completed, Failed, Cancelled
    - `Rendition`: ID, JobId, Resolution, Bitrate, FileFormat, OutputPath
    - `VideoMetadata`: Duration, Resolution, Codec, Bitrate

4. Set up a basic configuration structure using ASP.NET Core's configuration providers:
    - Create appsettings.json with sections for Database, S3, Redis, Kafka
    - Add environment variable mapping
    - Configure options classes for each section

### Deliverables

-   Solution structure with all projects
-   Basic domain models with properties
-   NuGet packages referenced in each project
-   Configuration structure in appsettings.json

## Session 2: Database & Storage Setup

### Session Context

You are continuing work on the Streamflix Transcoding Service. You've already set up the basic project structure in Session 1. Now you need to implement the data persistence layer and storage access components.

**Objectives:**

-   Implement a reliable data persistence layer with PostgreSQL for tracking transcoding jobs
-   Create a secure and efficient S3 storage client for video file operations
-   Set up a distributed lock mechanism using Redis to ensure job processing idempotency
-   Build a robust repository pattern for job persistence and status tracking

### Instructions

1. Set up Entity Framework Core with PostgreSQL:

    - Create `TranscodingDbContext` with DbSets for jobs and renditions
    - Configure connection string with 30 max connections in pooling
    - Implement the `ITranscodingRepository` interface and its PostgreSQL implementation
    - Create initial EF Core migration for the database schema

2. Configure S3 storage client:

    - Create an `IS3StorageService` interface with methods for Upload, Download, and CheckExists
    - Implement the interface using AWSSDK.S3 with TransferUtility
    - Configure bucket names, prefixes, and credentials from configuration
    - Implement proper exception handling and logging

3. Set up Redis connection:

    - Create an `IDistributedLockService` interface for job locking
    - Implement Redis-based distributed lock mechanism
    - Configure connection pooling and retry policies
    - Add helper methods for acquiring and releasing locks

4. Create basic job persistence operations:
    - Implement methods to create, update, and query jobs
    - Add idempotency checks for job creation using job UUID
    - Create repository methods for transaction support
    - Implement job status tracking and updating

### Deliverables

-   Working database context with initial migration
-   S3 service implementation for file operations
-   Redis distributed lock implementation
-   Repository pattern for job persistence

## Session 3: Message Queue & Event Handling

### Session Context

You are building the Streamflix Transcoding Service. In previous sessions, you've set up the project structure and implemented data persistence. Now you need to implement the event handling system to receive and process video transcoding requests.

**Objectives:**

-   Establish reliable message handling for video processing events
-   Create the necessary event models for system integration
-   Implement idempotent job creation from incoming messages
-   Build resilient error handling with proper retry and failure management

### Instructions

1. Configure MassTransit with Kafka:

    - Set up MassTransit in the Worker project
    - Configure Kafka connection settings from configuration
    - Register consumers in dependency injection
    - Configure message retry policies (3 attempts with exponential backoff)

2. Create event models and handlers:

    - Define `VideoUploaded` event DTO with VideoId, FilePath, TenantId
    - Create `VideoTranscoded` event DTO with job results and manifest info
    - Implement consumer for `VideoUploaded` events
    - Add publisher for `VideoTranscoded` events

3. Implement job creation flow:

    - Create job handler service to process incoming video events
    - Add idempotency check against existing job UUIDs
    - Implement job creation logic with proper status tracking
    - Set up job queue for background processing

4. Set up dead-letter handling:
    - Configure error handling and message moving to dead-letter queue
    - Implement logging for failed message processing
    - Create retry mechanism with Polly
    - Set up error notification for critical failures

### Deliverables

-   Working MassTransit configuration with Kafka
-   Event models and consumers for message handling
-   Job creation flow with idempotency
-   Error handling and dead-letter queue

## Session 4: FFmpeg Integration & Basic Transcoding

### Session Context

You are implementing the Streamflix Transcoding Service. So far, you've set up the project structure, data persistence, and message handling. In this session, you'll implement the core video transcoding functionality using FFmpeg.

**Objectives:**

-   Integrate FFmpeg to enable high-quality video transcoding capabilities
-   Implement multiple rendition profiles to support various playback scenarios
-   Create standard-compliant streaming manifests for adaptive bitrate streaming
-   Develop a complete workflow for file processing from source to destination

### Instructions

1. Set up FFmpeg wrapper:

    - Configure Xabe.FFmpeg in the infrastructure project
    - Set up FFmpeg executable path in configuration
    - Create factory for FFmpeg conversion
    - Configure logging for FFmpeg operations

2. Implement basic transcoding service:

    - Create `ITranscodingService` interface with methods for different encoding profiles
    - Implement service using Xabe.FFmpeg
    - Support SD (480p) and HD (720p, 1080p) renditions
    - Configure appropriate codec settings for H.264

3. Create HLS/DASH manifest generation:

    - Implement logic to create HLS playlist (.m3u8) files
    - Implement DASH manifest (.mpd) generation
    - Set up segment duration and naming convention
    - Ensure compatibility with standard players

4. Set up file handling workflow:
    - Implement S3 download of source file
    - Create local working directory management
    - Implement logic to upload transcoded files and manifests
    - Add cleanup of temporary files

### Deliverables

-   Working FFmpeg integration for video transcoding
-   Implementation of multiple rendition profiles
-   HLS/DASH manifest generation
-   Complete file download/transcode/upload workflow

## Session 5: Background Processing & Job Management

### Session Context

You are building the Streamflix Transcoding Service. In previous sessions, you've implemented the core transcoding functionality. Now you need to create a robust background processing system to manage transcoding jobs.

**Objectives:**

-   Create a reliable background processing system for handling transcoding jobs
-   Implement concurrent processing to maximize resource utilization
-   Build a comprehensive job state management system
-   Develop resilient error handling and retry mechanisms

### Instructions

1. Create a hosted background service:

    - Implement `BackgroundService` in Worker project
    - Configure job polling interval from configuration
    - Set up graceful shutdown handling
    - Configure proper logging and metrics collection

2. Implement worker pipeline for job execution:

    - Create job processor with steps (download, transcode, upload, notify)
    - Set up concurrent job processing with limiting
    - Configure parallel processing of renditions using TPL Dataflow
    - Add job progress tracking and updates

3. Set up job state management:

    - Create state machine for job status transitions
    - Implement persistent job state in database
    - Add checkpointing for long-running jobs
    - Set up job history tracking

4. Implement retry and error handling:
    - Add job-level retry logic with configurable attempts
    - Implement step-level retries for specific failures
    - Create circuit breaker for external dependencies
    - Set up detailed error logging with context information

### Deliverables

-   Working background processing service
-   Concurrent job processing pipeline
-   State management for transcoding jobs
-   Comprehensive retry and error handling

## Session 6: API Development & Health Monitoring

### Session Context

You are implementing the Streamflix Transcoding Service. The core functionality and background processing are now in place. In this session, you'll add API endpoints for job management and health monitoring.

**Objectives:**

-   Expose RESTful APIs for job management and status reporting
-   Create comprehensive API documentation for service consumers
-   Implement health monitoring endpoints for infrastructure integration
-   Apply security best practices to protect API endpoints

### Instructions

1. Create REST API controllers:

    - Implement JobsController with CRUD operations
    - Add endpoints for job status and progress
    - Create endpoint for manual job submission
    - Implement paging and filtering for job listings

2. Set up OpenAPI/Swagger documentation:

    - Configure Swagger in API project
    - Add XML comments for API documentation
    - Set up API versioning
    - Configure proper response types and status codes

3. Implement health check endpoints:

    - Create health check for database connectivity
    - Add health check for S3 storage availability
    - Set up health check for Kafka connectivity
    - Configure health check UI and reporting

4. Add basic security for API:
    - Implement JWT token validation
    - Set up authorization policies
    - Configure CORS for web clients
    - Add rate limiting for API endpoints

### Deliverables

-   REST API endpoints for job management
-   OpenAPI/Swagger documentation
-   Health check endpoints for all dependencies
-   Basic API security implementation

## Session 7: Advanced Transcoding Features

### Session Context

You are enhancing the Streamflix Transcoding Service. The basic transcoding functionality is working, and now you need to implement advanced features to improve video quality and user experience.

**Objectives:**

-   Implement content-aware encoding to optimize video quality and bandwidth
-   Add DRM signaling to support content protection requirements
-   Create thumbnail generation for video preview capabilities
-   Support additional media features like subtitles and multiple audio tracks

### Instructions

1. Implement adaptive bitrate optimization:

    - Create logic to analyze source video characteristics
    - Implement content-aware encoding profiles
    - Set up bitrate ladder calculation based on content complexity
    - Configure quality-based encoding parameters

2. Add DRM signaling support:

    - Add configuration for DRM systems (PlayReady, Widevine, FairPlay)
    - Implement DRM signaling in HLS manifests
    - Add DRM signaling in DASH manifests
    - Create encryption key management service interfaces

3. Implement thumbnail generation:

    - Add logic to extract thumbnails at various timestamps
    - Configure thumbnail resolution and format
    - Implement sprite sheet generation for seek previews
    - Add thumbnail uploading to S3 with proper paths

4. Support additional media features:
    - Add subtitle extraction and processing
    - Implement audio track handling and normalization
    - Support multiple audio language tracks
    - Configure chapter marker handling

### Deliverables

-   Advanced encoding profiles with content adaptation
-   DRM signaling in manifests
-   Thumbnail generation and sprite sheets
-   Support for subtitles and multiple audio tracks

## Session 8: Multi-tenancy & Security

### Session Context

You are building the enterprise features of the Streamflix Transcoding Service. Now it's time to implement multi-tenancy support and enhance security for enterprise customers.

**Objectives:**

-   Implement complete tenant isolation for secure multi-tenant operations
-   Configure secure storage access following cloud security best practices
-   Enhance API security with proper authentication and authorization
-   Create tenant-specific configuration options for customized service delivery

### Instructions

1. Implement tenant isolation:

    - Add TenantId to all domain models
    - Implement tenant context middleware
    - Create tenant filtering for repository queries
    - Configure tenant-specific S3 paths

2. Set up secure S3 access:

    - Implement IAM role-based authentication
    - Configure temporary credential generation
    - Set up appropriate bucket policies
    - Implement signed URL generation for protected content

3. Enhance API security:

    - Add claim-based authorization
    - Implement tenant validation middleware
    - Create permission-based access control
    - Add security headers configuration

4. Implement tenant configuration:
    - Create tenant-specific encoding profiles
    - Set up tenant quotas and limits
    - Implement tenant-specific notification settings
    - Configure tenant activity logging

### Deliverables

-   Complete tenant isolation implementation
-   Secure S3 access configuration
-   Enhanced API security with claims-based auth
-   Tenant-specific configuration management

## Session 9: Performance Optimization

### Session Context

You are optimizing the Streamflix Transcoding Service for performance and scalability. The service is functional but needs tuning to handle enterprise-scale workloads efficiently.

**Objectives:**

-   Optimize database performance for high-throughput job processing
-   Enhance S3 operations for efficient large file handling
-   Maximize transcoding speed through FFmpeg optimization
-   Implement caching strategies to reduce system load and latency

### Instructions

1. Optimize database access:

    - Add appropriate indexes to job and rendition tables
    - Implement query optimization for frequent operations
    - Configure connection pooling settings
    - Set up database performance monitoring

2. Enhance S3 operations:

    - Implement parallel uploads for renditions
    - Configure optimal multipart upload settings
    - Add S3 transfer acceleration where appropriate
    - Optimize S3 path structure for performance

3. Optimize FFmpeg processing:

    - Configure hardware acceleration when available
    - Implement encoding preset selection based on content
    - Optimize thread count and memory usage
    - Set up performance benchmarking

4. Implement caching strategies:
    - Add Redis caching for job status queries
    - Implement in-memory caching for frequently accessed data
    - Configure cache invalidation policies
    - Add cache warming for predictable access patterns

### Deliverables

-   Database query optimization with proper indexes
-   Optimized S3 operations with parallel transfers
-   FFmpeg configuration for maximum performance
-   Comprehensive caching strategy

## Session 10: Observability & Monitoring

### Session Context

You are enhancing the Streamflix Transcoding Service with comprehensive observability features. This will ensure operational teams can effectively monitor and troubleshoot the service in production.

**Objectives:**

-   Implement structured logging for comprehensive operational visibility
-   Create metrics collection for performance monitoring and capacity planning
-   Set up distributed tracing for end-to-end request flow visualization
-   Configure alerting for proactive issue detection and resolution

### Instructions

1. Set up structured logging:

    - Configure Serilog with proper sinks
    - Implement correlation IDs across services
    - Add context enrichers for job and tenant info
    - Set up log level configuration

2. Implement metrics collection:

    - Configure OpenTelemetry for metrics
    - Add Prometheus exporter
    - Implement custom metrics for transcoding operations
    - Set up dashboard with transcoding statistics

3. Configure distributed tracing:

    - Set up OpenTelemetry for tracing
    - Configure Jaeger or Zipkin exporter
    - Implement trace context propagation
    - Add custom spans for critical operations

4. Create alert rules:
    - Set up alerts for job failures
    - Configure SLA monitoring
    - Implement resource utilization alerts
    - Add proactive notification for potential issues

### Deliverables

-   Comprehensive structured logging implementation
-   Metrics collection with custom transcoding metrics
-   Distributed tracing across service boundaries
-   Alert rules for critical conditions

## Session 11: Testing & CI/CD

### Session Context

You are implementing testing and continuous integration for the Streamflix Transcoding Service. This will ensure code quality and reliable deployments as the service evolves.

**Objectives:**

-   Create comprehensive test coverage for all service components
-   Implement integration testing with realistic infrastructure components
-   Set up continuous integration for automated quality checks
-   Build a reliable deployment pipeline for consistent releases

### Instructions

1. Implement unit tests:

    - Create tests for core domain logic
    - Add tests for service implementations
    - Implement mocks for external dependencies
    - Configure test runner and coverage reporting

2. Set up integration tests:

    - Implement tests with TestContainers for PostgreSQL
    - Add S3 integration tests with LocalStack
    - Set up Kafka testing with test containers
    - Create end-to-end test scenarios

3. Configure GitHub Actions:

    - Set up build workflow
    - Add test execution and coverage reporting
    - Configure container image building
    - Implement scanning for vulnerabilities

4. Create deployment pipeline:
    - Configure staging and production deployments
    - Implement database migration in pipeline
    - Set up blue-green deployment strategy
    - Add deployment verification steps

### Deliverables

-   Comprehensive unit test suite
-   Integration tests with containerized dependencies
-   GitHub Actions workflow for CI
-   Complete deployment pipeline for staging and production

## Session 12: Kubernetes Deployment

### Session Context

You are preparing the Streamflix Transcoding Service for deployment in a Kubernetes environment. This will enable scalable, resilient operation in a cloud-native infrastructure.

**Objectives:**

-   Create Kubernetes deployment configurations for reliable service operation
-   Implement auto-scaling to handle variable workloads efficiently
-   Set up secure configuration management for service settings
-   Configure health monitoring for automated recovery and maintenance

### Instructions

1. Create Kubernetes manifests:

    - Implement deployment YAML for worker and API
    - Configure service definitions
    - Set up ingress for API access
    - Add resource requests and limits

2. Configure scaling:

    - Implement Horizontal Pod Autoscaling
    - Set up scaling based on queue metrics
    - Configure min/max replicas
    - Add custom metrics for scaling decisions

3. Set up configuration management:

    - Create ConfigMaps for application settings
    - Implement Secrets for sensitive data
    - Configure environment variables
    - Set up volume mounts for persistent data

4. Implement probes and monitoring:
    - Configure liveness and readiness probes
    - Set up startup probe for initialization
    - Implement Prometheus ServiceMonitor
    - Add Kubernetes event monitoring

### Deliverables

-   Complete Kubernetes deployment manifests
-   Autoscaling configuration based on workload
-   ConfigMaps and Secrets for configuration
-   Health probes and monitoring integration

## Session 13: Management UI Development

### Session Context

You are building a management interface for the Streamflix Transcoding Service. This UI will allow operations teams to monitor and manage transcoding jobs effectively.

**Objectives:**

-   Create an intuitive management interface for operational control
-   Implement comprehensive job management capabilities
-   Develop visual dashboards for system status and performance monitoring
-   Build secure user management with appropriate access controls

### Instructions

1. Set up Blazor Server project:

    - Create new Blazor Server project in the solution
    - Configure authentication and authorization
    - Set up API client services
    - Implement base layout and navigation

2. Create job management UI:

    - Implement job listing with filtering and pagination
    - Create job detail view with complete information
    - Add job control actions (cancel, retry, prioritize)
    - Implement job history visualization

3. Develop dashboard components:

    - Create overview dashboard with key metrics
    - Implement transcoding statistics charts
    - Add system health visualization
    - Create tenant usage reporting

4. Set up user management:
    - Implement user authentication
    - Create role-based access control
    - Add administrative functions
    - Implement audit logging for user actions

### Deliverables

-   Blazor Server application for management
-   Job management interface with CRUD operations
-   Dashboard with key metrics visualization
-   User management and access control

## Session 14: Documentation & Finalization

### Session Context

You are completing the Streamflix Transcoding Service implementation by creating comprehensive documentation and performing final testing. This will ensure the service is ready for production use and maintainable by the team.

**Objectives:**

-   Create complete API documentation for service integrators
-   Develop operational documentation for production deployment and maintenance
-   Provide integration guides for all connected services
-   Conduct final testing and optimization to ensure production readiness

### Instructions

1. Create API documentation:

    - Complete OpenAPI specification
    - Add detailed endpoint descriptions
    - Document request/response models
    - Create example usage scenarios

2. Write operational documentation:

    - Create deployment instructions
    - Document configuration options
    - Add troubleshooting guides
    - Create operational runbooks

3. Implement integration documentation:

    - Document event schemas
    - Create integration guides for partner services
    - Add sequence diagrams for key flows
    - Document authentication requirements

4. Perform final testing and optimization:
    - Run performance benchmarks
    - Validate all error handling scenarios
    - Test scaling under load
    - Document performance expectations

### Deliverables

-   Complete API documentation
-   Operational documentation and runbooks
-   Integration guides for partner services
-   Performance benchmarks and optimization report

## Final Review Checklist

Before considering the implementation complete, verify:

-   [ ] All requirements from the README.md are implemented
-   [ ] The service can process videos from upload to transcoded output
-   [ ] All integration points with other services are working
-   [ ] The system scales horizontally under load
-   [ ] Comprehensive monitoring and alerting is in place
-   [ ] Documentation is complete and accurate
-   [ ] Security requirements are fully implemented
-   [ ] All tests are passing with good coverage

## Next Steps After Completion

After successful implementation:

1. Conduct a code review with the team
2. Perform security assessment
3. Run performance testing under production-like load
4. Create development guidelines for future maintenance
5. Schedule training sessions for operations team
6. Plan for future enhancements and optimizations
