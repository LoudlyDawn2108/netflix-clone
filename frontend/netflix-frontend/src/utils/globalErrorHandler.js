import { captureException } from "../services/errorTracking";

/**
 * Set up global error handlers for unhandled errors and rejections
 */
export function setupGlobalErrorHandlers() {
    // Handler for synchronous errors
    window.addEventListener("error", (event) => {
        const { message, filename, lineno, colno, error } = event;

        // Don't report errors from browser extensions or third-party scripts
        if (filename && !filename.includes(window.location.origin)) {
            return;
        }

        captureException(error || new Error(message), {
            tags: {
                errorType: "unhandled_error",
                source: "window.onerror",
            },
            extra: {
                filename,
                lineno,
                colno,
            },
        });
    });

    // Handler for unhandled promise rejections
    window.addEventListener("unhandledrejection", (event) => {
        const error = event.reason;

        captureException(error || new Error("Unhandled Promise rejection"), {
            tags: {
                errorType: "unhandled_rejection",
                source: "window.onunhandledrejection",
            },
            extra: {
                reason: error?.toString() || "Unknown reason",
            },
        });
    });

    // Log to console that global handlers are initialized
    if (import.meta.env.DEV) {
        console.log("Global error handlers initialized");
    }
}

/**
 * Wrap an async function with error handling
 * @param {Function} fn - The async function to wrap
 * @param {Object} options - Options for error handling
 * @returns {Function} - Wrapped function with error handling
 */
export function withErrorHandling(fn, options = {}) {
    return async (...args) => {
        try {
            return await fn(...args);
        } catch (error) {
            const { context = {}, rethrow = true } = options;

            captureException(error, {
                tags: {
                    errorType: "caught_async",
                    functionName: fn.name || "anonymous",
                },
                extra: {
                    arguments: args.map((arg) => {
                        // Basic sanitization to avoid sending sensitive data
                        if (typeof arg === "object" && arg !== null) {
                            return Object.keys(arg);
                        }
                        return typeof arg;
                    }),
                    ...context,
                },
            });

            if (rethrow) {
                throw error;
            }

            // Return fallback value if provided and not rethrowing
            return options.fallback;
        }
    };
}
