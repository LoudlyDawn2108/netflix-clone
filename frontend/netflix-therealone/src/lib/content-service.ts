import type {
    HomePageContent,
    VideoContent,
    FeaturedContent,
    ContentDetails,
    CastMember,
    Review,
    Episode,
} from "./types";

// Mock data for the content service
const mockFeatured: FeaturedContent = {
    id: "tt5180504",
    title: "The Witcher",
    thumbnailPath:
        "https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg",
    backdropPath:
        "https://image.tmdb.org/t/p/original/56v2KjBlU4XaOv9rVYEQypROD7P.jpg",
    logoPath: "https://image.tmdb.org/t/p/w500/hiuGzVlWZkwBp1QZCNj4H6hHEYM.png",
    overview:
        "Geralt of Rivia, a solitary monster hunter, struggles to find his place in a world where people often prove more wicked than beasts.",
    releaseYear: 2019,
    maturityRating: "TV-MA",
    duration: "1h",
    genres: ["Fantasy", "Action", "Adventure"],
    matchPercentage: 97,
};

const generateMockVideos = (count: number, prefix: string): VideoContent[] => {
    return Array.from({ length: count }).map((_, index) => ({
        id: `${prefix}-${index + 1}`,
        title: `${prefix} Title ${index + 1}`,
        thumbnailPath: `/placeholder.svg?height=720&width=1280&text=${prefix}${
            index + 1
        }`,
        backdropPath: `/placeholder.svg?height=1080&width=1920&text=${prefix}${
            index + 1
        }`,
        overview: `This is a mock overview for ${prefix} ${
            index + 1
        }. It contains a brief description of the content.`,
        releaseYear: 2020 + Math.floor(Math.random() * 4),
        maturityRating: ["TV-MA", "TV-14", "PG-13", "R"][
            Math.floor(Math.random() * 4)
        ],
        duration: `${Math.floor(Math.random() * 2) + 1}h ${
            Math.floor(Math.random() * 59) + 1
        }m`,
        genres: [
            ["Action", "Adventure", "Sci-Fi"],
            ["Comedy", "Romance"],
            ["Drama", "Thriller"],
            ["Horror", "Mystery"],
            ["Documentary", "Biography"],
        ][Math.floor(Math.random() * 5)],
        matchPercentage: Math.floor(Math.random() * 30) + 70,
        progress:
            prefix === "continue"
                ? Math.floor(Math.random() * 90) + 10
                : undefined,
        relatedTo: prefix === "because" ? "Stranger Things" : undefined,
    }));
};

// Mock API call to get homepage content
export async function getHomePageContent(): Promise<HomePageContent> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
        featured: mockFeatured,
        trending: {
            id: "trending",
            title: "Trending Now",
            items: generateMockVideos(10, "trending"),
        },
        popular: {
            id: "popular",
            title: "Popular on Netflix",
            items: generateMockVideos(10, "popular"),
        },
        newReleases: {
            id: "new",
            title: "New Releases",
            items: generateMockVideos(10, "new"),
        },
        continueWatching: {
            id: "continue",
            title: "Continue Watching",
            items: generateMockVideos(5, "continue"),
        },
        myList: {
            id: "mylist",
            title: "My List",
            items: generateMockVideos(8, "mylist"),
        },
        // New personalized recommendations
        becauseYouWatched: {
            id: "because",
            title: "Because You Watched Stranger Things",
            items: generateMockVideos(8, "because"),
        },
        topPicks: {
            id: "picks",
            title: "Top Picks For You",
            subtitle: "Based on your viewing history",
            items: generateMockVideos(10, "picks"),
        },
        watchAgain: {
            id: "again",
            title: "Watch Again",
            subtitle: "Shows and movies you've enjoyed before",
            items: generateMockVideos(6, "again"),
        },
    };
}

// Get video details by ID (simple version)
export async function getVideoById(id: string): Promise<VideoContent | null> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    // For demo purposes, generate a mock video
    if (!id) return null;

    return {
        id,
        title: `Video ${id}`,
        thumbnailPath: `/placeholder.svg?height=720&width=1280&text=Video${id}`,
        backdropPath: `/placeholder.svg?height=1080&width=1920&text=Video${id}`,
        overview: `This is a detailed overview for Video ${id}. It contains a comprehensive description of the content, including plot points, main characters, and themes.`,
        releaseYear: 2022,
        maturityRating: "TV-MA",
        duration: "1h 45m",
        genres: ["Action", "Adventure", "Drama"],
        matchPercentage: 92,
    };
}

// Get detailed content information - main function for the title page
export async function getContentDetails(
    id: string
): Promise<ContentDetails | null> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 700));

    // For demo purposes, determine if this is a movie or series based on the ID
    const isSeries = id.includes("series") || Math.random() > 0.5;

    // Generate mock cast
    const mockCast: CastMember[] = Array.from({ length: 12 }).map(
        (_, index) => ({
            id: `actor-${index + 1}`,
            name: `Actor ${index + 1}`,
            character: `Character ${index + 1}`,
            profilePath: `/placeholder.svg?height=300&width=300&text=Actor${
                index + 1
            }`,
            order: index,
        })
    );

    // Generate mock reviews
    const generateReviews = (
        count: number,
        type: "user" | "critic"
    ): Review[] => {
        return Array.from({ length: count }).map((_, index) => ({
            id: `${type}-review-${index + 1}`,
            author: `${type === "critic" ? "Critic" : "User"} ${index + 1}`,
            authorImage: `/placeholder.svg?height=100&width=100&text=${type}${
                index + 1
            }`,
            title: `${type === "critic" ? "Professional" : "User"} Review ${
                index + 1
            }`,
            content: `This is a ${type} review for the content. It discusses various aspects like acting, direction, screenplay, and overall entertainment value. ${
                type === "critic"
                    ? "The review is written from a professional perspective."
                    : "The review reflects personal opinion."
            }`,
            rating: Math.floor(Math.random() * 3) + 3, // 3-5 stars
            date: `${Math.floor(Math.random() * 28) + 1}/${
                Math.floor(Math.random() * 12) + 1
            }/2023`,
            helpfulCount: Math.floor(Math.random() * 100),
            publication:
                type === "critic" ? `Publication ${index + 1}` : undefined,
        }));
    };

    // Generate mock episodes for series
    const generateEpisodes = (
        seasonNumber: number,
        episodeCount: number
    ): Episode[] => {
        return Array.from({ length: episodeCount }).map((_, index) => ({
            id: `s${seasonNumber}e${index + 1}`,
            title: `Episode ${index + 1}`,
            episodeNumber: index + 1,
            seasonNumber,
            overview: `This is the overview for Season ${seasonNumber}, Episode ${
                index + 1
            }. It describes the main plot points and events that occur in this episode.`,
            thumbnailPath: `/placeholder.svg?height=720&width=1280&text=S${seasonNumber}E${
                index + 1
            }`,
            duration: `${Math.floor(Math.random() * 30) + 30}m`,
            airDate: `${Math.floor(Math.random() * 28) + 1}/${
                Math.floor(Math.random() * 12) + 1
            }/2023`,
            director: `Director ${Math.floor(Math.random() * 5) + 1}`,
            isNew: index === episodeCount - 1,
        }));
    };

    // Generate mock seasons for series
    const mockSeasons = isSeries
        ? Array.from({ length: Math.floor(Math.random() * 5) + 1 }).map(
              (_, index) => ({
                  seasonNumber: index + 1,
                  episodeCount: Math.floor(Math.random() * 10) + 5,
                  episodes: generateEpisodes(
                      index + 1,
                      Math.floor(Math.random() * 10) + 5
                  ),
              })
          )
        : undefined;

    // Calculate total episodes
    const totalEpisodes =
        mockSeasons?.reduce((acc, season) => acc + season.episodes.length, 0) ||
        0;

    return {
        id,
        title: `${isSeries ? "Series" : "Movie"} ${id}`,
        type: isSeries ? "series" : "movie",
        thumbnailPath: `/placeholder.svg?height=720&width=1280&text=${
            isSeries ? "Series" : "Movie"
        }${id}`,
        backdropPath: `/placeholder.svg?height=1080&width=1920&text=${
            isSeries ? "Series" : "Movie"
        }${id}`,
        logoPath: `/placeholder.svg?height=200&width=400&text=${
            isSeries ? "Series" : "Movie"
        }${id}`,
        overview: `This is a detailed overview for ${
            isSeries ? "Series" : "Movie"
        } ${id}. It contains a comprehensive description of the content, including plot points, main characters, and themes. The story follows a group of characters as they navigate through various challenges and adventures.`,
        releaseYear: 2020 + Math.floor(Math.random() * 4),
        releaseDate: `${Math.floor(Math.random() * 28) + 1}/${
            Math.floor(Math.random() * 12) + 1
        }/2023`,
        maturityRating: ["TV-MA", "TV-14", "PG-13", "R"][
            Math.floor(Math.random() * 4)
        ],
        duration: isSeries
            ? `${mockSeasons?.[0].episodes[0].duration}`
            : `${Math.floor(Math.random() * 60) + 90}m`,
        genres: [
            ["Action", "Adventure", "Sci-Fi"],
            ["Comedy", "Romance"],
            ["Drama", "Thriller"],
            ["Horror", "Mystery"],
            ["Documentary", "Biography"],
        ][Math.floor(Math.random() * 5)],
        matchPercentage: Math.floor(Math.random() * 30) + 70,
        cast: mockCast,
        director: isSeries
            ? undefined
            : `Director ${Math.floor(Math.random() * 5) + 1}`,
        writers: isSeries
            ? undefined
            : [
                  `Writer ${Math.floor(Math.random() * 3) + 1}`,
                  `Writer ${Math.floor(Math.random() * 3) + 4}`,
              ],
        creator: isSeries
            ? `Creator ${Math.floor(Math.random() * 5) + 1}`
            : undefined,
        seasons: mockSeasons,
        totalEpisodes,
        audioLanguages: ["English", "Spanish", "French"],
        subtitleLanguages: [
            "English",
            "Spanish",
            "French",
            "German",
            "Italian",
        ],
        videoQuality: ["HD", "4K", "HDR", "Dolby Vision"][
            Math.floor(Math.random() * 4)
        ],
        studio: `Studio ${Math.floor(Math.random() * 5) + 1}`,
        awards:
            Math.random() > 0.5
                ? [
                      `Award ${Math.floor(Math.random() * 3) + 1}`,
                      `Award ${Math.floor(Math.random() * 3) + 4}`,
                  ]
                : [],
        reviews: {
            user: generateReviews(8, "user"),
            critic: generateReviews(5, "critic"),
            averageRating: Math.floor(Math.random() * 15) / 10 + 3.5, // 3.5-5.0
            totalReviews: Math.floor(Math.random() * 1000) + 100,
            ratingDistribution: [
                Math.floor(Math.random() * 100) + 50, // 5 stars
                Math.floor(Math.random() * 50) + 30, // 4 stars
                Math.floor(Math.random() * 30) + 10, // 3 stars
                Math.floor(Math.random() * 20) + 5, // 2 stars
                Math.floor(Math.random() * 10) + 1, // 1 star
            ],
        },
        similar: generateMockVideos(10, "similar"),
    };
}

// Search videos
export async function searchVideos(
    query: string,
    filters?: Record<string, any>
): Promise<VideoContent[]> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 700));

    // For demo purposes, generate mock search results
    return generateMockVideos(8, `search-${query}`);
}

// Get search suggestions
export async function getSearchSuggestions(query: string): Promise<string[]> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Mock suggestions based on query
    const suggestions = [
        `${query} movies`,
        `${query} tv shows`,
        `${query} documentaries`,
        `${query} actors`,
        `${query} directors`,
    ];

    return suggestions;
}

// Get personalized recommendations
export async function getPersonalizedRecommendations(): Promise<{
    becauseYouWatched: VideoContent[];
    topPicks: VideoContent[];
    watchAgain: VideoContent[];
}> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
        becauseYouWatched: generateMockVideos(8, "because"),
        topPicks: generateMockVideos(10, "picks"),
        watchAgain: generateMockVideos(6, "again"),
    };
}
