import * as Sentry from "@sentry/react";
import { BrowserTracing } from "@sentry/browser";
import { Replay } from "@sentry/replay";

/**
 * Initialize Sentry for error tracking and performance monitoring
 * @param {object} options - Configuration options
 * @param {string} options.environment - Environment name (development, staging, production)
 * @param {boolean} options.enableTracing - Whether to enable performance tracing
 */
export const initSentry = ({
    environment = import.meta.env.VITE_SENTRY_ENVIRONMENT || "development",
    enableTracing = true,
} = {}) => {
    // Only try to initialize if DSN is provided
    const dsn = import.meta.env.VITE_SENTRY_DSN || "";

    try {
        Sentry.init({
            dsn: dsn,
            integrations: [
                new BrowserTracing({
                    tracingOrigins: ["localhost", /^\/api\/v1/],
                }),
                new Replay({
                    // Additional Replay configuration
                    maskAllText: true,
                    blockAllMedia: true,
                }),
            ],
            environment,
            release:
                import.meta.env.VITE_SENTRY_RELEASE || "netflix-frontend@0.0.0",
            // Set sample rates from environment variables
            tracesSampleRate: parseFloat(
                import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || "0.2"
            ),
            replaysSessionSampleRate: parseFloat(
                import.meta.env.VITE_SENTRY_REPLAY_SAMPLE_RATE || "0.1"
            ),
            // Only enable in production to avoid sending debug logs
            enabled:
                environment === "production" ||
                import.meta.env.VITE_FORCE_SENTRY === "true",
            // Capture errors in React components
            beforeSend(event, hint) {
                // Don't send events in development unless forced
                if (
                    environment !== "production" &&
                    import.meta.env.VITE_FORCE_SENTRY !== "true"
                ) {
                    return null;
                }

                // Add additional context if error exists
                if (hint && hint.originalException) {
                    const error = hint.originalException;
                    const extraContext = {};

                    // Add browser information
                    extraContext.userAgent = navigator.userAgent;
                    extraContext.viewportSize = `${window.innerWidth}x${window.innerHeight}`;

                    // Add route information
                    const pathname = window.location.pathname;
                    event.tags = {
                        ...event.tags,
                        route: pathname,
                    };

                    // Add custom context based on error type
                    if (error.name === "ApiError" && error.status) {
                        event.fingerprint = [
                            `${error.name}-${error.status}`,
                            pathname,
                        ];
                    }
                }

                return event;
            },
        });

        console.log("Sentry initialized successfully");
    } catch (error) {
        console.error("Failed to initialize Sentry:", error);
        // Don't let Sentry initialization failure crash the app
    }
};

/**
 * Capture exception with additional context
 * @param {Error} error - The error object
 * @param {object} context - Additional context information
 */
export const captureException = (error, context = {}) => {
    Sentry.withScope((scope) => {
        Object.entries(context).forEach(([key, value]) => {
            scope.setExtra(key, value);
        });
        Sentry.captureException(error);
    });
};

/**
 * Set user info for error tracking
 * @param {object} user - User information
 * @param {string} user.id - User ID
 * @param {string} user.email - User email
 * @param {string} user.subscription - User subscription level
 */
export const setUser = (user) => {
    if (user?.id) {
        Sentry.setUser({
            id: user.id,
            email: user.email || undefined,
            subscription: user.subscription || "free",
            username: user.username || undefined,
        });
    } else {
        // Clear user context on logout
        Sentry.setUser(null);
    }
};

/**
 * Create error boundary for React components
 * @param {object} options - Configuration options
 * @returns {React.ComponentType} Error boundary component
 */
export const SentryErrorBoundary = ({
    children,
    fallback,
    name = "UnnamedComponent",
}) => {
    return (
        <Sentry.ErrorBoundary
            fallback={fallback || <p>An error has occurred</p>}
            name={name}
        >
            {children}
        </Sentry.ErrorBoundary>
    );
};

/**
 * Start performance transaction for monitoring
 * @param {string} name - Transaction name
 * @param {string} op - Operation type
 * @returns {Transaction} The created transaction
 */
export const startTransaction = (name, op = "navigation") => {
    return Sentry.startTransaction({ name, op });
};

/**
 * Set tag for current scope
 * @param {string} key - Tag key
 * @param {string} value - Tag value
 */
export const setTag = (key, value) => {
    Sentry.setTag(key, value);
};

/**
 * Add breadcrumb for debugging
 * @param {object} breadcrumb - Breadcrumb object
 */
export const addBreadcrumb = (breadcrumb) => {
    Sentry.addBreadcrumb(breadcrumb);
};
