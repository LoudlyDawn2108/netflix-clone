import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import { Provider } from "react-redux";
import store from "./store";
import { AuthProvider } from "./context/AuthContext";
import * as serviceWorkerRegistration from "./utils/serviceWorkerRegistration";
import { initSentry } from "./services/errorTracking";
import { setupGlobalErrorHandlers } from "./utils/globalErrorHandler";
import ErrorBoundary from "./components/error/ErrorBoundary";
import ErrorFallback from "./components/error/ErrorFallback";

// Initialize Sentry for error tracking and performance monitoring
initSentry({
    environment: import.meta.env.MODE,
    enableTracing: import.meta.env.PROD,
});

// Set up global error handlers for uncaught errors
setupGlobalErrorHandlers();

createRoot(document.getElementById("root")).render(
    <StrictMode>
        <ErrorBoundary
            componentName="RootApplication"
            errorContext={{ level: "root" }}
            fallback={(error) => (
                <ErrorFallback
                    error={error}
                    title="Application Error"
                    message="We're sorry, but something went wrong. Please try refreshing the page."
                />
            )}
        >
            <Provider store={store}>
                <AuthProvider>
                    <BrowserRouter>
                        <App />
                    </BrowserRouter>
                </AuthProvider>
            </Provider>
        </ErrorBoundary>
    </StrictMode>
);

// Register the service worker for PWA support
// Remove or set to unregister() during development if needed
serviceWorkerRegistration.register();
