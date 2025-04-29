import { captureException } from "./errorTracking";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";
const USE_MOCK_DATA = true; // Set to true to use mock data, false to use real API

/**
 * Custom API Error class to provide better context for API errors
 */
export class ApiError extends Error {
    constructor(message, status, data = {}) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.data = data;
    }
}

// Import all mock handlers
import * as mockHandlers from "./mockApiHandlers";

async function api(path, options = {}) {
    // If mock data is enabled, use mock handlers
    if (USE_MOCK_DATA) {
        console.log(
            `[Mock API] ${options.method || "GET"} ${path}`,
            options.body
        );

        // Simulate network delay
        await new Promise((resolve) =>
            setTimeout(resolve, 300 + Math.random() * 500)
        );

        // Find and execute the appropriate mock handler
        try {
            const mockResponse = await mockHandlers.handleMockRequest(
                path,
                options
            );

            // Log the mock response
            console.log(`[Mock API] Response for ${path}:`, mockResponse);

            return mockResponse;
        } catch (error) {
            console.error(`[Mock API] Error for ${path}:`, error);
            throw error;
        }
    }

    // Original API implementation for when backend is ready
    const url = `${API_BASE_URL}${path}`;
    const headers = {
        ...(options.headers || {}),
    };
    const token = sessionStorage.getItem("accessToken");
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    if (options.body && !(options.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(options.body);
    }

    try {
        const response = await fetch(url, {
            credentials: "include",
            ...options,
            headers,
        });

        const contentType = response.headers.get("content-type");
        let data;

        if (contentType && contentType.includes("application/json")) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        if (!response.ok) {
            // Create a custom API error with status and data
            const errorMessage = data?.error || response.statusText;
            const apiError = new ApiError(errorMessage, response.status, data);

            // Report to Sentry with context
            captureException(apiError, {
                tags: {
                    endpoint: path,
                    method: options.method || "GET",
                    status: response.status,
                },
                extra: {
                    url,
                    requestData: options.body
                        ? JSON.parse(JSON.stringify(options.body))
                        : undefined,
                    responseData: data,
                },
            });

            throw apiError;
        }

        return data;
    } catch (error) {
        // Handle network errors or JSON parsing errors
        if (!(error instanceof ApiError)) {
            captureException(error, {
                tags: {
                    endpoint: path,
                    method: options.method || "GET",
                    errorType: "network_error",
                },
                extra: {
                    url,
                    requestData: options.body
                        ? JSON.parse(JSON.stringify(options.body))
                        : undefined,
                },
            });
        }

        throw error;
    }
}

export default api;
