// Mock API Handlers
// This file contains handlers for all mock API endpoints

import { ApiError } from "./api";
import {
    categories,
    generateMockVideosForCategory,
    generateMockPlaybackInfo,
    getMockVideoDetails,
    baseVideos,
} from "./mockData";

// Generate a random ID
const generateId = () => Math.random().toString(36).substring(2, 15);

// Simulate server-side delay
const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

// Mock user database
const mockUsers = [
    {
        id: "user1",
        username: "demo",
        email: "demo@example.com",
        password: "password123", // In a real app, this would be hashed
        profilePic: "https://picsum.photos/seed/user1/150/150",
        createdAt: "2023-01-15T10:30:00Z",
        subscription: "premium",
        preferences: {
            emailNotifications: true,
            darkMode: true,
            language: "en",
            subtitlesEnabled: true,
            autoplay: true,
        },
    },
    {
        id: "user2",
        username: "testuser",
        email: "test@example.com",
        password: "test123",
        profilePic: "https://picsum.photos/seed/user2/150/150",
        createdAt: "2023-02-20T14:45:00Z",
        subscription: "basic",
        preferences: {
            emailNotifications: false,
            darkMode: false,
            language: "en",
            subtitlesEnabled: true,
            autoplay: false,
        },
    },
];

// Mock watchlist database
const mockWatchlists = {
    user1: ["v1", "v3", "v6", "v9"],
    user2: ["v2", "v5", "v10"],
};

// Mock watch history database
const mockHistory = {
    user1: [
        { videoId: "v2", watchedAt: "2023-04-25T18:30:00Z", progress: 0.7 },
        { videoId: "v5", watchedAt: "2023-04-24T20:15:00Z", progress: 1.0 },
        { videoId: "v8", watchedAt: "2023-04-20T21:45:00Z", progress: 0.3 },
    ],
    user2: [
        { videoId: "v1", watchedAt: "2023-04-26T19:20:00Z", progress: 0.5 },
        { videoId: "v3", watchedAt: "2023-04-23T22:10:00Z", progress: 0.8 },
    ],
};

// Mock subscription plans
const mockPlans = [
    {
        id: "basic",
        name: "Basic",
        price: 8.99,
        features: [
            "Standard Definition (SD) streaming",
            "Watch on 1 device at a time",
            "Limited content library",
            "Ad-supported streaming",
        ],
        isPopular: false,
    },
    {
        id: "standard",
        name: "Standard",
        price: 13.99,
        features: [
            "High Definition (HD) streaming",
            "Watch on 2 devices at a time",
            "Full content library",
            "Ad-free streaming",
            "Download videos for offline viewing",
        ],
        isPopular: true,
    },
    {
        id: "premium",
        name: "Premium",
        price: 17.99,
        features: [
            "Ultra HD (4K) and HDR streaming",
            "Watch on 4 devices at a time",
            "Full content library",
            "Ad-free streaming",
            "Download videos for offline viewing",
            "Spatial audio support",
            "Early access to select titles",
        ],
        isPopular: false,
    },
];

// Tokens management - in a real app would use JWT
const mockTokens = {};

/**
 * Handle a mock API request
 * @param {string} path - API path
 * @param {Object} options - Request options
 * @returns {Promise<any>} - Mocked response data
 */
export async function handleMockRequest(path, options = {}) {
    const method = options.method?.toUpperCase() || "GET";
    const body = options.body
        ? typeof options.body === "string"
            ? JSON.parse(options.body)
            : options.body
        : {};

    // Simulate network latency
    await delay(Math.floor(Math.random() * 300) + 200);

    // Authentication endpoints
    if (path.startsWith("/auth")) {
        return handleAuthEndpoints(path, method, body);
    }

    // Video endpoints
    if (path.startsWith("/videos")) {
        return handleVideoEndpoints(path, method, body, options);
    }

    // Category endpoints
    if (path.startsWith("/categories")) {
        return handleCategoryEndpoints(path, method, body);
    }

    // User endpoints
    if (path.startsWith("/user")) {
        return handleUserEndpoints(path, method, body, options);
    }

    // Watchlist endpoints
    if (path.startsWith("/watchlist")) {
        return handleWatchlistEndpoints(path, method, body, options);
    }

    // History endpoints
    if (path.startsWith("/history")) {
        return handleHistoryEndpoints(path, method, body, options);
    }

    // Search endpoints
    if (path.startsWith("/search")) {
        return handleSearchEndpoints(path, method, body);
    }

    // Plans endpoints
    if (path.startsWith("/plans")) {
        return handlePlansEndpoints(path, method, body);
    }

    // Default - endpoint not found
    throw new ApiError("Endpoint not found", 404);
}

/**
 * Handle authentication endpoints
 */
function handleAuthEndpoints(path, method, body) {
    // Login endpoint
    if (path === "/auth/login" && method === "POST") {
        const { email, password } = body;
        const user = mockUsers.find(
            (u) => u.email === email && u.password === password
        );

        if (!user) {
            throw new ApiError("Invalid credentials", 401);
        }

        // Create a mock token
        const accessToken = `mock-token-${generateId()}`;
        const refreshToken = `mock-refresh-${generateId()}`;

        // Store token with user info
        mockTokens[accessToken] = {
            userId: user.id,
            exp: Date.now() + 3600000, // 1 hour expiry
        };

        // Remove password from response
        const { password: _, ...userWithoutPassword } = user;

        return {
            user: userWithoutPassword,
            accessToken,
            refreshToken,
        };
    }

    // Signup endpoint
    if (path === "/auth/signup" && method === "POST") {
        const { username, email, password } = body;

        // Check if user already exists
        if (mockUsers.some((u) => u.email === email)) {
            throw new ApiError("User with this email already exists", 409);
        }

        // Create new user
        const newUser = {
            id: `user${mockUsers.length + 1}`,
            username,
            email,
            password,
            profilePic: `https://picsum.photos/seed/${username}/150/150`,
            createdAt: new Date().toISOString(),
            subscription: "basic",
            preferences: {
                emailNotifications: true,
                darkMode: true,
                language: "en",
                subtitlesEnabled: true,
                autoplay: true,
            },
        };

        mockUsers.push(newUser);

        // Create tokens
        const accessToken = `mock-token-${generateId()}`;
        const refreshToken = `mock-refresh-${generateId()}`;

        mockTokens[accessToken] = {
            userId: newUser.id,
            exp: Date.now() + 3600000, // 1 hour expiry
        };

        // Remove password from response
        const { password: _, ...userWithoutPassword } = newUser;

        return {
            user: userWithoutPassword,
            accessToken,
            refreshToken,
        };
    }

    // Token verification endpoint
    if (path === "/auth/verify" && method === "POST") {
        const { token } = body;

        if (!token || !mockTokens[token]) {
            throw new ApiError("Invalid token", 401);
        }

        if (mockTokens[token].exp < Date.now()) {
            throw new ApiError("Token expired", 401);
        }

        // Find user by ID
        const user = mockUsers.find((u) => u.id === mockTokens[token].userId);
        if (!user) {
            throw new ApiError("User not found", 404);
        }

        // Return user data without password
        const { password: _, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }

    // Token refresh endpoint
    if (path === "/auth/refresh" && method === "POST") {
        // In a real app, would validate refresh token
        // Here we'll just create a new token

        const newAccessToken = `mock-token-${generateId()}`;
        mockTokens[newAccessToken] = {
            userId: body.userId || "user1", // Default to user1 if no userId provided
            exp: Date.now() + 3600000, // 1 hour expiry
        };

        return {
            accessToken: newAccessToken,
        };
    }

    // Logout endpoint
    if (path === "/auth/logout" && method === "POST") {
        // In a real app, would invalidate the token
        return { success: true };
    }

    throw new ApiError("Auth endpoint not found", 404);
}

/**
 * Handle video endpoints
 */
function handleVideoEndpoints(path, method, body, options) {
    // Get all videos or featured videos
    if (path === "/videos" || path === "/videos/featured") {
        return {
            videos: baseVideos.slice(0, 15),
            total: baseVideos.length,
        };
    }

    // Get video details by ID
    const videoDetailMatch = path.match(/^\/videos\/([a-zA-Z0-9]+)$/);
    if (videoDetailMatch && method === "GET") {
        const videoId = videoDetailMatch[1];
        const videoDetails = getMockVideoDetails(videoId);

        if (!videoDetails) {
            throw new ApiError("Video not found", 404);
        }

        return videoDetails;
    }

    // Get video playback info
    const playbackMatch = path.match(/^\/videos\/([a-zA-Z0-9]+)\/playback$/);
    if (playbackMatch && method === "GET") {
        const videoId = playbackMatch[1];
        const videoDetails = getMockVideoDetails(videoId);

        if (!videoDetails) {
            throw new ApiError("Video not found", 404);
        }

        return generateMockPlaybackInfo(videoId);
    }

    throw new ApiError("Video endpoint not found", 404);
}

/**
 * Handle category endpoints
 */
function handleCategoryEndpoints(path, method, body) {
    // Get all categories
    if (path === "/categories" && method === "GET") {
        return { categories };
    }

    // Get videos by category
    const categoryVideosMatch = path.match(
        /^\/categories\/([a-zA-Z0-9]+)\/videos$/
    );
    if (categoryVideosMatch && method === "GET") {
        const categoryId = categoryVideosMatch[1];
        const videos = generateMockVideosForCategory(categoryId);

        return {
            videos,
            total: videos.length,
        };
    }

    throw new ApiError("Category endpoint not found", 404);
}

/**
 * Handle user endpoints
 */
function handleUserEndpoints(path, method, body, options) {
    // Extract token from Authorization header
    const authHeader = options.headers?.Authorization;
    let userId = "user1"; // Default for mock data

    if (authHeader) {
        const token = authHeader.split(" ")[1];
        if (mockTokens[token]) {
            userId = mockTokens[token].userId;
        }
    }

    // Get user profile
    if (path === "/user/profile" && method === "GET") {
        const user = mockUsers.find((u) => u.id === userId);
        if (!user) {
            throw new ApiError("User not found", 404);
        }

        // Remove password from response
        const { password: _, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }

    // Update user profile
    if (path === "/user/profile" && method === "PATCH") {
        const user = mockUsers.find((u) => u.id === userId);
        if (!user) {
            throw new ApiError("User not found", 404);
        }

        // Update user fields
        Object.assign(user, body);

        // Remove password from response
        const { password: _, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }

    // Update user preferences
    if (path === "/user/preferences" && method === "PATCH") {
        const user = mockUsers.find((u) => u.id === userId);
        if (!user) {
            throw new ApiError("User not found", 404);
        }

        // Update preferences
        user.preferences = {
            ...user.preferences,
            ...body,
        };

        return user.preferences;
    }

    // Get user preferences
    if (path === "/user/preferences" && method === "GET") {
        const user = mockUsers.find((u) => u.id === userId);
        if (!user) {
            throw new ApiError("User not found", 404);
        }

        return user.preferences;
    }

    // Change password
    if (path === "/user/password" && method === "PUT") {
        const { currentPassword, newPassword } = body;
        const user = mockUsers.find((u) => u.id === userId);

        if (!user) {
            throw new ApiError("User not found", 404);
        }

        if (user.password !== currentPassword) {
            throw new ApiError("Current password is incorrect", 401);
        }

        user.password = newPassword;
        return { success: true };
    }

    throw new ApiError("User endpoint not found", 404);
}

/**
 * Handle watchlist endpoints
 */
function handleWatchlistEndpoints(path, method, body, options) {
    // Extract token from Authorization header
    const authHeader = options.headers?.Authorization;
    let userId = "user1"; // Default for mock data

    if (authHeader) {
        const token = authHeader.split(" ")[1];
        if (mockTokens[token]) {
            userId = mockTokens[token].userId;
        }
    }

    // Create watchlist entry if it doesn't exist
    if (!mockWatchlists[userId]) {
        mockWatchlists[userId] = [];
    }

    // Get user's watchlist
    if (path === "/watchlist" && method === "GET") {
        const watchlist = mockWatchlists[userId] || [];
        const videos = watchlist
            .map((videoId) => {
                return getMockVideoDetails(videoId);
            })
            .filter((video) => video !== null);

        return {
            videos,
            total: videos.length,
        };
    }

    // Add to watchlist
    if (path === "/watchlist" && method === "POST") {
        const { videoId } = body;

        if (!videoId) {
            throw new ApiError("Video ID is required", 400);
        }

        // Check if video exists
        const videoExists = baseVideos.some((v) => v.id === videoId);
        if (!videoExists) {
            throw new ApiError("Video not found", 404);
        }

        // Check if already in watchlist
        if (!mockWatchlists[userId].includes(videoId)) {
            mockWatchlists[userId].push(videoId);
        }

        return { success: true };
    }

    // Remove from watchlist
    const removeMatch = path.match(/^\/watchlist\/([a-zA-Z0-9]+)$/);
    if (removeMatch && method === "DELETE") {
        const videoId = removeMatch[1];

        mockWatchlists[userId] = mockWatchlists[userId].filter(
            (id) => id !== videoId
        );

        return { success: true };
    }

    throw new ApiError("Watchlist endpoint not found", 404);
}

/**
 * Handle history endpoints
 */
function handleHistoryEndpoints(path, method, body, options) {
    // Extract token from Authorization header
    const authHeader = options.headers?.Authorization;
    let userId = "user1"; // Default for mock data

    if (authHeader) {
        const token = authHeader.split(" ")[1];
        if (mockTokens[token]) {
            userId = mockTokens[token].userId;
        }
    }

    // Create history entry if it doesn't exist
    if (!mockHistory[userId]) {
        mockHistory[userId] = [];
    }

    // Get user's watch history
    if (path === "/history" && method === "GET") {
        const history = mockHistory[userId] || [];

        // Get full video details for each item in history
        const historyWithDetails = history
            .map((item) => {
                const video = getMockVideoDetails(item.videoId);
                return {
                    ...item,
                    video,
                };
            })
            .filter((item) => item.video !== null);

        return {
            history: historyWithDetails,
            total: historyWithDetails.length,
        };
    }

    // Add to watch history / update progress
    if (path === "/history" && method === "POST") {
        const { videoId, progress } = body;

        if (!videoId) {
            throw new ApiError("Video ID is required", 400);
        }

        // Check if video exists
        const videoExists = baseVideos.some((v) => v.id === videoId);
        if (!videoExists) {
            throw new ApiError("Video not found", 404);
        }

        // Find existing entry to update
        const existingEntry = mockHistory[userId].find(
            (item) => item.videoId === videoId
        );

        if (existingEntry) {
            // Update existing entry
            existingEntry.progress = progress;
            existingEntry.watchedAt = new Date().toISOString();
        } else {
            // Add new entry
            mockHistory[userId].push({
                videoId,
                progress: progress || 0,
                watchedAt: new Date().toISOString(),
            });
        }

        return { success: true };
    }

    // Clear watch history
    if (path === "/history" && method === "DELETE") {
        mockHistory[userId] = [];
        return { success: true };
    }

    // Remove specific video from history
    const removeMatch = path.match(/^\/history\/([a-zA-Z0-9]+)$/);
    if (removeMatch && method === "DELETE") {
        const videoId = removeMatch[1];

        mockHistory[userId] = mockHistory[userId].filter(
            (item) => item.videoId !== videoId
        );

        return { success: true };
    }

    throw new ApiError("History endpoint not found", 404);
}

/**
 * Handle search endpoints
 */
function handleSearchEndpoints(path, method, body) {
    // Search videos
    if (path.startsWith("/search") && method === "GET") {
        // Extract query params from path
        const url = new URL(`http://localhost${path}`);
        const query = url.searchParams.get("q") || "";
        const genre = url.searchParams.get("genre");
        const year = url.searchParams.get("year");
        const limit = parseInt(url.searchParams.get("limit") || "10", 10);

        // Filter videos based on query and filters
        let results = baseVideos.filter((video) => {
            const matchesQuery =
                !query ||
                video.title.toLowerCase().includes(query.toLowerCase()) ||
                video.description.toLowerCase().includes(query.toLowerCase());

            const matchesGenre =
                !genre ||
                video.genre.some(
                    (g) => g.toLowerCase() === genre.toLowerCase()
                );
            const matchesYear = !year || video.releaseYear.toString() === year;

            return matchesQuery && matchesGenre && matchesYear;
        });

        // Limit results
        results = results.slice(0, limit);

        return {
            results,
            total: results.length,
        };
    }

    throw new ApiError("Search endpoint not found", 404);
}

/**
 * Handle plans endpoints
 */
function handlePlansEndpoints(path, method, body) {
    // Get all plans
    if (path === "/plans" && method === "GET") {
        return { plans: mockPlans };
    }

    // Get specific plan
    const planMatch = path.match(/^\/plans\/([a-zA-Z0-9]+)$/);
    if (planMatch && method === "GET") {
        const planId = planMatch[1];
        const plan = mockPlans.find((p) => p.id === planId);

        if (!plan) {
            throw new ApiError("Plan not found", 404);
        }

        return plan;
    }

    // Mock checkout process
    if (path === "/plans/checkout" && method === "POST") {
        const { planId } = body;

        if (!planId) {
            throw new ApiError("Plan ID is required", 400);
        }

        const plan = mockPlans.find((p) => p.id === planId);
        if (!plan) {
            throw new ApiError("Plan not found", 404);
        }

        return {
            success: true,
            checkoutUrl:
                "/checkout/success?session_id=mock_session_" + generateId(),
        };
    }

    throw new ApiError("Plans endpoint not found", 404);
}
