import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import * as Sentry from "@sentry/react";
import { setTag, startTransaction } from "./services/errorTracking";
import Header from "./components/layouts/Header";
import Footer from "./components/layouts/Footer";
import HomePage from "./pages/HomePage";
import SignupPage from "./pages/SignupPage";
import LoginPage from "./pages/LoginPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import SubscriptionPlansPage from "./pages/SubscriptionPlansPage";
import CheckoutPage from "./pages/CheckoutPage";
import CheckoutSuccessPage from "./pages/CheckoutSuccessPage";
import ResponsiveContainer from "./components/ui/ResponsiveContainer";
import ErrorBoundary from "./components/error/ErrorBoundary";
import ErrorFallback from "./components/error/ErrorFallback";
import AnalyticsRouteTracker from "./components/ui/AnalyticsRouteTracker";
import AnalyticsDebugger from "./components/ui/AnalyticsDebugger";
import { analytics } from "./services/analytics";

// Create Sentry instrumentation for React Router - properly fixed
const SentryRoutes = Sentry.withSentryReactRouterV7Routing(Routes);

function App() {
    const location = useLocation();
    const navigate = useNavigate();

    // Initialize analytics service
    useEffect(() => {
        analytics.init();

        // Clean up on unmount
        return () => {
            analytics.destroy();
        };
    }, []);

    // Set up route tracking for Sentry
    useEffect(() => {
        // Set current route as a tag for error tracking
        setTag("route", location.pathname);

        // Start a transaction for performance monitoring on route change
        const transaction = startTransaction(
            `Route: ${location.pathname}`,
            "pageload"
        );

        // End the transaction when the component unmounts or route changes
        return () => {
            transaction.finish();
        };
    }, [location.pathname]);

    return (
        <div className="flex flex-col min-h-screen bg-netflix-black text-white">
            <Header />
            <main className="flex-grow pt-16 md:pt-20">
                {/* Silent route tracking component */}
                <AnalyticsRouteTracker />

                {/* Analytics debugger (only visible in dev, toggle with Shift+Alt+D) */}
                <AnalyticsDebugger />

                {/* Page content with top spacing to account for fixed header */}
                <SentryRoutes>
                    <Route
                        path="/"
                        element={
                            <ErrorBoundary componentName="HomePage">
                                <HomePage />
                            </ErrorBoundary>
                        }
                    />
                    <Route
                        path="/signup"
                        element={
                            <ErrorBoundary componentName="SignupPage">
                                <SignupPage />
                            </ErrorBoundary>
                        }
                    />
                    <Route
                        path="/login"
                        element={
                            <ErrorBoundary componentName="LoginPage">
                                <LoginPage />
                            </ErrorBoundary>
                        }
                    />
                    <Route
                        path="/profile"
                        element={
                            <ErrorBoundary componentName="ProfilePage">
                                <ProfilePage />
                            </ErrorBoundary>
                        }
                    />
                    <Route
                        path="/settings"
                        element={
                            <ErrorBoundary componentName="SettingsPage">
                                <SettingsPage />
                            </ErrorBoundary>
                        }
                    />
                    <Route
                        path="/plans"
                        element={
                            <ErrorBoundary componentName="SubscriptionPlansPage">
                                <SubscriptionPlansPage />
                            </ErrorBoundary>
                        }
                    />
                    <Route
                        path="/checkout"
                        element={
                            <ErrorBoundary componentName="CheckoutPage">
                                <CheckoutPage />
                            </ErrorBoundary>
                        }
                    />
                    <Route
                        path="/checkout/success"
                        element={
                            <ErrorBoundary componentName="CheckoutSuccessPage">
                                <CheckoutSuccessPage />
                            </ErrorBoundary>
                        }
                    />
                    <Route
                        path="*"
                        element={
                            <div className="p-8">
                                <ErrorFallback
                                    title="Page Not Found"
                                    message="The page you're looking for doesn't exist."
                                    buttonText="Go Home"
                                    resetErrorBoundary={() => navigate("/")}
                                    showError={false}
                                />
                            </div>
                        }
                    />
                </SentryRoutes>
            </main>
            <Footer />
        </div>
    );
}

Sentry.withProfiler(App, { name: "App" });
export default App;
