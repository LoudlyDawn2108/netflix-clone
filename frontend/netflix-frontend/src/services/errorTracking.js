import * as Sentry from "@sentry/react";
import { BrowserTracing } from "@sentry/tracing";

/**
 * Initialize Sentry for error tracking and performance monitoring
 * @param {object} options - Configuration options
 * @param {string} options.environment - Environment name (development, staging, production)
 * @param {boolean} options.enableTracing - Whether to enable performance tracing
 */
export const initSentry = ({
    environment = "development",
    enableTracing = true,
} = {}) => {
    Sentry.init({
        dsn: import.meta.env.VITE_SENTRY_DSN || "", // Sentry DSN should be configured as an environment variable
        integrations: [
            new BrowserTracing({
                tracingOrigins: ["localhost", /^\/api\/v1/],
            }),
        ],
        environment,
        // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring
        // We recommend adjusting this value in production
        tracesSampleRate: enableTracing ? 1.0 : 0.0,
        // Only enable in production to avoid sending debug logs
        enabled:
            environment === "production" ||
            import.meta.env.VITE_FORCE_SENTRY === "true",
        // Capture errors in React components
        beforeSend(event) {
            // Don't send events in development unless forced
            if (
                environment !== "production" &&
                import.meta.env.VITE_FORCE_SENTRY !== "true"
            ) {
                return null;
            }
            return event;
        },
    });
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
 */
export const setUser = (user) => {
    if (user?.id) {
        Sentry.setUser({
            id: user.id,
            email: user.email || undefined,
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
export const SentryErrorBoundary = ({ children, fallback }) => {
    return (
        <Sentry.ErrorBoundary
            fallback={fallback || <p>An error has occurred</p>}
        >
            {children}
        </Sentry.ErrorBoundary>
    );
};
