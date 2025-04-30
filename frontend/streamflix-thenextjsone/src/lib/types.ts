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
