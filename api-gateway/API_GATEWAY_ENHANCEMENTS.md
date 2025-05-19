# API Gateway Enhancements for Loose Coupling

These recommendations will enhance the API Gateway to better support loosely coupled services, with specific focus on improving the integration with the Laravel Recommendation Service.

## Recommended Enhancements

### 1. Service Discovery Integration

```yaml
# Example configuration for service discovery integration
serviceDiscovery:
    provider: kubernetes # or consul, eureka
    namespaces: ["netflix-microservices"]
    refreshInterval: 60s # How often to refresh service registry
    serviceLabels:
        app.kubernetes.io/part-of: netflix-clone
```

This allows the API Gateway to dynamically discover services without hardcoded endpoints, enhancing loose coupling.

### 2. API Versioning Support

Extend route configuration to support explicit API versioning:

```yaml
routes:
    - path: "/api/v1/recs/:userId"
      service: recommendation-service
      version: "1"
      methods: ["GET"]
      timeout: 3s
    - path: "/api/v2/recs/:userId"
      service: recommendation-service
      version: "2"
      methods: ["GET"]
      timeout: 3s
```

This ensures backward compatibility as the Recommendation Service evolves.

### 3. Circuit Breaker Configuration

Enhance circuit breaker configuration with service-specific settings:

```javascript
// Circuit breaker config for recommendation service
const recommendationCircuitBreakerOptions = {
    timeout: 3000, // 3 seconds
    errorThresholdPercentage: 50,
    resetTimeout: 30000, // 30 seconds
    fallbackFunction: async (req, res) => {
        // Return cached or default recommendations
        res.json({
            source: "fallback",
            recommendations: defaultRecommendations,
        });
    },
};
```

This provides service-specific resilience patterns.

### 4. Schema Validation Middleware

Add OpenAPI schema validation for requests/responses:

```javascript
// Middleware to validate requests against OpenAPI schema
const validateRequest = (req, res, next) => {
    const schema = getSchemaForEndpoint(req.path, req.method);
    const validationResult = validate(req.body, schema);

    if (!validationResult.valid) {
        return res.status(400).json({
            error: "Invalid request format",
            details: validationResult.errors,
        });
    }

    next();
};
```

This enforces API contracts between clients and backend services.

### 5. Response Transformation Layer

Add configurable response transformation to standardize responses:

```javascript
// Response transformer for recommendation service
const recommendationTransformer = (serviceResponse) => {
    return {
        recommendations: serviceResponse.items.map((item) => ({
            id: item.id,
            title: item.video.title,
            thumbnailUrl: item.video.thumbnailUrl,
            score: item.relevanceScore,
            reason: item.reason || null,
        })),
        metadata: {
            count: serviceResponse.items.length,
            source: serviceResponse.source,
            generatedAt: new Date().toISOString(),
        },
    };
};
```

This provides a consistent API contract to clients regardless of backend service implementation details.

### 6. API Gateway Event Publishing

Extend the API Gateway to publish events to Kafka:

```javascript
// Publish API usage events
const publishApiUsageEvent = (req, res, responseTime) => {
    const event = {
        path: req.path,
        method: req.method,
        userId: req.user?.sub || "anonymous",
        timestamp: new Date().toISOString(),
        responseTime,
        statusCode: res.statusCode,
    };

    kafkaProducer.send({
        topic: "api-gateway.request-completed",
        messages: [{ value: JSON.stringify(event) }],
    });
};
```

This allows services like the Recommendation Service to consume usage data without direct coupling.

## Implementation Priority

1. **High Priority**: Service Discovery Integration and Circuit Breaker Configuration
2. **Medium Priority**: API Versioning Support and Schema Validation
3. **Lower Priority**: Response Transformation and Event Publishing

These enhancements will ensure that the API Gateway properly supports the loose coupling design of the Laravel Recommendation Service.
