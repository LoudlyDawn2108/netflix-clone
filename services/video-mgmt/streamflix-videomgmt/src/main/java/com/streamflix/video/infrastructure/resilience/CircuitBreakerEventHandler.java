package com.streamflix.video.infrastructure.resilience;

import io.github.resilience4j.circuitbreaker.event.CircuitBreakerOnErrorEvent;
import io.github.resilience4j.circuitbreaker.event.CircuitBreakerOnSuccessEvent;
import io.github.resilience4j.circuitbreaker.event.CircuitBreakerOnStateTransitionEvent;
import io.github.resilience4j.core.registry.EntryAddedEvent;
import io.github.resilience4j.core.registry.EntryRemovedEvent;
import io.github.resilience4j.core.registry.EntryReplacedEvent;
import io.github.resilience4j.core.registry.RegistryEventConsumer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class CircuitBreakerEventHandler implements RegistryEventConsumer<io.github.resilience4j.circuitbreaker.CircuitBreaker> {

    private static final Logger logger = LoggerFactory.getLogger(CircuitBreakerEventHandler.class);

    @Override
    public void onEntryAddedEvent(EntryAddedEvent<io.github.resilience4j.circuitbreaker.CircuitBreaker> entryAddedEvent) {
        entryAddedEvent.getAddedEntry().getEventPublisher()
            .onSuccess(this::onSuccess)
            .onError(this::onError)
            .onStateTransition(this::onStateTransition);
        logger.info("CircuitBreaker registry event: '{}'", entryAddedEvent.getEventType());
    }

    @Override
    public void onEntryRemovedEvent(EntryRemovedEvent<io.github.resilience4j.circuitbreaker.CircuitBreaker> entryRemoveEvent) {
        logger.info("CircuitBreaker registry event: '{}'", entryRemoveEvent.getEventType());
    }

    @Override
    public void onEntryReplacedEvent(EntryReplacedEvent<io.github.resilience4j.circuitbreaker.CircuitBreaker> entryReplacedEvent) {
        logger.info("CircuitBreaker registry event: '{}'", entryReplacedEvent.getEventType());
    }

    private void onSuccess(CircuitBreakerOnSuccessEvent event) {
        logger.info("CircuitBreaker '{}' recorded a successful call. Event: {}", event.getCircuitBreakerName(), event.getEventType());
    }

    private void onError(CircuitBreakerOnErrorEvent event) {
        logger.warn("CircuitBreaker '{}' recorded an error. Event: {}, Error: {}", event.getCircuitBreakerName(), event.getEventType(), event.getThrowable().toString());
    }

    private void onStateTransition(CircuitBreakerOnStateTransitionEvent event) {
        logger.warn("CircuitBreaker '{}' changed state from {} to {}. Event: {}", event.getCircuitBreakerName(), event.getStateTransition().getFromState(), event.getStateTransition().getToState(), event.getEventType());
    }
}
