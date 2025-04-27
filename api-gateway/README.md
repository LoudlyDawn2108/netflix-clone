# API Gateway

The API Gateway is the unified entry point to the microservice ecosystem. It handles routing, security, performance, and observability so that downstream services can focus on business logic.

## Responsibilities

-   Request routing (path-, method-based, version-aware)
-   Aggregation / Backend-for-Frontend (fan-out)
-   Authentication & authorization enforcement
-   Traffic management: rate limiting, throttling, WAF integration
-   Protocol translation and payload transformations
-   Resilience: circuit breakers, retries, bulkheading
-   Caching and response optimization
-   Observability: metrics, logs, distributed tracing
-   Developer self-service: OpenAPI docs, mock endpoints

## Endpoints

All client traffic uses HTTPS. Swagger UI is exposed at `/docs`.

| Method | Path    | Purpose                                     |
| ------ | ------- | ------------------------------------------- |
| GET    | `/docs` | Swagger UI and OpenAPI schema               |
| Any    | `/*`    | Proxies and aggregates to internal services |

## Configuration & Deployment

-   Declarative config stored in YAML (`config/routes.yaml`, `config/security.yaml`)
-   Kubernetes Deployment with 3+ replicas, liveness and readiness probes
-   Horizontal Pod Autoscaler (CPU/latency-based scaling)
-   Canary and Blue/Green deployment via Helm
-   Configuration hot-reload via sidecar watching config CRDs

## Security & Traffic Management

-   TLS termination using cert-manager and NGINX Ingress
-   JWT validation via `jwks-rsa` and `express-jwt`
-   OAuth2 introspection for external clients
-   Rate limiting at edge: `rate-limiter-flexible` (1000 req/s per IP, burst control)
-   IP allow-list/deny-list via NGINX Ingress annotations
-   WAF rules enforced by ModSecurity sidecar

## Resilience & Performance

-   Circuit breaker using `opossum` with per-route thresholds
-   Retry policy: 3 attempts with exponential backoff (100ms, 200ms, 400ms)
-   Bulkheading: isolate calls per client via connection pools
-   Response caching in Redis (TTL 60s) and ETag support
-   Request collapsing: dedupe concurrent identical calls using `batcher.js`

## Observability

-   Metrics exported in Prometheus format (`/metrics` endpoint)
-   Structured JSON access logs sent to ELK/Loki via Filebeat
-   Distributed tracing: W3C Trace Context propagated, recorded via OpenTelemetry
-   Alerts: HTTP 5xx rate >1% in 5m; latency p95 >200ms

## Data Flow

1. Client HTTPS → Ingress Controller → API Gateway
2. Validate JWT / API key, enforce ACLs
3. Rate-limit and WAF inspection
4. Route or aggregate calls to internal microservices via HTTP/gRPC
5. Apply circuit breakers, retries, caching
6. Log metrics, traces, and structured access logs
7. Return consolidated response to client
