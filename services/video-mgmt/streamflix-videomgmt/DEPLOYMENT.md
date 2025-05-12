# Production Deployment Guide

This guide explains how to build, configure and deploy the Video Management Service in a production environment.

## Building the Production Image

The production Docker image uses a multi-stage build process to create an optimized container with a small footprint, security enhancements, and proper health checks.

```bash
# Build the production Docker image
docker build -f Dockerfile.production -t streamflix-video-mgmt:latest .
```

## Container Configuration

### Environment Variables

The container supports the following environment variables:

| Variable                                      | Description                 | Default                                  |
| --------------------------------------------- | --------------------------- | ---------------------------------------- |
| `SPRING_PROFILES_ACTIVE`                      | Active Spring profile       | `prod`                                   |
| `JAVA_OPTS`                                   | JVM configuration options   | `-XX:MaxRAMPercentage=75.0 -XX:+UseG1GC` |
| `SERVER_SHUTDOWN`                             | Shutdown mode               | `graceful`                               |
| `SPRING_LIFECYCLE_TIMEOUT-PER-SHUTDOWN-PHASE` | Shutdown timeout            | `30s`                                    |
| `WAIT_FOR_HOST`                               | Dependency host to wait for | -                                        |
| `WAIT_FOR_PORT`                               | Dependency port to wait for | -                                        |

### Resource Limits

In production, configure container resource limits:

```yaml
resources:
    requests:
        cpu: 500m
        memory: 1Gi
    limits:
        cpu: 1
        memory: 2Gi
```

## Health Checks

The service provides the following health endpoints:

-   `/actuator/health` - Overall health status
-   `/actuator/health/liveness` - Container liveness check (is the application running?)
-   `/actuator/health/readiness` - Container readiness check (can the application accept traffic?)

## Production Best Practices

1. **Resource Configuration**:

    - Set appropriate memory limits based on expected load
    - Configure the JVM to use a percentage of available memory with `-XX:MaxRAMPercentage=75.0`

2. **Graceful Shutdown**:

    - The container is configured to handle graceful shutdowns
    - Set `SPRING_LIFECYCLE_TIMEOUT-PER-SHUTDOWN-PHASE` to adjust shutdown timeout

3. **Metrics and Monitoring**:

    - Prometheus endpoint available at `/actuator/prometheus`
    - Configure appropriate scraping in your monitoring system

4. **Security**:
    - No unnecessary packages installed in the container
    - Uses a non-root user for running the application
    - Minimal attack surface

## Kubernetes Deployment

A sample Kubernetes deployment configuration is provided in the `kubernetes/deployment.yaml` file with properly configured:

-   Resource requests/limits
-   Liveness/readiness/startup probes
-   Environment variables
-   Secrets and ConfigMaps references

## Example Docker Run Command

```bash
docker run -d \
  --name video-mgmt \
  -p 8080:8080 \
  -e SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/streamflix_videos \
  -e SPRING_DATASOURCE_USERNAME=postgres \
  -e SPRING_DATASOURCE_PASSWORD=postgres \
  -e KAFKA_BOOTSTRAP_SERVERS=kafka:29092 \
  -e S3_ENDPOINT=http://minio:9000 \
  -e S3_ACCESS_KEY=minioadmin \
  -e S3_SECRET_KEY=minioadmin \
  -e WAIT_FOR_HOST=postgres \
  -e WAIT_FOR_PORT=5432 \
  -e JAVA_OPTS="-XX:MaxRAMPercentage=75.0 -XX:+UseG1GC -Xms512m -Xmx1024m" \
  --health-cmd="curl -f http://localhost:8080/actuator/health/liveness || exit 1" \
  --health-interval=30s \
  --health-timeout=10s \
  --health-retries=3 \
  --health-start-period=60s \
  --restart=unless-stopped \
  streamflix-video-mgmt:latest
```
