package com.streamflix.video.domain.exception;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

/**
 * Exception thrown when input validation fails.
 */
public class ValidationException extends RuntimeException {

    private final Map<String, String> errors;

    public ValidationException(String message) {
        super(message);
        this.errors = Collections.emptyMap();
    }

    public ValidationException(String message, Map<String, String> errors) {
        super(message);
        this.errors = new HashMap<>(errors);
    }

    public Map<String, String> getErrors() {
        return Collections.unmodifiableMap(errors);
    }
}