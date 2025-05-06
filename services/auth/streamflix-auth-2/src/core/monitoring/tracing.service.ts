import { Injectable, OnModuleInit } from '@nestjs/common';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { LoggerService } from '../logging/logger.service';

@Injectable()
export class TracingService implements OnModuleInit {
  private sdk: NodeSDK;

  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('TracingService');
  }

  onModuleInit() {
    try {
      // Only initialize tracing if it's enabled in the environment
      if (process.env.TRACING_ENABLED === 'true') {
        this.initTracing();
      } else {
        this.logger.info('OpenTelemetry tracing is disabled');
      }
    } catch (error) {
      this.logger.error('Failed to initialize OpenTelemetry tracing', error);
    }
  }

  private initTracing() {
    const otelExporter =
      process.env.OTLP_ENDPOINT || 'http://localhost:4318/v1/traces';

    this.sdk = new NodeSDK({
      resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: 'streamflix-auth-service',
        [SemanticResourceAttributes.SERVICE_VERSION]:
          process.env.SERVICE_VERSION || '1.0.0',
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]:
          process.env.NODE_ENV || 'development',
      }),
      traceExporter: new OTLPTraceExporter({
        url: otelExporter,
      }),
      instrumentations: [
        getNodeAutoInstrumentations({
          // Enable all auto-instrumentations with specific options
          '@opentelemetry/instrumentation-http': {
            enabled: true,
            ignoreIncomingPaths: ['/health', '/metrics'],
          },
          '@opentelemetry/instrumentation-express': { enabled: true },
          '@opentelemetry/instrumentation-nestjs-core': { enabled: true },
          '@opentelemetry/instrumentation-pg': { enabled: true },
          '@opentelemetry/instrumentation-redis': { enabled: true },
          '@opentelemetry/instrumentation-winston': { enabled: true },
        }),
      ],
    });

    // Start the OpenTelemetry SDK
    this.sdk.start();
    this.logger.info('OpenTelemetry tracing initialized', {
      endpoint: otelExporter,
    });
  }

  // Method to add custom attributes to the current span
  addSpanAttributes(
    attributes: Record<string, string | number | boolean>,
  ): void {
    // This is just a stub for now as we're using auto-instrumentation
    // In the future, we might want to add manual instrumentation for specific spans
  }

  // Method to create a custom span
  createSpan(name: string, fn: () => Promise<any>): Promise<any> {
    // This is just a stub for now as we're using auto-instrumentation
    // In the future, we might want to add manual spans for specific operations
    return fn();
  }
}
