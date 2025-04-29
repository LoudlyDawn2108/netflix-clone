// This file contains mock data to use during development
// This simulates API responses without requiring a back-end

// Mock categories
export const categories = [
    { id: "action", name: "Action" },
    { id: "comedy", name: "Comedy" },
    { id: "drama", name: "Drama" },
    { id: "scifi", name: "Sci-Fi" },
    { id: "horror", name: "Horror" },
    { id: "documentary", name: "Documentary" },
];

// Base array of mock videos
export const baseVideos = [
    {
        id: "v1",
        title: "Cosmic Odyssey",
        description:
            "A team of astronauts embarks on a dangerous mission to save humanity from an impending cosmic threat.",
        thumbnailUrl: "https://picsum.photos/seed/cosmic/300/450",
        backdropUrl: "https://picsum.photos/seed/cosmic/1920/1080",
        releaseYear: 2023,
        duration: 7860, // in seconds (131 minutes)
        rating: { average: 4.7, count: 1289 },
        genre: ["Sci-Fi", "Adventure", "Drama"],
        isNew: true,
    },
    {
        id: "v2",
        title: "City Lights",
        description:
            "A street performer and a high-powered executive swap lives for a week, leading to unexpected personal growth.",
        thumbnailUrl: "https://picsum.photos/seed/citylights/300/450",
        backdropUrl: "https://picsum.photos/seed/citylights/1920/1080",
        releaseYear: 2022,
        duration: 6480, // in seconds (108 minutes)
        rating: { average: 4.2, count: 986 },
        genre: ["Comedy", "Drama"],
    },
    {
        id: "v3",
        title: "The Last Kingdom",
        description:
            "An epic tale of power struggles in a medieval kingdom as rival families compete for the throne.",
        thumbnailUrl: "https://picsum.photos/seed/kingdom/300/450",
        backdropUrl: "https://picsum.photos/seed/kingdom/1920/1080",
        releaseYear: 2023,
        duration: 8940, // in seconds (149 minutes)
        rating: { average: 4.8, count: 2453 },
        genre: ["Action", "Drama", "History"],
        isNew: true,
    },
    {
        id: "v4",
        title: "Midnight Mystery",
        description:
            "A detective must solve a baffling murder case before the killer strikes again in a small coastal town.",
        thumbnailUrl: "https://picsum.photos/seed/mystery/300/450",
        backdropUrl: "https://picsum.photos/seed/mystery/1920/1080",
        releaseYear: 2021,
        duration: 6720, // in seconds (112 minutes)
        rating: { average: 4.4, count: 1532 },
        genre: ["Mystery", "Thriller", "Crime"],
    },
    {
        id: "v5",
        title: "Laughter Therapy",
        description:
            "A burned-out therapist finds new inspiration when she starts using comedy in her therapy sessions.",
        thumbnailUrl: "https://picsum.photos/seed/laughter/300/450",
        backdropUrl: "https://picsum.photos/seed/laughter/1920/1080",
        releaseYear: 2022,
        duration: 5880, // in seconds (98 minutes)
        rating: { average: 3.9, count: 845 },
        genre: ["Comedy"],
    },
    {
        id: "v6",
        title: "The Deep Below",
        description:
            "A marine research team discovers a terrifying creature in the depths of the ocean.",
        thumbnailUrl: "https://picsum.photos/seed/deep/300/450",
        backdropUrl: "https://picsum.photos/seed/deep/1920/1080",
        releaseYear: 2023,
        duration: 7320, // in seconds (122 minutes)
        rating: { average: 4.1, count: 1105 },
        genre: ["Horror", "Sci-Fi", "Thriller"],
        isNew: true,
    },
    {
        id: "v7",
        title: "Revolutionary Ideas",
        description:
            "The story of three inventors who changed the world with their breakthrough technologies.",
        thumbnailUrl: "https://picsum.photos/seed/ideas/300/450",
        backdropUrl: "https://picsum.photos/seed/ideas/1920/1080",
        releaseYear: 2021,
        duration: 8400, // in seconds (140 minutes)
        rating: { average: 4.6, count: 1872 },
        genre: ["Documentary", "History"],
    },
    {
        id: "v8",
        title: "Family Ties",
        description:
            "Three generations of a family deal with love, loss, and learning to forgive.",
        thumbnailUrl: "https://picsum.photos/seed/family/300/450",
        backdropUrl: "https://picsum.photos/seed/family/1920/1080",
        releaseYear: 2022,
        duration: 7020, // in seconds (117 minutes)
        rating: { average: 4.3, count: 1236 },
        genre: ["Drama", "Family"],
    },
    {
        id: "v9",
        title: "Desert Storm",
        description:
            "An elite special forces team is sent on a dangerous mission into enemy territory.",
        thumbnailUrl: "https://picsum.photos/seed/desert/300/450",
        backdropUrl: "https://picsum.photos/seed/desert/1920/1080",
        releaseYear: 2023,
        duration: 7980, // in seconds (133 minutes)
        rating: { average: 4.5, count: 2018 },
        genre: ["Action", "War"],
        isNew: true,
    },
    {
        id: "v10",
        title: "The Programmer",
        description:
            "A brilliant but reclusive programmer creates an AI that begins to develop consciousness.",
        thumbnailUrl: "https://picsum.photos/seed/programmer/300/450",
        backdropUrl: "https://picsum.photos/seed/programmer/1920/1080",
        releaseYear: 2022,
        duration: 7140, // in seconds (119 minutes)
        rating: { average: 4.4, count: 1653 },
        genre: ["Sci-Fi", "Drama", "Thriller"],
    },
    {
        id: "v11",
        title: "Laugh Out Loud",
        description:
            "A stand-up comedian struggles to balance career ambitions with personal relationships.",
        thumbnailUrl: "https://picsum.photos/seed/laugh/300/450",
        backdropUrl: "https://picsum.photos/seed/laugh/1920/1080",
        releaseYear: 2021,
        duration: 6300, // in seconds (105 minutes)
        rating: { average: 4.0, count: 921 },
        genre: ["Comedy", "Romance"],
    },
    {
        id: "v12",
        title: "Haunted Manor",
        description:
            "A family moves into a historic mansion only to discover it's inhabited by restless spirits.",
        thumbnailUrl: "https://picsum.photos/seed/haunted/300/450",
        backdropUrl: "https://picsum.photos/seed/haunted/1920/1080",
        releaseYear: 2023,
        duration: 6900, // in seconds (115 minutes)
        rating: { average: 4.2, count: 1345 },
        genre: ["Horror", "Mystery"],
        isNew: true,
    },
    {
        id: "v13",
        title: "Wildlife Wonders",
        description:
            "An eye-opening journey through the world's most diverse ecosystems and their endangered inhabitants.",
        thumbnailUrl: "https://picsum.photos/seed/wildlife/300/450",
        backdropUrl: "https://picsum.photos/seed/wildlife/1920/1080",
        releaseYear: 2022,
        duration: 9000, // in seconds (150 minutes)
        rating: { average: 4.9, count: 2187 },
        genre: ["Documentary", "Nature"],
    },
    {
        id: "v14",
        title: "Time Capsule",
        description:
            "A scientist invents a time machine and accidentally alters the past, creating unforeseen consequences.",
        thumbnailUrl: "https://picsum.photos/seed/time/300/450",
        backdropUrl: "https://picsum.photos/seed/time/1920/1080",
        releaseYear: 2023,
        duration: 7620, // in seconds (127 minutes)
        rating: { average: 4.3, count: 1879 },
        genre: ["Sci-Fi", "Adventure"],
        isNew: true,
    },
    {
        id: "v15",
        title: "The Big Match",
        description:
            "An underdog sports team works to overcome personal differences and win the championship.",
        thumbnailUrl: "https://picsum.photos/seed/match/300/450",
        backdropUrl: "https://picsum.photos/seed/match/1920/1080",
        releaseYear: 2021,
        duration: 7200, // in seconds (120 minutes)
        rating: { average: 4.5, count: 1567 },
        genre: ["Drama", "Sport"],
    },
];

// Generate videos with different genre associations for each category
export function generateMockVideosForCategory(categoryId, count = 10) {
    const categoryName =
        categories.find((c) => c.id === categoryId)?.name || categoryId;

    // For predefined categories like "trending" or "recent"
    if (categoryId === "trending") {
        return baseVideos
            .sort((a, b) => b.rating.average - a.rating.average)
            .slice(0, count);
    }

    if (categoryId === "recent") {
        return baseVideos.filter((v) => v.isNew).slice(0, count);
    }

    // For regular genre categories
    return baseVideos
        .filter((video) => {
            const genres = video.genre.map((g) => g.toLowerCase());
            return genres.includes(categoryName.toLowerCase());
        })
        .slice(0, count);
}

// Mock playback info
export function generateMockPlaybackInfo(videoId) {
    return {
        id: videoId,
        hlsUrl: "https://example.com/videos/sample/master.m3u8",
        dashUrl: "https://example.com/videos/sample/manifest.mpd",
        subtitles: [
            {
                language: "en",
                label: "English",
                url: "https://example.com/subtitles/en.vtt",
            },
            {
                language: "es",
                label: "Spanish",
                url: "https://example.com/subtitles/es.vtt",
            },
        ],
        audioTracks: [
            { language: "en", label: "English", default: true },
            { language: "es", label: "Spanish" },
        ],
        drmInfo: {
            widevine: {
                licenseUrl: "https://example.com/drm/widevine",
            },
            fairplay: {
                certificateUrl: "https://example.com/drm/fairplay/cert",
                licenseUrl: "https://example.com/drm/fairplay",
            },
        },
    };
}

// Mock video details with extra information
export function getMockVideoDetails(videoId) {
    const baseVideo = baseVideos.find((v) => v.id === videoId);

    if (!baseVideo) return null;

    // Add extra details not included in list view
    return {
        ...baseVideo,
        cast: ["Actor One", "Actor Two", "Actor Three", "Actor Four"],
        director: "Famous Director",
        writers: ["Writer One", "Writer Two"],
        maturityRating: "PG-13",
        languages: ["English", "Spanish", "French"],
        subtitles: ["English", "Spanish", "French"],
        reviews: [
            {
                id: "r1",
                userId: "user1",
                username: "MovieFan123",
                rating: 5,
                comment: "One of the best movies I've seen this year!",
                date: "2023-04-15T12:30:00Z",
            },
            {
                id: "r2",
                userId: "user2",
                username: "CinemaLover",
                rating: 4,
                comment: "Great performances by the entire cast.",
                date: "2023-04-10T09:15:00Z",
            },
        ],
    };
}
