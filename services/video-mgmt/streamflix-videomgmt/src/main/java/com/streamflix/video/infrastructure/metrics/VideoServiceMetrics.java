package com.streamflix.video.infrastructure.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Timer;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Component;

import java.util.function.Supplier;

/**
 * Metrics for VideoService operations.
 */
@Component
public class VideoServiceMetrics {

    private final Counter createCounter;
    private final Counter updateCounter;
    private final Counter deleteCounter;
    private final Timer serviceTimer;

    public VideoServiceMetrics(MeterRegistry registry) {
        this.createCounter = Counter.builder("video.service.created.count")
                .description("Number of videos created")
                .register(registry);
        this.updateCounter = Counter.builder("video.service.updated.count")
                .description("Number of videos updated")
                .register(registry);
        this.deleteCounter = Counter.builder("video.service.deleted.count")
                .description("Number of videos deleted")
                .register(registry);
        this.serviceTimer = Timer.builder("video.service.execution.time")
                .description("Time taken by VideoService methods")
                .register(registry);
    }

    public void incrementCreate() {
        createCounter.increment();
    }

    public void incrementUpdate() {
        updateCounter.increment();
    }

    public void incrementDelete() {
        deleteCounter.increment();
    }

    public <T> T recordExecution(Supplier<T> supplier) {
        return serviceTimer.record(supplier);
    }

    public void recordExecution(Runnable runnable) {
        serviceTimer.record(runnable);
    }
}
