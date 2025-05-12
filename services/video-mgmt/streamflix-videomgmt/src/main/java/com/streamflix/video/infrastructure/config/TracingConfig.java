package com.streamflix.video.infrastructure.config;

import io.opentelemetry.api.OpenTelemetry;
import io.opentelemetry.api.trace.Tracer;
import io.opentelemetry.sdk.OpenTelemetrySdk;
import io.opentelemetry.sdk.trace.SdkTracerProvider;
import io.opentelemetry.sdk.trace.export.SimpleSpanProcessor;
import io.opentelemetry.exporter.jaeger.JaegerGrpcSpanExporter;
import io.opentelemetry.sdk.trace.samplers.Sampler;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class TracingConfig {

    @Value("${otel.exporter.jaeger.endpoint:http://localhost:14250}")
    private String jaegerEndpoint;

    @Value("${otel.traces.sampler:always_on}")
    private String samplerType;

    @Bean
    public SdkTracerProvider tracerProvider() {
        JaegerGrpcSpanExporter jaegerExporter = JaegerGrpcSpanExporter.builder()
                .setEndpoint(jaegerEndpoint)
                .build();
        var builder = SdkTracerProvider.builder()
                .addSpanProcessor(SimpleSpanProcessor.create(jaegerExporter));
        if ("always_on".equalsIgnoreCase(samplerType)) {
            builder.setSampler(Sampler.alwaysOn());
        } else {
            builder.setSampler(Sampler.parentBased(Sampler.alwaysOn()));
        }
        return builder.build();
    }

    @Bean
    public OpenTelemetry openTelemetry(SdkTracerProvider tracerProvider) {
        return OpenTelemetrySdk.builder()
                .setTracerProvider(tracerProvider)
                .buildAndRegisterGlobal();
    }

    @Bean
    public Tracer tracer(OpenTelemetry openTelemetry) {
        return openTelemetry.getTracer("com.streamflix.video");
    }
}
