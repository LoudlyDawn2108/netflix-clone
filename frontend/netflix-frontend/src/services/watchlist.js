import api from "./api";
import { categories } from "./mockData";

// Flag for using mock data during development
const USE_MOCK_DATA = true;

/**
 * Get user's watchlist videos
 * @param {Object} options - Query options
 * @param {number} options.page - Page number
 * @param {number} options.limit - Items per page
 * @returns {Promise<Object>} - Watchlist data with videos and pagination info
 */
export async function getWatchlist(options = {}) {
    const { page = 1, limit = 12 } = options;

    if (USE_MOCK_DATA) {
        return generateMockWatchlist(page, limit);
    }

    return api(`/profiles/me/watchlist?page=${page}&limit=${limit}`);
}

/**
 * Get user's watch history
 * @param {Object} options - Query options
 * @param {number} options.page - Page number
 * @param {number} options.limit - Items per page
 * @returns {Promise<Object>} - History data with videos and pagination info
 */
export async function getWatchHistory(options = {}) {
    const { page = 1, limit = 12 } = options;

    if (USE_MOCK_DATA) {
        return generateMockHistory(page, limit);
    }

    return api(`/profiles/me/history?page=${page}&limit=${limit}`);
}

/**
 * Add a video to user's watchlist
 * @param {string} videoId - The video ID to add
 * @returns {Promise<Object>} - Success confirmation
 */
export async function addToWatchlist(videoId) {
    if (USE_MOCK_DATA) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({ success: true, message: "Added to watchlist" });
            }, 500);
        });
    }

    return api("/profiles/me/watchlist", {
        method: "POST",
        body: { videoId },
    });
}

/**
 * Remove a video from user's watchlist
 * @param {string} videoId - The video ID to remove
 * @returns {Promise<Object>} - Success confirmation
 */
export async function removeFromWatchlist(videoId) {
    if (USE_MOCK_DATA) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({ success: true, message: "Removed from watchlist" });
            }, 500);
        });
    }

    return api(`/profiles/me/watchlist/${videoId}`, {
        method: "DELETE",
    });
}

/**
 * Clear watch history
 * @param {string} videoId - Optional video ID to remove only one item
 * @returns {Promise<Object>} - Success confirmation
 */
export async function clearWatchHistory(videoId = null) {
    if (USE_MOCK_DATA) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    success: true,
                    message: videoId
                        ? "Removed item from history"
                        : "Cleared watch history",
                });
            }, 500);
        });
    }

    if (videoId) {
        return api(`/profiles/me/history/${videoId}`, {
            method: "DELETE",
        });
    }

    return api("/profiles/me/history", {
        method: "DELETE",
    });
}

// Mock data generators
function generateMockWatchlist(page = 1, limit = 12) {
    // Mock watchlist items - videos from different categories
    const watchlistItems = [];

    // Create variety of videos from different genres
    categories.forEach((category, i) => {
        watchlistItems.push({
            id: `wl-${i + 1}`,
            videoId: `v${i + 1}`,
            addedAt: new Date(
                Date.now() - i * 24 * 60 * 60 * 1000
            ).toISOString(),
            video: {
                id: `v${i + 1}`,
                title: `${category.name} Masterpiece ${i + 1}`,
                thumbnailUrl: `https://picsum.photos/seed/${category.id}${i}/300/450`,
                backdropUrl: `https://picsum.photos/seed/${category.id}${i}/1920/1080`,
                releaseYear: 2023 - Math.floor(i / 2),
                duration: 5400 + i * 600, // 90 minutes + variations
                rating: { average: 4.0 + (i % 10) / 10, count: 800 + i * 100 },
                genre: [category.name, i % 2 === 0 ? "Drama" : "Action"],
                description: `An amazing ${category.name.toLowerCase()} film that will keep you on the edge of your seat!`,
            },
        });
    });

    // Calculate pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const totalItems = watchlistItems.length;
    const totalPages = Math.ceil(totalItems / limit);

    // Return paginated results
    return Promise.resolve({
        items: watchlistItems.slice(startIndex, endIndex),
        pagination: {
            page,
            limit,
            totalItems,
            totalPages,
        },
    });
}

function generateMockHistory(page = 1, limit = 12) {
    // Mock history items - recently watched videos with progress
    const historyItems = [];

    // Create 20 history entries
    for (let i = 0; i < 20; i++) {
        // Get random category for variety
        const categoryIndex = i % categories.length;
        const category = categories[categoryIndex];

        // Calculate days ago for watched date (more recent for lower indices)
        const daysAgo = i < 5 ? i : 5 + i * 2;

        // Calculate watch progress (recently watched ones might be incomplete)
        const progress = i < 3 ? 30 + i * 20 : 100;

        historyItems.push({
            id: `hist-${i + 1}`,
            videoId: `v${20 - i}`, // Different IDs from watchlist to avoid too much overlap
            watchedAt: new Date(
                Date.now() - daysAgo * 24 * 60 * 60 * 1000
            ).toISOString(),
            progress: progress, // Percentage watched
            duration: 90 + (i % 30), // Duration in minutes
            video: {
                id: `v${20 - i}`,
                title: `${category.name} Adventure ${i + 1}`,
                thumbnailUrl: `https://picsum.photos/seed/hist${category.id}${i}/300/450`,
                backdropUrl: `https://picsum.photos/seed/hist${category.id}${i}/1920/1080`,
                releaseYear: 2022 - Math.floor(i / 3),
                duration: 5400 + i * 300, // Base duration plus variation
                rating: { average: 3.5 + (i % 15) / 10, count: 500 + i * 50 },
                genre: [category.name, i % 3 === 0 ? "Thriller" : "Comedy"],
                description: `A captivating ${category.name.toLowerCase()} story with unexpected twists and turns.`,
            },
        });
    }

    // Sort by watchedAt (most recent first)
    historyItems.sort((a, b) => new Date(b.watchedAt) - new Date(a.watchedAt));

    // Calculate pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const totalItems = historyItems.length;
    const totalPages = Math.ceil(totalItems / limit);

    // Return paginated results
    return Promise.resolve({
        items: historyItems.slice(startIndex, endIndex),
        pagination: {
            page,
            limit,
            totalItems,
            totalPages,
        },
    });
}
