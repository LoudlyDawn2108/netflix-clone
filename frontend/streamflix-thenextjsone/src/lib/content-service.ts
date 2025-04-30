import type { HomePageContent, VideoContent, FeaturedContent } from "@/lib/types"

// Mock data for the content service
const mockFeatured: FeaturedContent = {
  id: "tt5180504",
  title: "The Witcher",
  thumbnailPath: "/placeholder.svg?height=720&width=1280",
  backdropPath: "/placeholder.svg?height=1080&width=1920",
  logoPath: "/placeholder.svg?height=200&width=400",
  overview:
    "Geralt of Rivia, a solitary monster hunter, struggles to find his place in a world where people often prove more wicked than beasts.",
  releaseYear: 2019,
  maturityRating: "TV-MA",
  duration: "1h",
  genres: ["Fantasy", "Action", "Adventure"],
  matchPercentage: 97,
}

const generateMockVideos = (count: number, prefix: string): VideoContent[] => {
  return Array.from({ length: count }).map((_, index) => ({
    id: `${prefix}-${index + 1}`,
    title: `${prefix} Title ${index + 1}`,
    thumbnailPath: `/placeholder.svg?height=720&width=1280&text=${prefix}${index + 1}`,
    backdropPath: `/placeholder.svg?height=1080&width=1920&text=${prefix}${index + 1}`,
    overview: `This is a mock overview for ${prefix} ${index + 1}. It contains a brief description of the content.`,
    releaseYear: 2020 + Math.floor(Math.random() * 4),
    maturityRating: ["TV-MA", "TV-14", "PG-13", "R"][Math.floor(Math.random() * 4)],
    duration: `${Math.floor(Math.random() * 2) + 1}h ${Math.floor(Math.random() * 59) + 1}m`,
    genres: [
      ["Action", "Adventure", "Sci-Fi"],
      ["Comedy", "Romance"],
      ["Drama", "Thriller"],
      ["Horror", "Mystery"],
      ["Documentary", "Biography"],
    ][Math.floor(Math.random() * 5)],
    matchPercentage: Math.floor(Math.random() * 30) + 70,
    progress: prefix === "continue" ? Math.floor(Math.random() * 90) + 10 : undefined,
    relatedTo: prefix === "because" ? "Stranger Things" : undefined,
  }))
}

// Mock API call to get homepage content
export async function getHomePageContent(): Promise<HomePageContent> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500))

  return {
    featured: mockFeatured,
    trending: {
      id: "trending",
      title: "Trending Now",
      items: generateMockVideos(10, "trending"),
    },
    popular: {
      id: "popular",
      title: "Popular on StreamFlix",
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
  }
}

// Get video details by ID
export async function getVideoById(id: string): Promise<VideoContent | null> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 300))

  // For demo purposes, generate a mock video
  if (!id) return null

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
  }
}

// Search videos
export async function searchVideos(query: string, filters?: Record<string, any>): Promise<VideoContent[]> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 700))

  // For demo purposes, generate mock search results
  return generateMockVideos(8, `search-${query}`)
}

// Get search suggestions
export async function getSearchSuggestions(query: string): Promise<string[]> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 300))

  // Mock suggestions based on query
  const suggestions = [
    `${query} movies`,
    `${query} tv shows`,
    `${query} documentaries`,
    `${query} actors`,
    `${query} directors`,
  ]

  return suggestions
}

// Get personalized recommendations
export async function getPersonalizedRecommendations(): Promise<{
  becauseYouWatched: VideoContent[]
  topPicks: VideoContent[]
  watchAgain: VideoContent[]
}> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500))

  return {
    becauseYouWatched: generateMockVideos(8, "because"),
    topPicks: generateMockVideos(10, "picks"),
    watchAgain: generateMockVideos(6, "again"),
  }
}
