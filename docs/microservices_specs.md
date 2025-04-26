# Microservices Functional Specifications

This document details the responsibilities, API contracts, data stores, events, and non‑functional requirements for each microservice in the Netflix‑style video streaming platform.

# API Gateway Functional Specification

The API Gateway sits at the front door of your microservice architecture. It provides a unified entry point to your system, handling cross‑cutting concerns so that downstream services can remain lightweight and focused on business logic.

## 1. Request Routing & API Composition
- Path‑based routing: map incoming URLs to specific microservice endpoints  
- Method‑based routing: route GET/POST/PUT/DELETE to appropriate services  
- Versioning: support `/v1/…`, `/v2/…` or header‑based API versions  
- Fan‑out (Aggregation/BFF): combine multiple service calls into a single response  

## 2. Authentication & Authorization
- JWT validation and introspection  
- OAuth2 token exchange / OpenID Connect support  
- API key management (for third‑party clients)  
- Role‑based access control (RBAC) / scope checks per route  
- Integration with identity providers (Auth Service, OAuth2, SSO)

## 3. Security & Traffic Management
- TLS termination / HTTPS enforcement  
- Rate limiting / throttling (per IP, per API key, per user)  
- IP allow‑list / deny‑list  
- Web Application Firewall (WAF) integration  
- CORS / CSP header injection  
- Request size limits and payload validation

## 4. Protocol Translation & Transformation
- HTTP ↔ gRPC bridging (if backend uses gRPC)  
- Request/response header enrichment or stripping  
- URL rewrites / redirects  
- Payload transformations (JSON ↔ XML, field renaming)  
- Mock responses for development or canary testing

## 5. Resilience & Reliability
- Circuit breakers (stop calling failed services)  
- Automatic retries with back‑off on transient failures  
- Bulkheading / rate isolation per client or route  
- Failover routing (secondary endpoints if primary is down)  

## 6. Caching & Performance Optimization
- Response caching (in‑memory or Redis) with TTL controls  
- Conditional requests (ETag / If‑Modified‑Since)  
- Bulk request coalescing / request collapsing  

## 7. Observability & Monitoring
- Metrics emission (request count, latency, error rate) to Prometheus  
- Distributed tracing header propagation (W3C Trace Context)  
- Centralized access logs (JSON‑structured) to ELK/Loki  
- Dashboarding and alert rules (via Grafana)  

## 8. Developer Experience & Self‑Service
- OpenAPI/Swagger gateway integration  
- API key issuance / developer portal endpoints  
- Mock endpoints for client SDK development  
- Usage analytics (per‑app, per‑endpoint metrics)  

## 9. Deployment & Configuration
- Immutable, declarative config (e.g. YAML or Terraform)  
- Hot reload of routing/config without downtime  
- Blue/Green or Canary deployments for gateway itself  
- Health check endpoints for load balancers  

---

**Summary of Flow**  
1. Client → API Gateway  
2. Gateway: authenticate, authorize, rate‑limit  
3. Gateway: route or aggregate calls to microservices  
4. Gateway: enrich/transform/validate requests & responses  
5. Gateway: emit metrics/logs/traces, enforce cache and retries  
6. Client receives unified, secured, high‑performance API response  


---

## 1. Authentication Service

### Responsibilities

-   User registration (email/password, OAuth)
-   Login, logout, token issuance (JWT)
-   Token refresh
-   Password reset (email flow)
-   Role and permission management
-   Integrate with external identity providers (Google, GitHub)

### API Endpoints (REST)

| Method | Path                          | Description                    | Request Body                | Response Body              |
| ------ | ----------------------------- | ------------------------------ | --------------------------- | -------------------------- |
| POST   | /auth/signup                  | Create new user account        | `{ email, password, name }` | `{ userId, email, token }` |
| POST   | /auth/login                   | Authenticate user              | `{ email, password }`       | `{ userId, email, token }` |
| POST   | /auth/refresh                 | Refresh access token           | `{ refreshToken }`          | `{ token }`                |
| POST   | /auth/logout                  | Invalidate refresh token       | `{ refreshToken }`          | `204 No Content`           |
| POST   | /auth/password-reset          | Send password reset email      | `{ email }`                 | `202 Accepted`             |
| POST   | /auth/password-reset/complete | Set new password               | `{ token, newPassword }`    | `204 No Content`           |
| GET    | /auth/me                      | Get current authenticated user | _–_                         | `{ userId, email, name }`  |

### Data Store

-   PostgreSQL (`users` table)
-   Redis (refresh tokens blacklist, rate‑limit counters)

### Domain Events

-   `UserRegistered`
-   `UserLoggedIn`
-   `PasswordResetRequested`

### Non‑Functional Requirements

-   99.9% uptime
-   Rate limit: 100 req/min per IP
-   Strong password hashing (bcrypt/argon2)
-   OWASP compliance (CORS, CSRF, brute‑force protection)

---

## 2. User / Profile Service

### Responsibilities

-   Manage user profiles (name, avatar, preferences)
-   Watchlist CRUD
-   “Continue Watching” state (resume points)
-   Ratings & reviews

### API Endpoints (REST)

| Method | Path                                   | Description                 | Request Body                          | Response Body                              |
| ------ | -------------------------------------- | --------------------------- | ------------------------------------- | ------------------------------------------ |
| GET    | /profiles/{userId}                     | Fetch user profile          | _–_                                   | `{ userId, name, avatarUrl, preferences }` |
| PUT    | /profiles/{userId}                     | Update user profile         | `{ name?, avatarUrl?, preferences? }` | `{ userId, ...updatedFields }`             |
| GET    | /profiles/{userId}/watchlist           | List videos in watchlist    | _–_                                   | `[{ videoId, addedAt }]`                   |
| POST   | /profiles/{userId}/watchlist           | Add video to watchlist      | `{ videoId }`                         | `201 Created`                              |
| DELETE | /profiles/{userId}/watchlist/{videoId} | Remove video from watchlist | _–_                                   | `204 No Content`                           |
| GET    | /profiles/{userId}/history             | Get viewing history         | _–_                                   | `[{ videoId, watchedAt, progress }]`       |
| POST   | /profiles/{userId}/history             | Append history entry        | `{ videoId, progress }`               | `201 Created`                              |
| GET    | /profiles/{userId}/ratings             | Get all ratings by user     | _–_                                   | `[{ videoId, rating, comment, ratedAt }]`  |
| POST   | /profiles/{userId}/ratings             | Submit a rating/review      | `{ videoId, rating, comment? }`       | `201 Created`                              |

### Data Store

-   PostgreSQL (`profiles`, `watchlist`, `history`, `ratings` tables)
-   Redis (cache hot watchlists, history)

### Domain Events

-   `WatchlistUpdated`
-   `HistoryUpdated`
-   `VideoRated`

### Non‑Functional Requirements

-   Low read latency (< 50 ms)
-   Idempotent history writes

---

## 3. Video Management Service

### Responsibilities

-   CRUD video metadata (title, description, tags, thumbnails)
-   Trigger ingestion/transcoding workflows
-   Thumbnail generation

### API Endpoints (REST)

| Method | Path         | Description                   | Request Body                                     | Response Body                     |
| ------ | ------------ | ----------------------------- | ------------------------------------------------ | --------------------------------- |
| POST   | /videos      | Create new video entry        | `{ title, description, tags[], thumbnailUrl? }`  | `{ videoId, status: "pending" }`  |
| GET    | /videos/{id} | Retrieve metadata             | _–_                                              | `{ videoId, title, ..., status }` |
| GET    | /videos      | List videos (with pagination) | `?page&limit&filter`                             | `[{ video }, ...]`                |
| PUT    | /videos/{id} | Update metadata               | `{ title?, description?, tags?, thumbnailUrl? }` | `{ ...updatedMetadata }`          |
| DELETE | /videos/{id} | Delete video                  | _–_                                              | `204 No Content`                  |

### Data Store

-   PostgreSQL (`videos` table)
-   S3 (master uploads)

### Domain Events

-   `VideoCreated`
-   `VideoDeleted`
-   `VideoUploaded` (when raw file arrives in S3)

### Non‑Functional Requirements

-   Graceful backoff on S3 failures
-   Audit logs for admin actions

---

## 4. Transcoding Service

### Responsibilities

-   Consume `VideoUploaded` events
-   Transcode master video into ABR renditions (HLS/DASH)
-   Push renditions to S3

### Interface

-   **Subscriber** of `VideoUploaded` on message bus (Kafka/SQS/EventBridge)
-   **Publisher** of `VideoTranscoded` event when done

### Data Store

-   DynamoDB or PostgreSQL job table (idempotency, status)

### Non‑Functional Requirements

-   Parallelism: handle N concurrent jobs
-   Retry & dead‑letter queue on failure
-   FFMPEG tuning for quality vs. speed

---

## 5. Catalog & Search Service

### Responsibilities

-   Index video metadata in Elasticsearch / OpenSearch
-   Execute search queries with filters and pagination
-   Provide “related videos” lookup

### API Endpoints (REST)

| Method | Path                 | Description                 | Query Params                  | Response Body                  |
| ------ | -------------------- | --------------------------- | ----------------------------- | ------------------------------ |
| GET    | /search              | Full‑text search            | `?q=&genre=&year=&page&limit` | `[{ videoId, title, score }]`  |
| GET    | /videos/{id}/related | List related/similar videos | `?limit`                      | `[{ videoId, title, reason }]` |

### Data Store

-   Elasticsearch / OpenSearch index

### Domain Events

-   Subscribes to `VideoCreated` and `VideoTranscoded` for index updates

### Non‑Functional Requirements

-   Near‑real‑time indexing (< 5 sec lag)
-   Query latency < 100 ms

---

## 6. Playback & DRM License Service

### Responsibilities

-   Generate signed, time‑limited URLs for HLS/DASH manifests
-   Handle DRM license requests (Widevine, PlayReady, FairPlay)
-   Enforce entitlement checks

### API Endpoints (REST)

| Method | Path                         | Description                           | Request Body                  | Response Body         |
| ------ | ---------------------------- | ------------------------------------- | ----------------------------- | --------------------- |
| GET    | /playback/{videoId}/manifest | Obtain signed manifest URL            | `?token=JWT`                  | `{ manifestUrl }`     |
| POST   | /drm/license                 | Issue DRM license for encrypted track | `{ videoId, licenseRequest }` | `{ licenseResponse }` |

### Data Store

-   In‑memory / Redis for session tokens
-   Optional key store for DRM keys

### Non‑Functional Requirements

-   Latency < 50 ms per license request
-   TLS everywhere (mutual TLS for license endpoints)

---

## 7. Recommendation Service

### Responsibilities

-   Generate personalized “You may also like” lists
-   Support rule‑based and ML‑based models
-   Ingest user watch events for offline training

### API Endpoints (REST)

| Method | Path           | Description                      | Query Params    | Response Body          |
| ------ | -------------- | -------------------------------- | --------------- | ---------------------- |
| GET    | /recs/{userId} | Fetch recommendations for a user | `?limit`        | `[{ videoId, score }]` |
| POST   | /recs/train    | Trigger batch model retraining   | `{ modelType }` | `202 Accepted`         |

### Data Store

-   PostgreSQL or NoSQL for model inputs
-   Vector DB (optional) for embeddings

### Domain Events

-   Consumes `VideoWatched` / `VideoRated` from analytics bus

### Non‑Functional Requirements

-   Offline training every 24 h
-   API latency < 200 ms

---

## 8. Analytics / Logging Service

### Responsibilities

-   Ingest playback & user interaction events
-   Store and aggregate for dashboards and ML pipelines
-   Provide simple query endpoints for aggregate metrics

### API Endpoints (REST)

| Method | Path     | Description              | Request Body                                   | Response Body         |
| ------ | -------- | ------------------------ | ---------------------------------------------- | --------------------- |
| POST   | /events  | Ingest a batch of events | `[{ userId, eventType, timestamp, metadata }]` | `202 Accepted`        |
| GET    | /metrics | Query aggregated metrics | `?type=playbackErrors&from&to`                 | `{ count, series[] }` |

### Data Store

-   Kafka / Kinesis (ingestion)
-   ClickHouse / BigQuery (storage & OLAP)
-   Elasticsearch (optional for log search)

### Non‑Functional Requirements

-   High throughput (> 100 K events/s)
-   Exactly‑once or at‑least-once delivery semantics

---

## 9. Billing & Subscription Service

### Responsibilities

-   Manage subscription plans & entitlements
-   Integrate with payment gateway (Stripe)
-   Handle invoices, cancellations, trials

### API Endpoints (REST)

| Method | Path                       | Description                   | Request Body                        | Response Body                      |
| ------ | -------------------------- | ----------------------------- | ----------------------------------- | ---------------------------------- |
| POST   | /subscriptions             | Create new subscription       | `{ userId, planId, paymentMethod }` | `{ subscriptionId, status }`       |
| GET    | /subscriptions/{userId}    | Fetch user’s subscription     | _–_                                 | `{ subscriptionId, plan, status }` |
| POST   | /subscriptions/{id}/cancel | Cancel an active subscription | _–_                                 | `204 No Content`                   |
| GET    | /plans                     | List available plans          | _–_                                 | `[{ planId, name, price }]`        |

### Data Store

-   PostgreSQL (`subscriptions`, `plans` tables)

### Domain Events

-   `SubscriptionCreated`
-   `PaymentSucceeded`
-   `PaymentFailed`

### Non‑Functional Requirements

-   PCI DSS compliance
-   Webhooks durability (retry on failure)

---
