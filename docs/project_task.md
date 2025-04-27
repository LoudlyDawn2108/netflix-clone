# Netflix‑Style Streaming Service – Project Board Tasks

Columns (GitHub Projects / Trello):

-   Backlog
-   To Do
-   In Progress
-   In Review
-   Done

Labels / Epics:  
`gateway` `auth` `profile` `video-mgmt` `transcoding` `catalog` `search` `playback` `drm` `rec` `analytics` `billing` `infra` `observability` `ci-cd` `frontend`

---

## Epic: API Gateway (gateway)

-   [ ] Define request routing & API composition patterns (Backlog)
-   [ ] Configure authentication & authorization flows (Backlog)
-   [ ] Implement rate‑limiting & security policies (Backlog)
-   [ ] Integrate OpenAPI/Swagger gateway docs (Backlog)

## Epic: Authentication Service (auth)

-   [ ] Design database schema for `users` table (Backlog)
-   [ ] Implement POST `/auth/signup` endpoint (To Do)
-   [ ] Implement POST `/auth/login` endpoint with JWT issuance (To Do)
-   [ ] Add POST `/auth/refresh` and `/auth/logout` flows (Backlog)
-   [ ] Integrate OAuth (Google/GitHub) sign‑in (Backlog)
-   [ ] Write unit tests and API tests for auth flows (Backlog)
-   [ ] Add rate‑limiting & brute‑force protection (Backlog)

## Epic: User / Profile Service (profile)

-   [ ] Design schema for profiles, watchlist, history, ratings (Backlog)
-   [ ] Implement GET/PUT `/profiles/{userId}` (To Do)
-   [ ] Implement watchlist CRUD (`/profiles/{userId}/watchlist`) (To Do)
-   [ ] Implement history tracking (`/profiles/{userId}/history`) (Backlog)
-   [ ] Implement ratings & reviews (`/profiles/{userId}/ratings`) (Backlog)
-   [ ] Cache hot data in Redis (Backlog)
-   [ ] Write tests for profile endpoints (Backlog)

## Epic: Video Management Service (video-mgmt)

-   [ ] Design `videos` metadata schema (Backlog)
-   [ ] Implement POST `/videos` (create metadata entry) (To Do)
-   [ ] Build admin UI or CLI to upload master files (Backlog)
-   [ ] Implement GET/PUT/DELETE `/videos/{id}` (Backlog)
-   [ ] Emit `VideoUploaded` event on S3 master upload (Backlog)
-   [ ] Generate thumbnails on metadata creation (Backlog)
-   [ ] API tests for CRUD operations (Backlog)

## Epic: Transcoding Service (transcoding)

-   [ ] Set up event bus subscription to `VideoUploaded` (Backlog)
-   [ ] Write FFMPEG job runner (Docker/Lambda/Fargate) (To Do)
-   [ ] Push HLS/DASH renditions to S3 (To Do)
-   [ ] Emit `VideoTranscoded` event when done (Backlog)
-   [ ] Implement retry & DLQ on failure (Backlog)
-   [ ] Performance tests for transcoding pipeline (Backlog)

## Epic: Catalog & Search Service (catalog + search)

-   [ ] Provision Elasticsearch index (Backlog)
-   [ ] Subscribe to `VideoCreated`/`VideoTranscoded` events to index metadata (To Do)
-   [ ] Implement REST GET `/search?q=&genre=&year=` (Backlog)
-   [ ] Implement GET `/videos/{id}/related` (Backlog)
-   [ ] Add pagination & filtering support (Backlog)
-   [ ] Query performance testing (<100 ms) (Backlog)

## Epic: Playback & DRM License Service (playback + drm)

-   [ ] Design token‑signing scheme for manifests (Backlog)
-   [ ] Implement GET `/playback/{videoId}/manifest` signed URLs (To Do)
-   [ ] Integrate Widevine / PlayReady / FairPlay license endpoint (Backlog)
-   [ ] Enforce entitlement checks per request (Backlog)
-   [ ] Write integration tests for playback flow (Backlog)

## Epic: Recommendation Service (rec)

-   [ ] Collect `VideoWatched`/`VideoRated` events (Backlog)
-   [ ] Implement rule‑based recommendations endpoint GET `/recs/{userId}` (Backlog)
-   [ ] Prototype batch model training (`/recs/train`) (Backlog)
-   [ ] Expose ML‑based recommendations (future) (Backlog)
-   [ ] Validate recommendation quality (Backlog)

## Epic: Analytics / Logging Service (analytics)

-   [ ] Provision Kafka / Kinesis topic for events (Backlog)
-   [ ] Implement POST `/events` ingest endpoint (To Do)
-   [ ] Stream events into ClickHouse / BigQuery (Backlog)
-   [ ] Build basic dashboards for event analytics (Backlog)
-   [ ] Set up ELK/EFK stack for logs (Backlog)
-   [ ] Correlate logs with distributed traces (Backlog)
-   [ ] Implement distributed tracing (Backlog)
-   [ ] Write load tests for ingestion endpoints (Backlog)

## Epic: Billing & Subscription Service (billing)

-   [ ] Design subscription plans schema (Backlog)
-   [ ] Integrate Stripe/PayPal for payments (To Do)
-   [ ] Implement POST `/billing/subscribe`, `/billing/unsubscribe` (To Do)
-   [ ] Handle webhook events for payment status (To Do)
-   [ ] Generate invoices & payment history endpoint `/billing/{userId}/invoices` (Backlog)
-   [ ] Schedule recurring billing jobs (Backlog)
-   [ ] Write tests for billing flows (Backlog)
-   [ ] Ensure PCI compliance & security audits (Backlog)

## Epic: Infrastructure (infra)

-   [ ] Define cloud infrastructure architecture diagram (Backlog)
-   [ ] Containerize services with Docker (To Do)
-   [ ] Write Kubernetes manifests & Helm charts (Backlog)
-   [ ] Provision and configure Kubernetes cluster (Backlog)
-   [ ] Set up service mesh (Istio/Linkerd) (Backlog)
-   [ ] Configure autoscaling & load balancing (Backlog)
-   [ ] Manage secrets with Vault/KMS (Backlog)
-   [ ] Implement blue-green / canary deployments (Backlog)
-   [ ] Automate IaC with Terraform (To Do)

## Epic: Observability & Monitoring (observability)

-   [ ] Instrument services for metrics collection (Prometheus) (To Do)
-   [ ] Set up Grafana dashboards & alerts (Backlog)
-   [ ] Configure alerting (PagerDuty/Slack) for SLO breaches (Backlog)
-   [ ] Implement tracing spans (Zipkin/Jaeger) (Backlog)
-   [ ] Centralize logs in ELK/EFK stack (Backlog)
-   [ ] Define SLOs/SLIs/SLAs (Backlog)

## Epic: CI/CD (ci-cd)

-   [ ] Define monorepo / multi-repo strategy (Backlog)
-   [ ] Set up GitHub Actions pipelines for build & test (To Do)
-   [ ] Publish Docker images to registry (To Do)
-   [ ] Deploy to staging & production automatically (Backlog)
-   [ ] Run security scans & linting on PRs (Backlog)
-   [ ] Automate database migrations (Backlog)
-   [ ] Implement feature flag framework & rollback strategy (Backlog)

## Epic: Frontend Application (frontend)

-   [ ] Scaffold React/Angular/Vue project structure (To Do)
-   [ ] Implement responsive layouts for Home, Search, Video pages (Backlog)
-   [ ] Integrate Auth (signup/login) flows with backend (To Do)
-   [ ] Fetch and render video catalog (To Do)
-   [ ] Build video player component with HLS/DASH support (Backlog)
-   [ ] Manage app state (Redux/Vuex/MobX) and handle user session (Backlog)
-   [ ] Create Watchlist & Profile pages (Backlog)
-   [ ] Add unit and integration tests (Jest/Testing Library) (Backlog)
-   [ ] Set up E2E tests (Cypress/Playwright) (Backlog)
-   [ ] CI pipeline for linting, testing, and production build (Backlog)

## Epic: Architecture & Design

-   [ ] Create high-level system architecture diagram (Backlog)
-   [ ] Define microservice boundaries & data flow (To Do)
-   [ ] Document API contracts in OpenAPI/Swagger (Backlog)
-   [ ] Plan CDN integration for low-latency video delivery (Backlog)
-   [ ] Design caching strategy (Redis, CDN) (Backlog)
-   [ ] Define security, compliance, and DR strategy (Backlog)
-   [ ] Draft backup & recovery procedures (Backlog)

## Sprint Plan (2‑week intervals)

### Sprint 1 (Weeks 1–2)

-   [x] Create high-level system architecture diagram (Epic: Architecture & Design)
-   [x] Define microservice boundaries & data flow (Epic: Architecture & Design)
-   [ ] Define security, compliance, and DR strategy (Epic: Architecture & Design)
-   [ ] Draft backup & recovery procedures (Epic: Architecture & Design)
-   [x] Define cloud infrastructure architecture diagram (Epic: Infrastructure)
-   [ ] Containerize services with Docker (Epic: Infrastructure)
-   [ ] Automate IaC with Terraform (Epic: Infrastructure)
-   [ ] Write Kubernetes manifests & Helm charts (Epic: Infrastructure)
-   [ ] Provision and configure Kubernetes cluster (Epic: Infrastructure)
-   [ ] Define monorepo / multi-repo strategy (Epic: CI/CD)
-   [ ] Set up GitHub Actions pipelines for build & test (Epic: CI/CD)
-   [ ] Publish Docker images to registry (Epic: CI/CD)
-   [ ] Scaffold React/Angular/Vue project structure (Epic: Frontend Application)
-   [ ] Design database schema for `users` table (Epic: Authentication Service)
-   [ ] Design schema for profiles, watchlist, history, ratings (Epic: User/Profile Service)
-   [ ] Design `videos` metadata schema (Epic: Video Management Service)

### Sprint 2 (Weeks 3–4)

-   [ ] Define request routing & API composition patterns (Epic: API Gateway)
-   [ ] Configure authentication & authorization flows (Epic: API Gateway)
-   [ ] Implement rate‑limiting & security policies (Epic: API Gateway)
-   [ ] Integrate OpenAPI/Swagger gateway docs (Epic: API Gateway)
-   [ ] Implement POST `/auth/signup` endpoint (Epic: Authentication Service)
-   [ ] Implement POST `/auth/login` endpoint with JWT issuance (Epic: Authentication Service)
-   [ ] Add POST `/auth/refresh` and `/auth/logout` flows (Epic: Authentication Service)
-   [ ] Integrate OAuth (Google/GitHub) sign‑in (Epic: Authentication Service)
-   [ ] Write unit tests and API tests for auth flows (Epic: Authentication Service)
-   [ ] Add rate‑limiting & brute‑force protection (Epic: Authentication Service)
-   [ ] Integrate Auth flows with frontend (Epic: Frontend Application)
-   [ ] Implement GET/PUT `/profiles/{userId}` (Epic: User/Profile Service)
-   [ ] Implement watchlist CRUD (`/profiles/{userId}/watchlist`) (Epic: User/Profile Service)
-   [ ] Cache hot data in Redis (Epic: User/Profile Service)

### Sprint 3 (Weeks 5–6)

-   [ ] Implement POST `/videos` (create metadata entry) (Epic: Video Management Service)
-   [ ] Build admin UI/CLI to upload master files (Epic: Video Management Service)
-   [ ] Implement GET/PUT/DELETE `/videos/{id}` (Epic: Video Management Service)
-   [ ] Emit `VideoUploaded` event on S3 master upload (Epic: Video Management Service)
-   [ ] Generate thumbnails on metadata creation (Epic: Video Management Service)
-   [ ] API tests for CRUD operations (Epic: Video Management Service)
-   [ ] Set up event bus subscription to `VideoUploaded` (Epic: Transcoding Service)
-   [ ] Write FFMPEG job runner (Docker/Lambda/Fargate) (Epic: Transcoding Service)
-   [ ] Push HLS/DASH renditions to S3 (Epic: Transcoding Service)
-   [ ] Emit `VideoTranscoded` event when done (Epic: Transcoding Service)
-   [ ] Implement retry & DLQ on failure (Epic: Transcoding Service)
-   [ ] Performance tests for transcoding pipeline (Epic: Transcoding Service)

### Sprint 4 (Weeks 7–8)

-   [ ] Provision Elasticsearch index (Epic: Catalog & Search Service)
-   [ ] Subscribe to `VideoCreated`/`VideoTranscoded` events to index metadata (Epic: Catalog & Search Service)
-   [ ] Implement REST GET `/search?q=&genre=&year=` (Epic: Catalog & Search Service)
-   [ ] Implement GET `/videos/{id}/related` (Epic: Catalog & Search Service)
-   [ ] Add pagination & filtering support (Epic: Catalog & Search Service)
-   [ ] Query performance testing (<100 ms) (Epic: Catalog & Search Service)
-   [ ] Design token‑signing scheme for manifests (Epic: Playback & DRM)
-   [ ] Implement GET `/playback/{videoId}/manifest` signed URLs (Epic: Playback & DRM)
-   [ ] Integrate Widevine / PlayReady / FairPlay license endpoint (Epic: Playback & DRM)
-   [ ] Enforce entitlement checks per request (Epic: Playback & DRM)
-   [ ] Write integration tests for playback flow (Epic: Playback & DRM)
-   [ ] Instrument services for metrics collection (Epic: Observability & Monitoring)
-   [ ] Set up Grafana dashboards & alerts (Epic: Observability & Monitoring)
-   [ ] Configure alerting (PagerDuty/Slack) for SLO breaches (Epic: Observability & Monitoring)

### Sprint 5 (Weeks 9–10)

-   [ ] Collect `VideoWatched`/`VideoRated` events (Epic: Recommendation Service)
-   [ ] Implement rule‑based recommendations endpoint GET `/recs/{userId}` (Epic: Recommendation Service)
-   [ ] Prototype batch model training (`/recs/train`) (Epic: Recommendation Service)
-   [ ] Expose ML‑based recommendations (future) (Epic: Recommendation Service)
-   [ ] Validate recommendation quality (Epic: Recommendation Service)
-   [ ] Provision Kafka / Kinesis topic for events (Epic: Analytics / Logging Service)
-   [ ] Implement POST `/events` ingest endpoint (Epic: Analytics / Logging Service)
-   [ ] Stream events into ClickHouse / BigQuery (Epic: Analytics / Logging Service)
-   [ ] Build basic dashboards for event analytics (Epic: Analytics / Logging Service)
-   [ ] Set up ELK/EFK stack for logs (Epic: Analytics / Logging Service)
-   [ ] Correlate logs with distributed traces (Epic: Analytics / Logging Service)
-   [ ] Design subscription plans schema (Epic: Billing & Subscription)
-   [ ] Integrate Stripe/PayPal for payments (Epic: Billing & Subscription)
-   [ ] Implement POST `/billing/subscribe`, `/billing/unsubscribe` (Epic: Billing & Subscription)
-   [ ] Handle webhook events for payment status (Epic: Billing & Subscription)
-   [ ] Write tests for billing flows (Epic: Billing & Subscription)

### Sprint 6 (Weeks 11–12)

-   [ ] Schedule recurring billing jobs (Epic: Billing & Subscription)
-   [ ] Generate invoices & payment history endpoint `/billing/{userId}/invoices` (Epic: Billing & Subscription)
-   [ ] Ensure PCI compliance & security audits (Epic: Billing & Subscription)
-   [ ] Run security scans & linting on PRs (Epic: CI/CD)
-   [ ] Automate database migrations (Epic: CI/CD)
-   [ ] Implement feature flag framework & rollback strategy (Epic: CI/CD)
-   [ ] Deploy to staging & production automatically (Epic: CI/CD)
-   [ ] Implement blue‑green / canary deployments (Epic: Infrastructure)
-   [ ] Implement distributed tracing (Epic: Analytics / Logging Service)
-   [ ] Write load tests for ingestion endpoints (Epic: Analytics / Logging Service)
-   [ ] Implement responsive layouts for Home, Search, Video pages (Epic: Frontend Application)
-   [ ] Fetch and render video catalog (Epic: Frontend Application)
-   [ ] Manage app state and handle user session (Epic: Frontend Application)
-   [ ] Set up E2E tests (Epic: Frontend Application)
