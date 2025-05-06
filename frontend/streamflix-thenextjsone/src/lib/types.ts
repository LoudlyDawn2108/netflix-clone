export interface VideoContent {
  id: string
  title: string
  thumbnailPath: string
  backdropPath: string
  logoPath?: string
  overview: string
  releaseYear: number
  maturityRating: string
  duration: string
  genres: string[]
  matchPercentage: number
  progress?: number // For continue watching
  relatedTo?: string // For "Because you watched" recommendations
}

export interface FeaturedContent extends VideoContent {
  videoId?: string
  trailerPath?: string
}

export interface ContentRow {
  id: string
  title: string
  subtitle?: string
  items: VideoContent[]
}

export interface HomePageContent {
  featured: FeaturedContent
  trending: ContentRow
  popular: ContentRow
  newReleases: ContentRow
  continueWatching: ContentRow
  myList: ContentRow
  becauseYouWatched: ContentRow
  topPicks: ContentRow
  watchAgain: ContentRow
}

export interface User {
  id: string
  name: string
  email: string
  avatarPath?: string
  subscription: {
    plan: string
    status: "active" | "canceled" | "expired"
    renewalDate?: string
  }
}

export interface Profile {
  id: string
  name: string
  avatarPath?: string
  isKids: boolean
}

export interface AuthState {
  isAuthenticated: boolean
  user: User | null
  profiles: Profile[]
  currentProfile: Profile | null
  token: string | null
}

export interface CastMember {
  id: string
  name: string
  character: string
  profilePath: string
  order: number
}

export interface Review {
  id: string
  author: string
  authorImage?: string
  title: string
  content: string
  rating: number
  date: string
  helpfulCount: number
  publication?: string
}

export interface Episode {
  id: string
  title: string
  episodeNumber: number
  seasonNumber: number
  overview: string
  thumbnailPath: string
  duration: string
  airDate: string
  director: string
  isNew?: boolean
}

export interface Season {
  id: string
  seasonNumber: number
  title: string
  overview: string
  episodes: Episode[]
}

export interface ContentDetails extends VideoContent {
  type: "movie" | "series"
  releaseDate: string
  cast: CastMember[]
  director?: string // For movies
  writers?: string[] // For movies
  creator?: string // For series
  seasons?: Season[] // For series
  totalEpisodes?: number // For series
  audioLanguages: string[]
  subtitleLanguages: string[]
  videoQuality: string
  studio?: string
  awards?: string[]
  reviews: {
    user: Review[]
    critic: Review[]
    averageRating: number
    totalReviews: number
    ratingDistribution: number[] // [5-star count, 4-star count, 3-star count, 2-star count, 1-star count]
  }
  similar: VideoContent[]
}
