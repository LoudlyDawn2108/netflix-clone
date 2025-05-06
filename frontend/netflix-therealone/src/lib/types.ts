// Basic video content type
export interface VideoContent {
    id: string;
    title: string;
    thumbnailPath: string;
    backdropPath: string;
    overview: string;
    releaseYear: number;
    maturityRating: string;
    duration: string;
    genres: string[];
    matchPercentage?: number;
    progress?: number; // For continue watching
    relatedTo?: string; // For "Because you watched" recommendations
}

export interface FeaturedContent extends VideoContent {
    videoId?: string;
    trailerPath?: string;
    logoPath?: string;
}

// Content row (e.g., trending, popular, etc.)
export interface ContentRow {
    id: string;
    title: string;
    subtitle?: string;
    items: VideoContent[];
}

// Cast member
export interface CastMember {
    id: string;
    name: string;
    character: string;
    profilePath?: string;
    order: number;
}

// Episode
export interface Episode {
    id: string;
    title: string;
    episodeNumber: number;
    seasonNumber: number;
    overview: string;
    thumbnailPath?: string;
    duration: string;
    airDate?: string;
    director?: string;
    isNew?: boolean;
}

// Season
export interface Season {
    seasonNumber: number;
    episodeCount: number;
    episodes: Episode[];
}

// Review
export interface Review {
    id: string;
    author: string;
    authorImage?: string;
    title: string;
    content: string;
    rating: number;
    date: string;
    helpfulCount: number;
    publication?: string;
}

// ReviewsSection
export interface ReviewsSection {
    user: Review[];
    critic: Review[];
    averageRating: number;
    totalReviews: number;
    ratingDistribution: number[];
}

// Home page content
export interface HomePageContent {
    featured: FeaturedContent;
    trending: ContentRow;
    popular: ContentRow;
    newReleases: ContentRow;
    continueWatching: ContentRow;
    myList: ContentRow;
    becauseYouWatched: ContentRow;
    topPicks: ContentRow;
    watchAgain: ContentRow;
}

// Detailed content information
export interface ContentDetails extends VideoContent {
    type: "movie" | "series";
    logoPath?: string;
    releaseDate?: string;
    cast: CastMember[];
    director?: string;
    writers?: string[];
    creator?: string;
    seasons?: Season[];
    totalEpisodes?: number;
    audioLanguages?: string[];
    subtitleLanguages?: string[];
    videoQuality?: string;
    studio?: string;
    awards?: string[];
    reviews: ReviewsSection;
    similar: VideoContent[];
}

// User
export interface User {
    id: string;
    name: string;
    email: string;
    profileImage?: string;
    isKid?: boolean;
    isPrimary?: boolean;
}

// User preferences
export interface UserPreferences {
    language: string;
    maturityLevel: string;
    autoplayPreviews: boolean;
    autoplayNextEpisode: boolean;
}

// Authentication
export interface AuthResponse {
    user: User;
    token: string;
    expires: number;
}
