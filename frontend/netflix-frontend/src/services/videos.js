import api from "./api";
import {
    categories,
    generateMockVideosForCategory,
    getMockVideoDetails,
    generateMockPlaybackInfo,
} from "./mockData";

// Environment flag to use mock data
const USE_MOCK_DATA = true; // Set to false to use actual API

/**
 * Fetch videos by category
 * @param {string} categoryId - The category ID
 * @param {object} options - Query options
 * @param {number} options.page - Page number (starting at 1)
 * @param {number} options.limit - Number of items per page
 * @param {string} options.sort - Sort field
 * @returns {Promise<{items: Array, total: number, page: number, totalPages: number}>}
 */
export async function getVideosByCategory(categoryId, options = {}) {
    const { page = 1, limit = 20, sort = "popular" } = options;

    // Use mock data during development
    if (USE_MOCK_DATA) {
        const mockVideos = generateMockVideosForCategory(categoryId, limit);
        return Promise.resolve({
            items: mockVideos,
            total: mockVideos.length,
            page: 1,
            totalPages: 1,
        });
    }

    return api(
        `/videos?categoryId=${categoryId}&page=${page}&limit=${limit}&sort=${sort}`
    );
}

/**
 * Fetch featured/promoted videos
 * @param {number} limit - Number of featured videos to return
 * @returns {Promise<{items: Array}>}
 */
export async function getFeaturedVideos(limit = 1) {
    // Use mock data during development
    if (USE_MOCK_DATA) {
        const mockVideos = generateMockVideosForCategory("trending", limit);
        return Promise.resolve({
            items: mockVideos,
        });
    }

    return api(`/videos/featured?limit=${limit}`);
}

/**
 * Fetch details for a specific video
 * @param {string} videoId - The video ID
 * @returns {Promise<object>} - Video details
 */
export async function getVideoDetails(videoId) {
    // Use mock data during development
    if (USE_MOCK_DATA) {
        const video = getMockVideoDetails(videoId);
        if (!video) {
            return Promise.reject(new Error("Video not found"));
        }
        return Promise.resolve(video);
    }

    return api(`/videos/${videoId}`);
}

/**
 * Get recommendations related to a specific video
 * @param {string} videoId - The video ID
 * @param {number} limit - Number of recommendations to return
 * @returns {Promise<{items: Array}>}
 */
export async function getRelatedVideos(videoId, limit = 6) {
    // Use mock data during development
    if (USE_MOCK_DATA) {
        // Get video details first to determine its genre
        const videoDetails = getMockVideoDetails(videoId);
        if (
            !videoDetails ||
            !videoDetails.genre ||
            !videoDetails.genre.length
        ) {
            return Promise.resolve({ items: [] });
        }

        // Use the first genre to get related videos
        const mainGenre = videoDetails.genre[0].toLowerCase();
        const categoryId =
            categories.find((c) => c.name.toLowerCase() === mainGenre)?.id ||
            "action";

        // Get videos from that category excluding the current video
        const relatedVideos = generateMockVideosForCategory(
            categoryId,
            limit + 1
        )
            .filter((v) => v.id !== videoId)
            .slice(0, limit);

        return Promise.resolve({ items: relatedVideos });
    }

    return api(`/videos/${videoId}/related?limit=${limit}`);
}

/**
 * Get video categories for browse page
 * @returns {Promise<Array>} - List of categories
 */
export async function getCategories() {
    // Use mock data during development
    if (USE_MOCK_DATA) {
        return Promise.resolve(categories);
    }

    return api("/videos/categories");
}

/**
 * Get trending videos across all categories
 * @param {number} limit - Number of videos to return
 * @returns {Promise<{items: Array}>}
 */
export async function getTrendingVideos(limit = 20) {
    // Use mock data during development
    if (USE_MOCK_DATA) {
        const mockVideos = generateMockVideosForCategory("trending", limit);
        return Promise.resolve({
            items: mockVideos,
        });
    }

    return api(`/videos/trending?limit=${limit}`);
}

/**
 * Get recently added videos
 * @param {number} limit - Number of videos to return
 * @returns {Promise<{items: Array}>}
 */
export async function getRecentVideos(limit = 20) {
    // Use mock data during development
    if (USE_MOCK_DATA) {
        const mockVideos = generateMockVideosForCategory("recent", limit);
        return Promise.resolve({
            items: mockVideos,
        });
    }

    return api(`/videos/recent?limit=${limit}`);
}

/**
 * Get video playback information including streaming URLs
 * @param {string} videoId - The video ID
 * @returns {Promise<object>} - Playback information
 */
export async function getPlaybackInfo(videoId) {
    // Use mock data during development
    if (USE_MOCK_DATA) {
        return Promise.resolve(generateMockPlaybackInfo(videoId));
    }

    return api(`/playback/${videoId}/manifest`);
}
