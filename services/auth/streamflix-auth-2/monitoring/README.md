# Streamflix Auth Service Observability Stack

This directory contains the configuration for the observability and monitoring stack for the Streamflix Authentication Service.

## Components

- **Structured Logging**: JSON-formatted logs with correlation IDs for request tracing
- **Prometheus Metrics**: Performance, business, and SLI/SLO metrics collection
- **Grafana Dashboards**: Visualization of metrics with pre-configured dashboards
- **Jaeger Tracing**: Distributed tracing for request flows through the system
- **Health Checks**: Enhanced health monitoring with component health reporting

## Getting Started

To start the complete system with monitoring:

```bash
docker-compose -f docker-compose.observability.yml up -d
```

## Available Endpoints

- **Auth Service**: http://localhost:3000
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin)
- **Jaeger UI**: http://localhost:16686
- **Alert Manager**: http://localhost:9093

## Monitoring Features

### Metrics

The authentication service exposes Prometheus metrics at `/api/metrics` that include:

- Authentication attempts and success rates
- Request durations by endpoint
- Database and Redis connection pool statistics
- Active user sessions
- Rate limiting statistics

### Health Checks

Health status is available at:

- `/api/health` - Overall service health with component details
- `/api/health/liveness` - Simple liveness probe for container orchestration
- `/api/health/readiness` - Readiness probe that checks all dependencies

### Traces

The service sends OpenTelemetry traces to Jaeger, which can be visualized in the Jaeger UI.

### Dashboards

Pre-configured Grafana dashboards are available for:

1. **Auth Metrics Dashboard**: Authentication service performance metrics
2. **Auth Tracing Dashboard**: Visualization of distributed traces

## Alert Rules

The system includes pre-configured alert rules for:

- Service availability issues
- High login failure rates
- API performance degradation
- Database connection pool depletion
- Potential security threats (rate limiting triggers)
- High error rates
- Redis connectivity issues

## Environment Variables

Configure observability components using these environment variables:

```
LOG_LEVEL=info               # Logging level (debug, info, warn, error)
LOGS_DIR=logs                # Directory for log files
TRACING_ENABLED=true         # Enable/disable tracing
OTLP_ENDPOINT=http://jaeger:4318/v1/traces  # OpenTelemetry endpoint
PROMETHEUS_ENABLED=true      # Enable/disable Prometheus metrics
SERVICE_VERSION=1.0.0        # Service version for metrics/traces
```
