import { Component } from "react";
import * as Sentry from "@sentry/react";
import { captureException } from "../../services/errorTracking";

/**
 * A component that catches JavaScript errors anywhere in its child component tree,
 * logs those errors, and displays a fallback UI instead of crashing the application.
 *
 * @typedef {Object} ErrorBoundaryProps
 * @property {React.ReactNode} children - Child components to render
 * @property {Function} [fallback] - Optional custom fallback UI renderer function
 * @property {string} [errorMessage] - Custom error message to display
 * @property {string} [componentName] - Name of the component for error tracking
 * @property {Object} [errorContext] - Additional context for error reporting
 */
class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // You can log the error to an error reporting service
        captureException(error, {
            errorInfo,
            componentName: this.props.componentName,
            ...this.props.errorContext,
        });

        // Log to console in development
        if (import.meta.env.MODE !== "production") {
            console.error("ErrorBoundary caught an error:", error, errorInfo);
        }
    }

    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return this.props.fallback ? (
                this.props.fallback(this.state.error)
            ) : (
                <div className="p-6 bg-gray-900 border border-red-800 rounded-md shadow-lg">
                    <h2 className="text-xl font-semibold text-red-500 mb-2">
                        Something went wrong
                    </h2>
                    <p className="text-gray-300 mb-4">
                        {this.props.errorMessage ||
                            "We encountered an error loading this content."}
                    </p>
                    <button
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                        onClick={() =>
                            this.setState({ hasError: false, error: null })
                        }
                    >
                        Try again
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
