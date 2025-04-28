import api from "./api";
import { categories } from "./mockData";

// Flag for using mock data during development
const USE_MOCK_DATA = true;

/**
 * Fetch personalized video recommendations for a user
 *
 * @param {Object} options - Options for fetching recommendations
 * @param {string} options.userId - User ID to get recommendations for (defaults to "me")
 * @param {number} options.limit - Maximum number of recommendations to return
 * @param {string} options.source - Source type for recommendations (e.g., "watched", "similar", "trending")
 * @returns {Promise<{items: Array}>} - List of recommended videos
 */
export async function fetchRecommendations(options = {}) {
    const { userId = "me", limit = 6, source = "personalized" } = options;

    if (USE_MOCK_DATA) {
        return generateMockRecommendations(limit, source);
    }

    return api(`/recs/${userId}?limit=${limit}&source=${source}`);
}

/**
 * Fetch similar videos based on a specific video ID
 *
 * @param {string} videoId - The video ID to find similar content for
 * @param {number} limit - Maximum number of recommendations to return
 * @returns {Promise<{items: Array}>} - List of similar videos
 */
export async function fetchSimilarVideos(videoId, limit = 6) {
    if (USE_MOCK_DATA) {
        return generateMockSimilarVideos(videoId, limit);
    }

    return api(`/videos/${videoId}/similar?limit=${limit}`);
}

/**
 * Generate mock recommendations for development
 */
function generateMockRecommendations(limit = 6, source = "personalized") {
    // We'll generate different types of recommendations based on source parameter
    let title = "Recommended for You";
    let description = "Based on your viewing history";

    // Adjust title and description based on source
    if (source === "trending") {
        title = "Trending Now";
        description = "Popular with viewers this week";
    } else if (source === "new") {
        title = "New Releases";
        description = "Recently added to our catalog";
    }

    // Generate recommendation items
    const items = [];

    // Mix videos from different categories for variety
    const usedIndices = new Set();

    for (let i = 0; i < limit; i++) {
        // Ensure we don't use the same index twice
        let index;
        do {
            index = Math.floor(Math.random() * 15) + 1; // Random number between 1-15
        } while (usedIndices.has(index));

        usedIndices.add(index);

        // Get a random category
        const categoryIndex = Math.floor(Math.random() * categories.length);
        const category = categories[categoryIndex];

        // Mock recommendation item
        items.push({
            id: `rec-${index}`,
            relevanceScore: Math.random() * 0.5 + 0.5, // Random score between 0.5-1.0
            reason:
                source === "personalized"
                    ? "Because you watched similar content"
                    : null,
            video: {
                id: `v${index}`,
                title: `${category.name} Title ${index}`,
                thumbnailUrl: `https://picsum.photos/seed/rec${index}/300/450`,
                backdropUrl: `https://picsum.photos/seed/rec${index}/1920/1080`,
                releaseYear: 2020 + Math.floor(Math.random() * 5),
                duration: 5400 + index * 300, // 90+ minutes in seconds
                rating: {
                    average: 3.5 + Math.random(),
                    count: 500 + index * 100,
                },
                genre: [category.name, index % 2 === 0 ? "Drama" : "Thriller"],
                description: `An exciting ${category.name.toLowerCase()} that will keep you entertained from start to finish.`,
            },
        });
    }

    return Promise.resolve({
        id: `rec-group-${source}`,
        title,
        description,
        items,
        source,
    });
}

/**
 * Generate mock similar videos for development
 */
function generateMockSimilarVideos(videoId, limit = 6) {
    // Extract numerical part from videoId if possible
    let baseIndex = 1;
    if (videoId && typeof videoId === "string") {
        const match = videoId.match(/\d+/);
        if (match) {
            baseIndex = parseInt(match[0], 10) || 1;
        }
    }

    // Use baseIndex to seed our similarity (videos with close indices)
    const items = [];
    const usedIndices = new Set();

    // Always include the original video's category
    const originalCategoryIndex = baseIndex % categories.length;
    const originalCategory = categories[originalCategoryIndex];

    for (let i = 0; i < limit; i++) {
        // Generate a number close to the base index, but not the same
        let index;
        do {
            // Try to keep similar indices (but avoid the same video)
            const offset = Math.floor(Math.random() * 10) - 5; // -5 to +5
            index = Math.max(1, Math.min(15, baseIndex + offset));
        } while (
            index.toString() === baseIndex.toString() ||
            usedIndices.has(index)
        );

        usedIndices.add(index);

        // Use same category for half the recommendations
        const useOriginalCategory = i < limit / 2;
        const category = useOriginalCategory
            ? originalCategory
            : categories[index % categories.length];

        // Mock similar video
        items.push({
            id: `sim-${index}`,
            similarityScore: Math.random() * 0.3 + 0.7, // Random score between 0.7-1.0
            video: {
                id: `v${index}`,
                title: `${category.name} Adventure ${index}`,
                thumbnailUrl: `https://picsum.photos/seed/sim${index}/300/450`,
                backdropUrl: `https://picsum.photos/seed/sim${index}/1920/1080`,
                releaseYear: 2020 + Math.floor(Math.random() * 5),
                duration: 5400 + index * 300, // 90+ minutes in seconds
                rating: {
                    average: 3.5 + Math.random(),
                    count: 500 + index * 100,
                },
                genre: [
                    category.name,
                    index % 3 === 0 ? "Mystery" : "Adventure",
                ],
                description: `A captivating ${category.name.toLowerCase()} with elements that viewers of this content typically enjoy.`,
            },
        });
    }

    return Promise.resolve({
        title: "Similar Content",
        description: "Videos you may also enjoy",
        items,
        source: "similar",
    });
}
