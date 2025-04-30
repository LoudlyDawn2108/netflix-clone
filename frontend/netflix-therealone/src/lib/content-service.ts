import { HomePageContent, VideoContent } from './types'

// Mock data for development - in a real app, this would call an API
const mockVideoContent: VideoContent[] = [
  {
    id: "1",
    title: "Stranger Things",
    thumbnailPath: "https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg",
    backdropPath: "https://image.tmdb.org/t/p/original/56v2KjBlU4XaOv9rVYEQypROD7P.jpg",
    logoPath: "https://image.tmdb.org/t/p/w500/hiuGzVlWZkwBp1QZCNj4H6hHEYM.png",
    overview: "When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces, and one strange little girl.",
    releaseYear: 2016,
    maturityRating: "TV-14",
    duration: "8 Episodes",
    genres: ["Drama", "Fantasy", "Mystery"],
    matchPercentage: 97,
  },
  {
    id: "2",
    title: "The Witcher",
    thumbnailPath: "https://image.tmdb.org/t/p/w500/7vjaCdMw15FEbXyLQTVa04URsPm.jpg",
    backdropPath: "https://image.tmdb.org/t/p/original/arYvUXhpNRfvvdYHdA3dlVyMUO0.jpg",
    logoPath: "https://image.tmdb.org/t/p/w500/vargscDm4GXYpUUZwMpOcLTlEPm.png",
    overview: "Geralt of Rivia, a mutated monster-hunter for hire, journeys toward his destiny in a turbulent world where people often prove more wicked than beasts.",
    releaseYear: 2019,
    maturityRating: "TV-MA",
    duration: "2 Seasons",
    genres: ["Action", "Adventure", "Fantasy"],
    matchPercentage: 95,
  },
  {
    id: "3",
    title: "Wednesday",
    thumbnailPath: "https://image.tmdb.org/t/p/w500/9PFonBhy4cQy7Jz20NpMygczOkv.jpg",
    backdropPath: "https://image.tmdb.org/t/p/original/iHSwvRVsRyxpX7FE7GbviaDvgGZ.jpg",
    overview: "Wednesday Addams is sent to Nevermore Academy, a bizarre boarding school where she attempts to master her psychic powers, solve a murder mystery, and adjust to new relationships.",
    releaseYear: 2022,
    maturityRating: "TV-14",
    duration: "1 Season",
    genres: ["Comedy", "Fantasy", "Horror"],
    matchPercentage: 93,
  },
  {
    id: "4",
    title: "Squid Game",
    thumbnailPath: "https://image.tmdb.org/t/p/w500/dDlEmu3EZ0Pgg93K2SVNLCjCSvE.jpg",
    backdropPath: "https://image.tmdb.org/t/p/original/qw3J9cNeLioOLoR68WX7z79aCdK.jpg",
    overview: "Hundreds of cash-strapped players accept a strange invitation to compete in children's games. Inside, a tempting prize awaits — with deadly high stakes.",
    releaseYear: 2021,
    maturityRating: "TV-MA",
    duration: "1 Season",
    genres: ["Action", "Drama", "Mystery"],
    matchPercentage: 92,
  },
  {
    id: "5",
    title: "Money Heist",
    thumbnailPath: "https://image.tmdb.org/t/p/w500/reEMJA1uzscCbkpeRJeTT2bjqUp.jpg",
    backdropPath: "https://image.tmdb.org/t/p/original/gFZriCkpJYsApPZEF3jhxL4yLzG.jpg",
    logoPath: "https://image.tmdb.org/t/p/w500/1qOA3kMtQO0ks4oikWTYrqfN7Jq.png",
    overview: "To carry out the biggest heist in history, a mysterious man called The Professor recruits a band of eight robbers who have a single characteristic: none of them has anything to lose.",
    releaseYear: 2017,
    maturityRating: "TV-MA",
    duration: "5 Seasons",
    genres: ["Action", "Crime", "Drama"],
    matchPercentage: 90,
  },
  {
    id: "6",
    title: "Black Mirror",
    thumbnailPath: "https://image.tmdb.org/t/p/w500/7PRddO7z7mcPi2Lb3X1LvMw8xnx.jpg",
    backdropPath: "https://image.tmdb.org/t/p/original/7RxuJxYUdTIIqGrpvuCnPTOzana.jpg",
    overview: "A contemporary British anthology series focusing on the dark side of technology and how it affects modern society.",
    releaseYear: 2011,
    maturityRating: "TV-MA",
    duration: "6 Seasons",
    genres: ["Drama", "Sci-Fi", "Thriller"],
    matchPercentage: 88,
  }
]

// Generate more mock content for different sections
const createContinueWatching = () => {
  return mockVideoContent.slice(0, 4).map(item => ({
    ...item,
    progress: Math.floor(Math.random() * 95)
  }))
}

const createMyList = () => {
  return mockVideoContent.slice(1, 5)
}

const createTrending = () => {
  return [...mockVideoContent].sort(() => Math.random() - 0.5)
}

const createPopular = () => {
  return [...mockVideoContent].sort(() => Math.random() - 0.5).slice(0, 5)
}

const createNewReleases = () => {
  return [...mockVideoContent].sort(() => Math.random() - 0.5)
}

const createBecauseYouWatched = () => {
  const sourceContent = mockVideoContent[0]
  return {
    title: `Because you watched ${sourceContent.title}`,
    items: mockVideoContent.slice(1).map(item => ({
      ...item,
      relatedTo: sourceContent.id
    }))
  }
}

const createTopPicks = () => {
  return {
    title: "Top Picks For You",
    subtitle: "Based on your watching history",
    items: [...mockVideoContent].sort(() => Math.random() - 0.5)
  }
}

const createWatchAgain = () => {
  return {
    title: "Watch It Again",
    subtitle: "Shows you might want to revisit",
    items: [...mockVideoContent].sort(() => Math.random() - 0.5).slice(0, 4)
  }
}

// Function to get home page content
export async function getHomePageContent(): Promise<HomePageContent> {
  // In a real application, this would make API calls to different endpoints
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500))
  
  return {
    featured: {
      ...mockVideoContent[0],
      videoId: "video-1",
      trailerPath: "https://example.com/trailer.mp4"
    },
    trending: {
      id: "trending",
      title: "Trending Now",
      items: createTrending()
    },
    popular: {
      id: "popular",
      title: "Popular on StreamFlix",
      items: createPopular()
    },
    newReleases: {
      id: "new-releases",
      title: "New Releases",
      items: createNewReleases()
    },
    continueWatching: {
      id: "continue-watching",
      title: "Continue Watching",
      items: createContinueWatching()
    },
    myList: {
      id: "my-list",
      title: "My List",
      items: createMyList()
    },
    becauseYouWatched: {
      id: "because-you-watched",
      ...createBecauseYouWatched()
    },
    topPicks: {
      id: "top-picks",
      ...createTopPicks()
    },
    watchAgain: {
      id: "watch-again",
      ...createWatchAgain()
    }
  }
}

// In a real app, we would have more functions here to get specific content
export async function getSearchSuggestions(query: string): Promise<string[]> {
  // This would normally call an API
  await new Promise(resolve => setTimeout(resolve, 300))
  
  const suggestions = [
    "Stranger Things",
    "Stranger Things Season 4",
    "Stranger",
    "The Strangers",
    "The Witcher",
    "Wednesday",
    "Squid Game",
    "Money Heist"
  ]
  
  return suggestions.filter(s => 
    s.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 5)
}

// Function to search videos with filters
export async function searchVideos(
  query: string, 
  filters?: {
    genre?: string;
    year?: string;
    rating?: string;
    page?: number;
    limit?: number;
  }
): Promise<VideoContent[]> {
  // In a real app, this would be an API call with query parameters
  const defaultFilters = {
    genre: '',
    year: '',
    rating: '',
    page: 1,
    limit: 20,
  };
  
  const appliedFilters = { ...defaultFilters, ...filters };
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Filter content based on query and filters
  let results = [...mockVideoContent];
  
  // Apply search term
  if (query) {
    const searchTerms = query.toLowerCase().split(' ');
    results = results.filter(item => {
      const matchesTitle = searchTerms.some(term => 
        item.title.toLowerCase().includes(term)
      );
      const matchesGenres = item.genres.some(genre => 
        searchTerms.some(term => genre.toLowerCase().includes(term))
      );
      return matchesTitle || matchesGenres;
    });
  }
  
  // Apply genre filter
  if (appliedFilters.genre) {
    results = results.filter(item => 
      item.genres.some(genre => genre === appliedFilters.genre)
    );
  }
  
  // Apply year filter
  if (appliedFilters.year) {
    if (appliedFilters.year.includes('-')) {
      // Range like "2010-2019"
      const [startYear, endYear] = appliedFilters.year.split('-').map(Number);
      results = results.filter(item => 
        item.releaseYear >= startYear && item.releaseYear <= endYear
      );
    } else if (appliedFilters.year === "Before 2000") {
      results = results.filter(item => item.releaseYear < 2000);
    } else {
      // Single year
      results = results.filter(item => 
        item.releaseYear === parseInt(appliedFilters.year)
      );
    }
  }
  
  // Apply rating filter
  if (appliedFilters.rating) {
    results = results.filter(item => 
      item.maturityRating === appliedFilters.rating
    );
  }
  
  // Apply pagination
  const startIndex = (appliedFilters.page - 1) * appliedFilters.limit;
  const endIndex = startIndex + appliedFilters.limit;
  
  return results.slice(startIndex, endIndex);
}

// Function to get video details by ID
export async function getVideoById(id: string): Promise<VideoContent | null> {
  // In a real app, this would call an API
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const video = mockVideoContent.find(item => item.id === id);
  return video || null;
}

// Function to get related videos for a particular video
export async function getRelatedVideos(id: string): Promise<VideoContent[]> {
  // In a real app, this would call an API
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Find the source video
  const sourceVideo = mockVideoContent.find(item => item.id === id);
  if (!sourceVideo) return [];
  
  // Get videos with at least one matching genre
  const relatedVideos = mockVideoContent
    .filter(item => 
      item.id !== id && // Not the same video
      item.genres.some(genre => sourceVideo.genres.includes(genre)) // Has at least one matching genre
    )
    .sort(() => Math.random() - 0.5) // Shuffle
    .slice(0, 6); // Limit to 6 items
    
  return relatedVideos;
}