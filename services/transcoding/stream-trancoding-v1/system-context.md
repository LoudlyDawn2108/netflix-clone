# Streamflix System Context

This document provides the overall system context for the Streamflix video streaming platform and explains where the Transcoding Service fits within the broader architecture. Reference this document at the beginning of each development session to maintain context.

## Streamflix Platform Overview

Streamflix is a cloud-native, enterprise-grade video streaming platform built on the .NET technology stack. The platform enables users to upload, process, catalog, and stream video content with features similar to major streaming services.

## System Architecture

Streamflix follows a microservices architecture with the following key components:

### Core Services

1. **Video Management Service (Java)**

   - Handles video uploads and metadata
   - Manages video lifecycle and status
   - Publishes `VideoUploaded` events when videos are ready for processing

2. **Transcoding Service (.NET)** - _You are building this_

   - Converts master video files into adaptive bitrate streaming formats
   - Creates multiple quality renditions (SD, HD, 4K)
   - Generates HLS/DASH manifests for adaptive streaming
   - Publishes completion events for downstream services

3. **Playback & DRM Service**

   - Handles video streaming to end users
   - Manages content protection and DRM
   - Provides player configuration and stream URLs
   - Consumes transcoded content from the Transcoding Service

4. **Catalog & Search Service**

   - Maintains the content library and metadata
   - Provides search and recommendation functionality
   - Consumes events from Transcoding Service to update content status
   - Manages content categorization and discovery

5. **Analytics Service**
   - Collects and processes viewing statistics
   - Tracks technical quality metrics
   - Processes transcoding metrics for optimization
   - Provides business intelligence dashboards

## Data Flow

The system uses an event-driven architecture with the following flow:

1. Content providers upload videos through the Video Management Service
2. Video Management stores the master file in S3 and publishes a `VideoUploaded` event
3. Transcoding Service consumes this event, processes the video, and creates multiple renditions
4. Transcoding Service publishes a `VideoTranscoded` event with manifest information
5. Catalog, Playback, and Analytics services consume the `VideoTranscoded` event
6. End users can then discover and stream the processed videos

## Technical Stack

### Shared Infrastructure

- **Cloud Platform**: AWS/Azure/GCP with Kubernetes
- **Message Bus**: Kafka for event communication
- **Storage**: S3-compatible object storage
- **Monitoring**: ELK Stack, Prometheus, and Jaeger
- **Security**: JWT-based service-to-service authentication

### Transcoding Service Specific

- **.NET 8** as the application framework
- **Entity Framework Core** for database access
- **PostgreSQL** for job persistence
- **Redis** for distributed locking and temporary caching
- **FFmpeg** (via Xabe.FFmpeg) for media processing
- **MassTransit** with Kafka for messaging
- **AWSSDK.S3** for storage operations
- **ASP.NET Core** for REST APIs and health monitoring

## Transcoding Service Responsibilities

As a developer building the Transcoding Service, you are responsible for:

1. **Media Processing**

   - Converting uploaded videos to multiple quality renditions
   - Creating standardized streaming manifests (HLS/DASH)
   - Supporting various codecs and quality profiles

2. **Job Management**

   - Processing jobs in parallel with proper resource management
   - Tracking job status and providing progress information
   - Ensuring fault tolerance and idempotent processing

3. **Integration**

   - Consuming `VideoUploaded` events from Video Management Service
   - Publishing `VideoTranscoded` events for downstream services
   - Providing status APIs for job monitoring

4. **Security & Multi-tenancy**

   - Ensuring proper tenant isolation
   - Implementing secure access to storage
   - Following service-to-service authentication patterns

5. **Observability**
   - Implementing comprehensive logging and metrics
   - Providing health check endpoints
   - Supporting distributed tracing for end-to-end visibility

## Non-Functional Requirements

- **Scalability**: The service must scale horizontally to handle variable load
- **Resilience**: Implement retry policies and circuit breakers for fault tolerance
- **Performance**: Optimize transcoding speed while maintaining quality
- **Security**: Follow security best practices for enterprise systems
- **Observability**: Comprehensive logging, metrics, and tracing
- **Multi-tenancy**: Support for multiple customers with proper isolation

## Development Approach

The implementation is divided into focused sessions, each building on the previous one. This approach allows you to:

1. Start with core functionality to get a working service quickly
2. Progressively add enterprise features and optimizations
3. Focus on specific areas in each session with clear deliverables

Each time you begin a new session, refer back to this context document and the README.md to ensure your implementation aligns with the overall system architecture and requirements.
