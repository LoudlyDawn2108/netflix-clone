import { useState } from "react";
import * as Sentry from "@sentry/react";

/**
 * Displays version information and offers debugger tools
 * Primarily for development and support purposes
 */
const VersionInfo = ({ className = "" }) => {
    const [expanded, setExpanded] = useState(false);
    const version = __APP_VERSION__;
    const release = __APP_RELEASE__;
    const buildTime = new Date(__BUILD_TIME__).toLocaleString();
    const environment = import.meta.env.MODE;

    const toggleExpanded = () => setExpanded((prev) => !prev);

    const handleTestError = () => {
        try {
            // Intentionally throw an error for testing
            throw new Error("This is a test error from VersionInfo component");
        } catch (error) {
            Sentry.captureException(error, {
                tags: {
                    errorType: "test_error",
                    component: "VersionInfo",
                },
                extra: {
                    manual_test: true,
                },
            });

            // Show alert to confirm the error was sent
            alert("Test error captured and sent to Sentry");
        }
    };

    return (
        <div className={`text-xs text-gray-500 ${className}`}>
            <div
                className="flex items-center gap-1 cursor-pointer"
                onClick={toggleExpanded}
            >
                <span>v{version}</span>
                <svg
                    className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 9l-7 7-7-7"
                    ></path>
                </svg>
            </div>

            {expanded && (
                <div className="mt-2 p-3 bg-gray-800 rounded-md text-gray-300 text-xs">
                    <div>Release: {release}</div>
                    <div>Environment: {environment}</div>
                    <div>Build time: {buildTime}</div>

                    {import.meta.env.DEV && (
                        <button
                            onClick={handleTestError}
                            className="mt-2 px-2 py-1 bg-red-800 text-white text-xs rounded hover:bg-red-700"
                        >
                            Test Sentry Error
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default VersionInfo;
