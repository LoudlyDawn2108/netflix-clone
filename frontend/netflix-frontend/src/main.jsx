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

// Initialize Sentry for error tracking and performance monitoring
initSentry({
    environment: import.meta.env.MODE,
    enableTracing: import.meta.env.PROD,
});

createRoot(document.getElementById("root")).render(
    <StrictMode>
        <Provider store={store}>
            <AuthProvider>
                <BrowserRouter>
                    <App />
                </BrowserRouter>
            </AuthProvider>
        </Provider>
    </StrictMode>
);

// Register the service worker for PWA support
// Remove or set to unregister() during development if needed
serviceWorkerRegistration.register();
