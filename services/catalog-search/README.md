# Catalog & Search Service

Indexes and searches video metadata, supports filtering, pagination, and content-similar video lookups.

## Technology Stack

-   **Language**: Node.js with TypeScript
-   **Framework**: Express.js or Fastify for API endpoints
-   **API Documentation**: OpenAPI/Swagger
-   **Search Engine**: Elasticsearch/OpenSearch with dedicated indices
-   **Message Queue**: Kafka for event consumption and publishing
-   **Caching**: Redis for search results (TTL 30s)
-   **Indexing**: Bulk Elasticsearch API with retry mechanisms
-   **Validation**: Joi/Zod for request validation
-   **Testing**: Jest for unit tests, Testcontainers for E2E tests
-   **Logging**: Pino for structured JSON logs

## Responsibilities

-   Subscribe to `VideoCreated` and `VideoTranscoded` events
-   Index metadata into Elasticsearch/OpenSearch
-   Provide full-text search with filters (genre, year, tags)
-   Serve content-similar videos based on metadata (not personalized)

## API Endpoints

| Method | Path                 | Description                                         |
| ------ | -------------------- | --------------------------------------------------- |
| GET    | /search              | Full-text search                                    |
|        |                      | Query params: `q`, `genre`, `year`, `page`, `limit` |
| GET    | /videos/{id}/similar | Fetch content-similar videos based on metadata      |
|        |                      | Query params: `limit`                               |

## Data Store

-   Elasticsearch/OpenSearch index with shards and replicas
-   Redis for caching hot search results (TTL 30s)

## Events

-   Consumes `VideoCreated` and `VideoTranscoded`
-   Publishes `CatalogIndexed` on successful indexing

## Implementation Details

## Service Boundaries & Interactions

### Relationship with Recommendation Service

The Catalog & Search Service operates independently from the Recommendation Service:

-   **Catalog & Search Service** (this service):

    -   Provides content discovery through search and filtering
    -   Returns similar content based on metadata attributes (genres, tags, cast, etc.)
    -   Uses Elasticsearch/OpenSearch for text search and metadata-based similarity
    -   No knowledge of user preferences or viewing history
    -   Completely user-agnostic

-   **Recommendation Service**:
    -   Provides personalized recommendations based on user behavior
    -   Uses ML algorithms to predict user preferences
    -   Considers viewing history, ratings, and other user interactions
    -   Personalized to specific users

### Integration Patterns

-   **Event-Based Communication**: Both services subscribe to relevant events without direct coupling
-   **Independent Data Models**: Each service maintains its own optimized data model
-   **Gateway Aggregation**: The API Gateway can combine results when needed (e.g., for homepage)

## Non-Functional Requirements

-   Near-real-time indexing (lag < 5s)
-   Query latency < 100 ms (p95)
-   Bulk indexing with retry and backoff for resilience

#### Deployment & Configuration

-   Kubernetes StatefulSet for Elasticsearch/OpenSearch cluster
-   Sidecar indexing service: 3 replicas
-   ConfigMap for index name, batch size, cache TTL

#### Security & Compliance

-   IP filtering for admin/indexing operations
-   Read-only user credentials for search queries

#### Performance & Scalability

-   Bulk API: max 500 docs/batch with 3× retries
-   Edge_ngram analyzers for autocomplete
-   Redis caching (TTL 30s) for hot search results

#### Observability & Monitoring

-   Logging: Pino structured JSON logs to ELK
-   Metrics: Prometheus histograms for indexing time, search latency, cache hit/miss
-   Tracing: OpenTelemetry spans for event handling and search queries

#### CI/CD & Testing

-   GitHub Actions: unit tests (Jest), integration tests with local ES Docker image
-   Docker image build and push

#### Boundary & Data Flow

-   Subscribes to `VideoCreated` and `VideoTranscoded` events from the message bus to update search index.
-   Indexes video metadata into Elasticsearch/OpenSearch.
-   Receives search and related-videos queries via API Gateway.
-   Publishes `CatalogIndexed` events on successful index updates for downstream monitoring or auditing.

## End-to-End Flow

```mermaid
sequenceDiagram
    participant Client
    participant API_Gateway as API Gateway
    participant CatalogService as Catalog & Search Service
    participant RecService as Recommendation Service
    participant ES as Elasticsearch/OpenSearch
    participant Redis
    participant Bus as Message Bus

    %% Search flow
    Client->>API_Gateway: GET /search?q=action
    API_Gateway->>CatalogService: Forward search request
    CatalogService->>Redis: Check cache
    alt Cache hit
        Redis->>CatalogService: Return cached results
    else Cache miss
        CatalogService->>ES: Execute search query
        ES->>CatalogService: Return search results
        CatalogService->>Redis: Cache results (TTL 30s)
    end
    CatalogService->>API_Gateway: Return search results
    API_Gateway->>Client: JSON response

    %% Similar content flow (non-personalized)
    Client->>API_Gateway: GET /videos/{id}/similar
    API_Gateway->>CatalogService: Forward request
    CatalogService->>ES: Find similar by metadata
    ES->>CatalogService: Return similar videos
    CatalogService->>API_Gateway: Return similar videos
    API_Gateway->>Client: JSON response

    %% Indexing flow
    Bus->>CatalogService: VideoCreated/Transcoded
    CatalogService->>ES: Index document
    CatalogService->>Bus: Publish CatalogIndexed

    %% Personalized recommendation flow (separate service)
    Client->>API_Gateway: GET /api/v1/recs/{userId}
    API_Gateway->>RecService: Forward request
    RecService->>API_Gateway: Return personalized recommendations
    API_Gateway->>Client: JSON response
```
