# Video Management Service - Development Instructions

## Project Context and Overview

### What We're Building

We are developing a Video Management Service for Streamflix, our cloud-native enterprise-grade video streaming platform. This service is a critical component in our microservices architecture, serving as the central hub for managing all video metadata, handling video ingestion triggers, and coordinating thumbnail management.

### Service Purpose

The Video Management Service is responsible for:

1. Managing the complete lifecycle of video metadata (creation, retrieval, updates, deletion)
2. Triggering ingestion and transcoding workflows when new videos are uploaded
3. Coordinating thumbnail generation and management
4. Publishing domain events for downstream services (like search indexing and recommendations)
5. Providing basic filtering and pagination capabilities for video content

### Architecture Context

This service follows hexagonal/clean architecture with domain-driven design principles:

-   **Core Domain**: Video metadata management with strict domain boundaries
-   **Integration Pattern**: Event-driven architecture using Kafka for service communication
-   **Data Flow**: Receives API requests → Persists metadata → Publishes events → Triggers workflows
-   **Storage**: PostgreSQL for metadata, S3-compatible storage for video files and thumbnails

### Technical Requirements

-   High availability (99.9% uptime)
-   Horizontal scalability to handle traffic spikes
-   Resilient operations with circuit breakers and retries
-   Comprehensive observability with metrics, logs, and traces
-   Security with JWT authentication and role-based access control

### How This Service Fits in the Larger System

Client -> API Gateway -> Video Mgmt Service
├──> Message Bus (Kafka) -> Search & Discovery Service
└──> S3 Storage -> Transcoding Service

### Key Performance Indicators

-   API response time < 200ms for metadata operations
-   Event publishing latency < 50ms
-   Support for 1000+ concurrent users
-   Handle 100+ video uploads per minute
-   Efficient filtering and pagination for 100,000+ videos

## How To Use These Instructions

1. Complete each instruction set fully before moving to the next
2. Validate your work after completing each set
3. Each set is designed to be a self-contained unit of work
4. Keep the README.md open as a reference for specifications

---

## Iteration 1: Project Setup and Core Structure

### Instruction Set 1.1: Initial Project Setup

**Context:** We are building a Video Management Service for Streamflix, our enterprise video streaming platform. This service will handle video metadata, orchestrate the video lifecycle, and integrate with our object storage. In this first step, we're setting up the core project structure following hexagonal architecture patterns to maintain clean separation of concerns between domain logic, application services, and infrastructure.

**Objectives:**

-   Initialize the Spring Boot project with proper configuration
-   Set up the hexagonal architecture structure
-   Configure basic application properties
-   Create local development environment with Docker

1. Create a new Spring Boot 3.3 project with Spring Initializer using Gradle with Kotlin DSL

    - Group: com.streamflix
    - Artifact: video-management-service
    - Dependencies: Spring Web, Spring Data JPA, PostgreSQL Driver, Spring Boot Actuator
    - Java version: 21
    - Package structure: com.streamflix.video

2. Setup hexagonal architecture core package structure:

    ```
    src/main/java/com/streamflix/video/
    ├── domain/         # Domain entities, value objects, repository interfaces
    ├── application/    # Use cases, services, ports
    ├── infrastructure/ # Adapters, repositories implementations, external services
    └── presentation/   # Controllers, DTOs, API endpoints
    ```

3. Configure `application.yml` in `src/main/resources/` with basic properties:

    ```yaml
    spring:
        application:
            name: video-management-service
        profiles:
            active: dev
        datasource:
            url: jdbc:postgresql://localhost:5432/streamflix_videos
            username: postgres
            password: postgres
        jpa:
            hibernate:
                ddl-auto: validate
            show-sql: true
    ```

4. Create `Dockerfile` and `docker-compose.yml` files for local development:
    - Include PostgreSQL service (5432)
    - Configure environment variables
    - Set up volume for persisting data

### Instruction Set 1.2: Domain Model Implementation

**Context:** Our Video Management Service needs a robust domain model to represent videos, categories, thumbnails, and related entities. The domain model is at the core of our hexagonal architecture and should be rich with business logic and validation rules. This domain model will persist to PostgreSQL but should be database-agnostic in its design.

**Objectives:**

-   Implement core domain entities with proper relationships
-   Define domain-specific validation rules and constraints
-   Create repository interfaces that represent persistence operations

1. Implement Video entity class in `domain/model/Video.java` with all required fields:

    - id (UUID)
    - title
    - description
    - tags (Set<String>)
    - category (reference)
    - releaseYear
    - language
    - thumbnails (OneToMany)
    - status (enum)
    - createdAt, updatedAt

2. Create supporting domain classes:

    - `domain/model/VideoStatus.java` enum with required states (PENDING, UPLOADED, etc.)
    - `domain/model/Category.java` entity with id, name, and description
    - `domain/model/Thumbnail.java` entity with id, url, width, height, type, and video reference

3. Define repository interfaces in `domain/repository/`:

    - `VideoRepository.java`
    - `CategoryRepository.java`
    - `ThumbnailRepository.java`

4. Create domain validation logic and domain events:
    - `domain/event/VideoCreatedEvent.java`
    - `domain/event/VideoUpdatedEvent.java`
    - `domain/event/VideoDeletedEvent.java`

### Instruction Set 1.3: Database Setup and Migrations

**Context:** For persistence, our service uses PostgreSQL to store video metadata. We need proper database migration scripts using Flyway to ensure reliable schema evolution and consistent database state across environments. We also need to optimize our database connection pooling for performance.

**Objectives:**

-   Configure Flyway for database migrations
-   Create database schema for our domain model
-   Optimize database connection handling
-   Implement repository implementations

1. Configure Flyway in `application.yml`:

    ```yaml
    spring:
        flyway:
            enabled: true
            baseline-on-migrate: true
            locations: classpath:db/migration
    ```

2. Create Flyway migration scripts in `src/main/resources/db/migration/`:

    - `V1__create_categories_table.sql`
    - `V2__create_videos_table.sql`
    - `V3__create_thumbnails_table.sql`
    - `V4__create_video_tags_table.sql`

3. Configure HikariCP connection pool in `application.yml`:

    ```yaml
    spring:
        datasource:
            hikari:
                maximum-pool-size: 20
                minimum-idle: 5
                idle-timeout: 30000
                connection-timeout: 30000
    ```

4. Implement JPA repositories in `infrastructure/repository/`:
    - `JpaVideoRepository.java`
    - `JpaCategoryRepository.java`
    - `JpaThumbnailRepository.java`

### Instruction Set 1.4: Basic API and Health Checks

**Context:** As a microservice, our Video Management Service needs to expose REST APIs for other services to consume. We'll implement basic API endpoints following REST practices and configure health checks for monitoring. We'll use DTOs to separate our domain model from the API contract.

**Objectives:**

-   Create DTOs for request/response handling
-   Implement model mapping between domain and DTOs
-   Create RESTful controllers for video operations
-   Configure health monitoring endpoints

1. Create API DTOs in `presentation/dto/`:

    - `VideoDto.java`
    - `CreateVideoRequest.java`
    - `UpdateVideoRequest.java`
    - `VideoResponse.java`
    - `PageResponse.java`

2. Implement model mappers in `presentation/mapper/`:

    - `VideoMapper.java`
    - `CategoryMapper.java`
    - `ThumbnailMapper.java`

3. Create basic controller for videos in `presentation/controller/VideoController.java`:

    - Implement endpoints according to API specs in README
    - Include basic validation
    - Implement proper response status codes

4. Configure Spring Actuator for health checks in `application.yml`:
    ```yaml
    management:
        endpoints:
            web:
                exposure:
                    include: health, info, metrics
        endpoint:
            health:
                show-details: always
    ```

---

## Iteration 2: Core Service Functionality

### Instruction Set 2.1: Service Layer Implementation

**Context:** Now that we have our domain model and API framework in place, we need to implement the application services that orchestrate our business logic. These services will coordinate between the API layer and domain model, handle transactions, and implement use cases for video management.

**Objectives:**

-   Define service interfaces for our application ports
-   Implement service classes with business logic
-   Configure transaction management
-   Implement proper error handling

1. Create service interfaces in `application/port/`:

    - `VideoService.java`
    - `CategoryService.java`
    - `ThumbnailService.java`

2. Implement service classes in `application/service/`:

    - `VideoServiceImpl.java`
    - `CategoryServiceImpl.java`
    - `ThumbnailServiceImpl.java`

3. Implement transaction management in service layer:

    - Use `@Transactional` annotations properly
    - Define transaction boundaries
    - Handle rollback scenarios

4. Create exception classes in `domain/exception/`:
    - `VideoNotFoundException.java`
    - `CategoryNotFoundException.java`
    - `ValidationException.java`
    - `VideoAlreadyExistsException.java`

### Instruction Set 2.2: S3 Integration

**Context:** Our Video Management Service needs to integrate with S3-compatible object storage for video files and thumbnails. This integration is critical for our service as it allows content producers to upload video assets and viewers to stream them. We'll implement pre-signed URLs for secure uploads and downloads.

**Objectives:**

-   Configure AWS SDK for S3 integration
-   Implement service for S3 operations
-   Create pre-signed URL generation
-   Configure secure and optimized S3 client

1. Add AWS SDK dependencies to build.gradle.kts:

    ```kotlin
    implementation("software.amazon.awssdk:s3:2.21.0")
    implementation("software.amazon.awssdk:sts:2.21.0")
    ```

2. Create S3 configuration in `infrastructure/config/S3Config.java`:

    - Configure AWS S3 client
    - Set proper timeouts and retries
    - Use environment variables for credentials

3. Implement S3 service in `infrastructure/service/`:

    - `S3Service.java` (interface)
    - `AwsS3Service.java` (implementation)
    - Methods for generating pre-signed URLs
    - Methods for thumbnail storage

4. Add S3 properties to application.yml:
    ```yaml
    streamflix:
        s3:
            bucket: streamflix-videos
            region: us-east-1
            endpoint: ${S3_ENDPOINT:https://s3.amazonaws.com}
            presigned-url-expiration: 3600
    ```

### Instruction Set 2.3: Kafka Integration

**Context:** Our service publishes domain events to Kafka to notify other services about changes in video state. This enables a decoupled, event-driven architecture where services like the Transcoding Service, Search & Discovery Service, and others can react to video lifecycle events.

**Objectives:**

-   Configure Kafka integration with Spring Cloud Stream
-   Define event channels for publishing
-   Implement event serialization/deserialization
-   Set up event publishing services

1. Add Spring Cloud Stream with Kafka dependencies to build.gradle.kts:

    ```kotlin
    implementation("org.springframework.cloud:spring-cloud-starter-stream-kafka")
    implementation("org.springframework.cloud:spring-cloud-stream-binder-kafka")
    ```

2. Configure Kafka in `application.yml`:

    ```yaml
    spring:
        cloud:
            stream:
                kafka:
                    binder:
                        brokers: ${KAFKA_BROKERS:localhost:9092}
                bindings:
                    video-created-out:
                        destination: video-service.video-created
                        content-type: application/json
                    video-updated-out:
                        destination: video-service.video-updated
                        content-type: application/json
                    video-deleted-out:
                        destination: video-service.video-deleted
                        content-type: application/json
    ```

3. Implement message channels in `infrastructure/messaging/`:

    - `VideoEventChannels.java` (interface)
    - `EventPublisher.java` (service)

4. Create serializers/deserializers for events in `infrastructure/messaging/`:
    - `EventSerializer.java`

### Instruction Set 2.4: Advanced Filtering

**Context:** While complex search is delegated to our Search & Discovery Service, our Video Management Service needs to provide basic filtering capabilities for video metadata. We'll implement this using JPA Specifications for dynamic query building and proper pagination.

**Objectives:**

-   Implement flexible filtering mechanism
-   Support pagination and sorting
-   Create query parameter mapping
-   Optimize query performance

1. Implement JPA Specification for dynamic queries in `infrastructure/repository/specification/`:

    - `VideoSpecification.java`
    - Support filtering by multiple criteria
    - Support field selection

2. Add pagination support to repositories:

    - Use Spring Data's `Pageable` parameter
    - Implement sorting options

3. Create query parameter DTO in `presentation/dto/`:

    - `VideoFilterParams.java`

4. Update controller to use filtering:
    - Map request parameters to filter DTO
    - Pass to service layer
    - Return paginated results

---

## Iteration 3: Security and Testing

### Instruction Set 3.1: Spring Security Setup

**Context:** Our Video Management Service needs proper authentication and authorization to ensure only authorized users and services can access our APIs. We'll implement JWT-based security with Spring Security to secure our endpoints and validate tokens.

**Objectives:**

-   Configure Spring Security with JWT authentication
-   Implement authentication filter
-   Create JWT provider for token validation
-   Configure secure defaults for our API

1. Add Spring Security dependencies to build.gradle.kts:

    ```kotlin
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("io.jsonwebtoken:jjwt-api:0.11.5")
    runtimeOnly("io.jsonwebtoken:jjwt-impl:0.11.5")
    runtimeOnly("io.jsonwebtoken:jjwt-jackson:0.11.5")
    ```

2. Create security configuration in `infrastructure/config/SecurityConfig.java`:

    - Configure JWT filter
    - Define security rules
    - Configure CORS

3. Implement JWT authentication in `infrastructure/security/`:

    - `JwtAuthenticationFilter.java`
    - `JwtProvider.java`
    - `SecurityUser.java`

4. Add security properties to application.yml:
    ```yaml
    streamflix:
        security:
            jwt:
                secret: ${JWT_SECRET:supersecretkeythatshouldbesecure}
                expiration: 86400000
    ```

### Instruction Set 3.2: Role-Based Access Control

**Context:** Different user roles have different permissions in our system. Administrators can perform all operations, content managers can create and update videos, while regular users may only have read access. We need to implement role-based access control and audit trails for security events.

**Objectives:**

-   Define role-based security model
-   Implement method-level security
-   Configure service-to-service authentication
-   Set up audit logging for security events

1. Create user model classes in `domain/model/`:

    - `Role.java` (enum)
    - `User.java` (entity)

2. Implement method-level security:

    - Use `@PreAuthorize` annotations
    - Create custom security expressions

3. Configure API key authentication for service-to-service calls:

    - Create `ApiKeyAuthFilter.java`
    - Configure in Security Config

4. Implement audit logging for security events:
    - Create `AuditLogger.java` service
    - Use Spring AOP to capture security events

### Instruction Set 3.3: Unit Testing

**Context:** To ensure our service is robust and reliable, we need comprehensive unit tests for our domain logic and services. These tests verify individual components work correctly in isolation using mocked dependencies where appropriate.

**Objectives:**

-   Configure unit testing framework
-   Test domain model validation rules
-   Test service layer logic with mocks
-   Create test utilities for common test operations

1. Configure JUnit 5 and Mockito in build.gradle.kts:

    ```kotlin
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.mockito:mockito-core:5.5.0")
    testImplementation("org.mockito:mockito-junit-jupiter:5.5.0")
    ```

2. Create domain unit tests in `src/test/java/com/streamflix/video/domain/`:

    - `VideoTest.java`
    - Test entity validation
    - Test domain logic

3. Create service unit tests in `src/test/java/com/streamflix/video/application/service/`:

    - `VideoServiceImplTest.java`
    - Use Mockito to mock dependencies

4. Create test utilities in `src/test/java/com/streamflix/video/util/`:
    - `TestDataFactory.java`
    - Methods to create test entities

### Instruction Set 3.4: Integration Testing

**Context:** Beyond unit tests, we need integration tests to verify our components work together correctly, including database operations, messaging, and API endpoints. We'll use Testcontainers to create real dependencies in isolated test environments.

**Objectives:**

-   Configure integration test environment
-   Test database repositories with real database
-   Test API endpoints with Spring MockMvc
-   Verify authentication and authorization

1. Add Testcontainers dependencies to build.gradle.kts:

    ```kotlin
    testImplementation("org.testcontainers:testcontainers:1.19.0")
    testImplementation("org.testcontainers:junit-jupiter:1.19.0")
    testImplementation("org.testcontainers:postgresql:1.19.0")
    testImplementation("org.springframework.security:spring-security-test")
    ```

2. Create test configuration for PostgreSQL in `src/test/java/com/streamflix/video/config/`:

    - `TestDatabaseConfig.java`

3. Create repository integration tests in `src/test/java/com/streamflix/video/infrastructure/repository/`:

    - `JpaVideoRepositoryIntegrationTest.java`

4. Create controller integration tests in `src/test/java/com/streamflix/video/presentation/controller/`:
    - `VideoControllerIntegrationTest.java`
    - Use MockMvc for testing endpoints

---

## Iteration 4: Resilience and Observability

### Instruction Set 4.1: Circuit Breaker and Retries

**Context:** Our Video Management Service integrates with external systems like S3 and other services that may experience transient failures. We need to implement resilience patterns to handle these failures gracefully and prevent cascading failures throughout our system.

**Objectives:**

-   Configure circuit breaker patterns
-   Implement retry mechanisms with backoff
-   Create fallback strategies
-   Monitor circuit state for operations

1. Add Resilience4j dependencies to build.gradle.kts:

    ```kotlin
    implementation("io.github.resilience4j:resilience4j-spring-boot3:2.1.0")
    implementation("io.github.resilience4j:resilience4j-circuitbreaker:2.1.0")
    implementation("io.github.resilience4j:resilience4j-retry:2.1.0")
    implementation("io.github.resilience4j:resilience4j-timelimiter:2.1.0")
    ```

2. Configure Resilience4j in application.yml:

    ```yaml
    resilience4j:
        circuitbreaker:
            instances:
                s3Service:
                    registerHealthIndicator: true
                    slidingWindowSize: 10
                    failureRateThreshold: 50
                    waitDurationInOpenState: 10000
        retry:
            instances:
                s3Service:
                    maxRetryAttempts: 3
                    waitDuration: 1000
    ```

3. Apply circuit breaker and retry to S3 service:

    - Use `@CircuitBreaker` and `@Retry` annotations
    - Implement fallback methods

4. Create custom circuit breaker event handlers:
    - `CircuitBreakerEventHandler.java`

### Instruction Set 4.2: Monitoring and Metrics

**Context:** For operational visibility, we need to collect and expose metrics about our service's performance and behavior. These metrics help us monitor the health of our service, track usage patterns, and identify performance bottlenecks.

**Objectives:**

-   Configure metrics collection with Micrometer
-   Expose Prometheus endpoint
-   Track key business metrics
-   Measure API performance and error rates

1. Configure Micrometer with Prometheus in build.gradle.kts:

    ```kotlin
    implementation("io.micrometer:micrometer-registry-prometheus")
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    ```

2. Configure metrics in application.yml:

    ```yaml
    management:
        metrics:
            export:
                prometheus:
                    enabled: true
        endpoint:
            metrics:
                enabled: true
            prometheus:
                enabled: true
        endpoints:
            web:
                exposure:
                    include: health, prometheus, metrics, info
    ```

3. Create custom metrics in `infrastructure/metrics/`:

    - `VideoServiceMetrics.java`
    - Track video creation/updates/deletions
    - Track API request counts and response times

4. Add metrics collection to service layer:
    - Use `@Timed` annotations
    - Create custom Counter and Timer metrics

### Instruction Set 4.3: Distributed Tracing

**Context:** As part of our microservice architecture, requests often flow through multiple services. Distributed tracing helps us follow these requests across service boundaries, making it easier to debug issues and understand performance bottlenecks in our distributed system.

**Objectives:**

-   Configure distributed tracing with OpenTelemetry
-   Set up trace context propagation
-   Add custom spans to key operations
-   Export traces to Jaeger for visualization

1. Add OpenTelemetry dependencies to build.gradle.kts:

    ```kotlin
    implementation("io.opentelemetry:opentelemetry-api:1.28.0")
    implementation("io.opentelemetry:opentelemetry-sdk:1.28.0")
    implementation("io.opentelemetry:opentelemetry-exporter-jaeger:1.28.0")
    implementation("io.opentelemetry.instrumentation:opentelemetry-instrumentation-annotations:1.28.0")
    ```

2. Configure OpenTelemetry in `infrastructure/config/TracingConfig.java`:

    - Set up Jaeger exporter
    - Configure sampling rate
    - Create tracer bean

3. Configure MDC context for request tracing:

    - Create `LoggingFilter.java`
    - Implement MDC correlation ID

4. Add tracing to key service methods:
    - Use `@WithSpan` annotations
    - Add custom attributes to spans

### Instruction Set 4.4: Caching Strategy

**Context:** To improve performance and reduce load on our database, we'll implement a caching layer using Redis. This caching strategy will help us serve frequently accessed data more quickly while reducing the load on our PostgreSQL database.

**Objectives:**

-   Configure Redis caching
-   Define cache policies and TTLs
-   Apply caching to appropriate service methods
-   Implement cache invalidation strategies

1. Add Spring Cache and Redis dependencies to build.gradle.kts:

    ```kotlin
    implementation("org.springframework.boot:spring-boot-starter-cache")
    implementation("org.springframework.boot:spring-boot-starter-data-redis")
    ```

2. Configure Redis cache in application.yml:

    ```yaml
    spring:
        cache:
            type: redis
        redis:
            host: ${REDIS_HOST:localhost}
            port: ${REDIS_PORT:6379}
            timeout: 2000
    ```

3. Create cache configuration in `infrastructure/config/CacheConfig.java`:

    - Define cache names
    - Configure TTL for different caches
    - Set up cache key generator

4. Apply caching to service layer:
    - Use `@Cacheable`, `@CachePut`, and `@CacheEvict` annotations
    - Cache video retrieval by ID
    - Cache category and tag lookups

---

## Iteration 5: DevOps and Deployment

### Instruction Set 5.1: Production Dockerfile

**Context:** Our Video Management Service needs to be deployed as a container in our Kubernetes environment. We need to create an optimized Dockerfile that builds our application efficiently and creates a lightweight, secure production image.

**Objectives:**

-   Create multi-stage Docker build process
-   Configure container health checks
-   Set resource limits and JVM tuning
-   Implement graceful shutdown

1. Create optimized multi-stage Dockerfile:

    ```dockerfile
    FROM gradle:8.5-jdk21 AS build
    WORKDIR /app
    COPY . .
    RUN gradle build --no-daemon

    FROM eclipse-temurin:21-jre-alpine
    WORKDIR /app
    COPY --from=build /app/build/libs/*.jar app.jar
    EXPOSE 8080
    CMD ["java", "-jar", "app.jar"]
    ```

2. Configure container health and readiness probes:

    - Add appropriate Spring Boot Actuator endpoints
    - Configure startup/liveness/readiness probes

3. Set up container resource limits:

    - Configure JVM heap size
    - Set CPU and memory limits

4. Implement graceful shutdown handling:
    - Configure shutdown hooks
    - Set proper timeouts

### Instruction Set 5.2: Kubernetes Deployment

**Context:** For production deployments, our service runs in Kubernetes. We need to create the necessary Kubernetes manifests to define how our service should be deployed, scaled, and connected to other services in the cluster.

**Objectives:**

-   Create Kubernetes deployment manifests
-   Configure service and ingress resources
-   Manage configuration with ConfigMaps and Secrets
-   Set up horizontal pod autoscaling

1. Create Kubernetes deployment manifests in `k8s/` folder:

    - `deployment.yaml`
    - `service.yaml`
    - `ingress.yaml`

2. Configure ConfigMaps and Secrets:

    - `configmap.yaml`
    - `secrets.yaml`

3. Create Helm charts for deployment:

    - Initialize Helm chart structure
    - Create values.yaml with configurable parameters

4. Configure horizontal pod autoscaling:
    - `hpa.yaml` with CPU/memory thresholds
    - Set min/max replicas

### Instruction Set 5.3: API Documentation

**Context:** For developers consuming our API, we need comprehensive API documentation. We'll use SpringDoc to generate OpenAPI documentation automatically from our code and annotations, providing an interactive Swagger UI for exploring the API.

**Objectives:**

-   Configure OpenAPI documentation generator
-   Document API endpoints and parameters
-   Include example requests and responses
-   Set up Swagger UI for interactive documentation

1. Add SpringDoc OpenAPI dependencies to build.gradle.kts:

    ```kotlin
    implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:2.2.0")
    ```

2. Configure OpenAPI in `infrastructure/config/OpenApiConfig.java`:

    - Set documentation metadata
    - Configure security schemes
    - Group endpoints logically

3. Document controllers with OpenAPI annotations:

    - Add `@Operation` annotations
    - Document parameters and responses
    - Include example requests/responses

4. Configure Swagger UI in application.yml:
    ```yaml
    springdoc:
        swagger-ui:
            path: /swagger-ui.html
            operationsSorter: method
        api-docs:
            path: /api-docs
    ```

### Instruction Set 5.4: Workflow Orchestration

**Context:** Our Video Management Service coordinates complex workflows when videos are uploaded, including transcoding, thumbnail generation, and metadata extraction. We need a state machine to track the progress of these workflows and coordinate between services.

**Objectives:**

-   Implement state machine for video processing
-   Create state transition event handling
-   Add monitoring for workflow progress
-   Implement error recovery mechanisms

1. Create state machine for video processing workflow:

    - Add Spring Statemachine dependency
    - Define states and transitions
    - Create configuration for state machine

2. Implement event-driven state management:

    - Create state transition events
    - Implement state transition listeners

3. Create workflow monitoring capabilities:

    - Track state transitions
    - Provide status endpoints

4. Implement compensating transactions:
    - Handle partial failures
    - Create rollback mechanisms

---

## Iteration 6: Advanced Features and Scaling

### Instruction Set 6.1: Advanced Enterprise Features

**Context:** As an enterprise-grade service, we need to implement features like multi-tenancy, data partitioning, and compliance with data privacy regulations. These features ensure our service can scale to multiple customers while maintaining data isolation.

**Objectives:**

-   Implement multi-tenancy capabilities
-   Configure data partitioning strategy
-   Set up data archiving and retention
-   Add GDPR compliance features

1. Implement multi-tenancy support:

    - Add tenant ID to entities
    - Create tenant context holder
    - Implement tenant filtering

2. Set up data partitioning strategy:

    - Configure database partitioning
    - Implement partition routing

3. Implement data archiving and retention policies:

    - Create scheduled jobs for data archiving
    - Configure retention rules

4. Configure GDPR compliance features:
    - Implement data anonymization
    - Create personal data export API

### Instruction Set 6.2: Performance Optimization

**Context:** As our service scales to handle more videos and higher traffic, we need to optimize performance. This includes database query optimization, connection pool tuning, and asynchronous processing for better resource utilization.

**Objectives:**

-   Optimize database queries and indexes
-   Configure connection pool for optimal performance
-   Implement request compression
-   Set up asynchronous processing

1. Optimize database queries:

    - Review and update indexes
    - Optimize JPA entity graphs
    - Implement batch processing

2. Configure connection pool optimization:

    - Tune HikariCP settings
    - Configure statement caching

3. Implement request compression:

    - Configure Spring's compression filter
    - Set compression thresholds

4. Set up asynchronous processing:
    - Use `@Async` annotations
    - Configure thread pools
    - Implement CompletableFuture responses

### Instruction Set 6.3: Integration with Other Services

**Context:** Our Video Management Service needs to integrate with other services in the Streamflix platform, including the Transcoding Service, Search & Discovery Service, and User Profile Service. These integrations enable a cohesive user experience across the platform.

**Objectives:**

-   Create client interfaces for other services
-   Implement resilient HTTP clients
-   Configure event consumers
-   Set up service discovery

1. Create client interfaces for other services:

    - `TranscodingServiceClient.java`
    - `SearchServiceClient.java`
    - `UserProfileServiceClient.java`

2. Implement HTTP clients with Resilience4j:

    - Use Spring WebClient with circuit breakers
    - Configure timeouts and retries

3. Create event consumers for other service events:

    - Configure Kafka consumer bindings
    - Implement event handlers

4. Configure service discovery integration:
    - Add Spring Cloud Discovery Client
    - Configure service registration

### Instruction Set 6.4: Final Production Readiness

**Context:** Before fully deploying to production, we need to implement advanced features that ensure our service can handle enterprise-scale workloads. This includes read replicas for database scaling, distributed caching, and comprehensive monitoring.

**Objectives:**

-   Configure database read replicas
-   Set up distributed caching with Redis Cluster
-   Create monitoring dashboards
-   Conduct final security review

1. Implement database read replicas:

    - Configure read/write datasource routing
    - Implement ReplicaAwareTransactionManager

2. Set up distributed caching:

    - Configure Redis cluster connection
    - Implement cache synchronization

3. Create detailed monitoring dashboards:

    - Define Grafana dashboard templates
    - Create alerting rules

4. Conduct final security review:
    - Run OWASP dependency check
    - Configure security headers
    - Review authentication/authorization

---

## Additional Notes

### General Conventions to Follow

1. **Error Handling**

    - Create proper exception hierarchy
    - Return standardized error responses
    - Include appropriate HTTP status codes

2. **Coding Style**

    - Follow Google Java Style Guide
    - Use consistent naming conventions
    - Add Javadoc comments to public APIs

3. **Testing Standards**

    - Write tests for both happy and error paths
    - Aim for high test coverage (>80%)
    - Create separate test profiles

4. **Logging**

    - Use SLF4J for all logging
    - Configure appropriate log levels
    - Include contextual information in logs

5. **Version Control**
    - Commit frequently with descriptive messages
    - Follow semantic versioning for releases
    - Create feature branches for new functionality

### Environment-Specific Configuration

#### Development Environment

```yaml
spring:
    datasource:
        url: jdbc:postgresql://localhost:5432/streamflix_videos
    jpa:
        show-sql: true
logging:
    level:
        com.streamflix: DEBUG
```

#### Production Environment

```yaml
spring:
    datasource:
        url: jdbc:postgresql://${DB_HOST}:${DB_PORT}/${DB_NAME}
    jpa:
        show-sql: false
logging:
    level:
        com.streamflix: INFO
streamflix:
    s3:
        bucket: ${S3_BUCKET_NAME}
```
