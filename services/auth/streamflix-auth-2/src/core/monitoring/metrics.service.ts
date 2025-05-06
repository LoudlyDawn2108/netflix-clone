import { Injectable } from '@nestjs/common';
import { Counter, Gauge, Histogram, Registry } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly registry: Registry;

  // Authentication metrics
  private readonly loginAttemptsCounter: Counter;
  private readonly loginSuccessCounter: Counter;
  private readonly loginFailureCounter: Counter;
  private readonly registrationCounter: Counter;
  private readonly tokenRefreshCounter: Counter;
  private readonly passwordResetsCounter: Counter;
  private readonly mfaAttemptsCounter: Counter;
  private readonly mfaSuccessCounter: Counter;

  // Performance metrics
  private readonly requestDurationHistogram: Histogram;
  private readonly databaseQueryDurationHistogram: Histogram;
  private readonly redisOperationDurationHistogram: Histogram;
  private readonly cacheHitRateGauge: Gauge;
  private readonly cacheHitCounter: Counter;
  private readonly cacheMissCounter: Counter;

  // Capacity metrics
  private readonly activeSessionsGauge: Gauge;
  private readonly redisConnectionPoolGauge: Gauge;
  private readonly databaseConnectionPoolGauge: Gauge;
  private readonly rateLimitedRequestsCounter: Counter;

  // SLI/SLO metrics
  private readonly availabilityGauge: Gauge;
  private readonly errorRateGauge: Gauge;
  private readonly p95LatencyGauge: Gauge;
  private readonly p99LatencyGauge: Gauge;

  // Additional cache metrics
  private readonly cacheSizeGauge: Gauge;
  private readonly tokenValidationCacheHitCounter: Counter;
  private readonly tokenValidationCacheMissCounter: Counter;

  constructor() {
    this.registry = new Registry();

    // Authentication metrics
    this.loginAttemptsCounter = new Counter({
      name: 'auth_login_attempts_total',
      help: 'Total number of login attempts',
      labelNames: ['method', 'success'],
      registers: [this.registry],
    });

    this.loginSuccessCounter = new Counter({
      name: 'auth_login_success_total',
      help: 'Total number of successful logins',
      labelNames: ['method'],
      registers: [this.registry],
    });

    this.loginFailureCounter = new Counter({
      name: 'auth_login_failures_total',
      help: 'Total number of failed logins',
      labelNames: ['method', 'reason'],
      registers: [this.registry],
    });

    this.registrationCounter = new Counter({
      name: 'auth_registrations_total',
      help: 'Total number of user registrations',
      labelNames: ['method', 'success'],
      registers: [this.registry],
    });

    this.tokenRefreshCounter = new Counter({
      name: 'auth_token_refresh_total',
      help: 'Total number of token refreshes',
      labelNames: ['success'],
      registers: [this.registry],
    });

    this.passwordResetsCounter = new Counter({
      name: 'auth_password_resets_total',
      help: 'Total number of password reset requests',
      labelNames: ['stage', 'success'],
      registers: [this.registry],
    });

    this.mfaAttemptsCounter = new Counter({
      name: 'auth_mfa_attempts_total',
      help: 'Total number of MFA verifications',
      labelNames: ['method', 'success'],
      registers: [this.registry],
    });

    this.mfaSuccessCounter = new Counter({
      name: 'auth_mfa_success_total',
      help: 'Total number of successful MFA verifications',
      labelNames: ['method'],
      registers: [this.registry],
    });

    // Performance metrics
    this.requestDurationHistogram = new Histogram({
      name: 'auth_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.01, 0.05, 0.1, 0.2, 0.5, 1, 2, 5],
      registers: [this.registry],
    });

    this.databaseQueryDurationHistogram = new Histogram({
      name: 'auth_database_query_duration_seconds',
      help: 'Database query duration in seconds',
      labelNames: ['operation', 'table'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
      registers: [this.registry],
    });

    this.redisOperationDurationHistogram = new Histogram({
      name: 'auth_redis_operation_duration_seconds',
      help: 'Redis operation duration in seconds',
      labelNames: ['operation'],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25],
      registers: [this.registry],
    });

    this.cacheHitRateGauge = new Gauge({
      name: 'auth_cache_hit_rate',
      help: 'Cache hit rate ratio',
      labelNames: ['cache_type'],
      registers: [this.registry],
    });

    this.cacheHitCounter = new Counter({
      name: 'auth_cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['cache_type'],
      registers: [this.registry],
    });

    this.cacheMissCounter = new Counter({
      name: 'auth_cache_misses_total',
      help: 'Total number of cache misses',
      labelNames: ['cache_type'],
      registers: [this.registry],
    });

    // Capacity metrics
    this.activeSessionsGauge = new Gauge({
      name: 'auth_active_sessions',
      help: 'Number of active sessions',
      registers: [this.registry],
    });

    this.redisConnectionPoolGauge = new Gauge({
      name: 'auth_redis_connection_pool',
      help: 'Redis connection pool stats',
      labelNames: ['state'],
      registers: [this.registry],
    });

    this.databaseConnectionPoolGauge = new Gauge({
      name: 'auth_database_connection_pool',
      help: 'Database connection pool stats',
      labelNames: ['state'],
      registers: [this.registry],
    });

    this.rateLimitedRequestsCounter = new Counter({
      name: 'auth_rate_limited_requests_total',
      help: 'Total number of rate limited requests',
      labelNames: ['endpoint'],
      registers: [this.registry],
    });

    // SLI/SLO metrics
    this.availabilityGauge = new Gauge({
      name: 'auth_availability_ratio',
      help: 'Service availability ratio (successful requests / total requests)',
      registers: [this.registry],
    });

    this.errorRateGauge = new Gauge({
      name: 'auth_error_rate_ratio',
      help: 'Error rate ratio (errors / total requests)',
      registers: [this.registry],
    });

    this.p95LatencyGauge = new Gauge({
      name: 'auth_p95_latency_seconds',
      help: 'P95 latency in seconds',
      labelNames: ['endpoint'],
      registers: [this.registry],
    });

    this.p99LatencyGauge = new Gauge({
      name: 'auth_p99_latency_seconds',
      help: 'P99 latency in seconds',
      labelNames: ['endpoint'],
      registers: [this.registry],
    });

    // Additional cache metrics initialization
    this.cacheSizeGauge = new Gauge({
      name: 'auth_cache_size',
      help: 'Number of items in each cache',
      labelNames: ['cache_type'],
      registers: [this.registry],
    });

    this.tokenValidationCacheHitCounter = new Counter({
      name: 'auth_token_validation_cache_hits_total',
      help: 'Total number of token validation cache hits',
      registers: [this.registry],
    });

    this.tokenValidationCacheMissCounter = new Counter({
      name: 'auth_token_validation_cache_misses_total',
      help: 'Total number of token validation cache misses',
      registers: [this.registry],
    });
  }

  // Get registry for metrics endpoint
  getRegistry(): Registry {
    return this.registry;
  }

  // Authentication metrics methods
  incrementLoginAttempts(method: string, success: boolean): void {
    this.loginAttemptsCounter.inc({ method, success: success.toString() });
    if (success) {
      this.loginSuccessCounter.inc({ method });
    }
  }

  incrementLoginFailure(method: string, reason: string): void {
    this.loginFailureCounter.inc({ method, reason });
  }

  incrementRegistration(method: string, success: boolean): void {
    this.registrationCounter.inc({ method, success: success.toString() });
  }

  incrementTokenRefresh(success: boolean): void {
    this.tokenRefreshCounter.inc({ success: success.toString() });
  }

  incrementPasswordReset(stage: string, success: boolean): void {
    this.passwordResetsCounter.inc({ stage, success: success.toString() });
  }

  incrementMfaAttempt(method: string, success: boolean): void {
    this.mfaAttemptsCounter.inc({ method, success: success.toString() });
    if (success) {
      this.mfaSuccessCounter.inc({ method });
    }
  }

  // Performance metrics methods
  observeRequestDuration(
    method: string,
    route: string,
    status: number,
    durationSeconds: number,
  ): void {
    this.requestDurationHistogram.observe(
      { method, route, status: status.toString() },
      durationSeconds,
    );
  }

  observeDatabaseQueryDuration(
    operation: string,
    table: string,
    durationSeconds: number,
  ): void {
    this.databaseQueryDurationHistogram.observe(
      { operation, table },
      durationSeconds,
    );
  }

  observeRedisOperationDuration(
    operation: string,
    durationSeconds: number,
  ): void {
    this.redisOperationDurationHistogram.observe(
      { operation },
      durationSeconds,
    );
  }

  observeCacheHitRate(cacheType: string, hit: number): void {
    if (hit === 1) {
      this.cacheHitCounter.inc({ cache_type: cacheType });
    } else {
      this.cacheMissCounter.inc({ cache_type: cacheType });
    }

    // Calculate and update hit rate
    const hits = this.cacheHitCounter.labels({ cache_type: cacheType }).get();
    const misses = this.cacheMissCounter
      .labels({ cache_type: cacheType })
      .get();
    const total = hits + misses;

    if (total > 0) {
      this.cacheHitRateGauge.set({ cache_type: cacheType }, hits / total);
    }
  }

  // Cache metrics methods
  observeCacheSize(cacheType: string, size: number): void {
    this.cacheSizeGauge.set({ cache_type: cacheType }, size);
  }

  observeTokenValidationCacheHitRate(hit: boolean): void {
    if (hit) {
      this.tokenValidationCacheHitCounter.inc();
    } else {
      this.tokenValidationCacheMissCounter.inc();
    }

    // Calculate and update hit rate
    const hits = this.tokenValidationCacheHitCounter.get();
    const misses = this.tokenValidationCacheMissCounter.get();
    const total = hits + misses;

    if (total > 0) {
      this.cacheHitRateGauge.set(
        { cache_type: 'token_validation' },
        hits / total,
      );
    }
  }

  // Capacity metrics methods
  setActiveSessions(count: number): void {
    this.activeSessionsGauge.set(count);
  }

  setRedisConnectionPool(active: number, idle: number, waiting: number): void {
    this.redisConnectionPoolGauge.set({ state: 'active' }, active);
    this.redisConnectionPoolGauge.set({ state: 'idle' }, idle);
    this.redisConnectionPoolGauge.set({ state: 'waiting' }, waiting);
  }

  setDatabaseConnectionPool(
    active: number,
    idle: number,
    waiting: number,
  ): void {
    this.databaseConnectionPoolGauge.set({ state: 'active' }, active);
    this.databaseConnectionPoolGauge.set({ state: 'idle' }, idle);
    this.databaseConnectionPoolGauge.set({ state: 'waiting' }, waiting);
  }

  incrementRateLimitedRequests(endpoint: string): void {
    this.rateLimitedRequestsCounter.inc({ endpoint });
  }

  // SLI/SLO metrics methods
  updateAvailabilityRatio(
    successfulRequests: number,
    totalRequests: number,
  ): void {
    if (totalRequests > 0) {
      this.availabilityGauge.set(successfulRequests / totalRequests);
    }
  }

  updateErrorRate(errorRequests: number, totalRequests: number): void {
    if (totalRequests > 0) {
      this.errorRateGauge.set(errorRequests / totalRequests);
    }
  }

  updateP95Latency(endpoint: string, latencySeconds: number): void {
    this.p95LatencyGauge.set({ endpoint }, latencySeconds);
  }

  updateP99Latency(endpoint: string, latencySeconds: number): void {
    this.p99LatencyGauge.set({ endpoint }, latencySeconds);
  }
}
