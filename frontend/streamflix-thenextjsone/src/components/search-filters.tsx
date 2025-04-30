"use client"

import { useState } from "react"
import { Check, ChevronDown, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"

interface SearchFiltersProps {
  activeFilters: {
    genre: string
    year: string
    rating: string
  }
  onFilterChange: (filterType: string, value: string) => void
}

// Mock filter options
const GENRE_OPTIONS = [
  "All Genres",
  "Action",
  "Adventure",
  "Animation",
  "Comedy",
  "Crime",
  "Documentary",
  "Drama",
  "Fantasy",
  "Horror",
  "Mystery",
  "Romance",
  "Sci-Fi",
  "Thriller",
]

const YEAR_OPTIONS = [
  "All Years",
  "2023",
  "2022",
  "2021",
  "2020",
  "2019",
  "2018",
  "2017",
  "2016",
  "2015",
  "2010-2014",
  "2000-2009",
  "1990-1999",
  "Before 1990",
]

const RATING_OPTIONS = ["All Ratings", "TV-MA", "TV-14", "TV-PG", "TV-G", "R", "PG-13", "PG", "G"]

export default function SearchFilters({ activeFilters, onFilterChange }: SearchFiltersProps) {
  const [selectedGenre, setSelectedGenre] = useState(activeFilters.genre || "All Genres")
  const [selectedYear, setSelectedYear] = useState(activeFilters.year || "All Years")
  const [selectedRating, setSelectedRating] = useState(activeFilters.rating || "All Ratings")

  const handleGenreChange = (genre: string) => {
    setSelectedGenre(genre)
    onFilterChange("genre", genre === "All Genres" ? "" : genre)
  }

  const handleYearChange = (year: string) => {
    setSelectedYear(year)
    onFilterChange("year", year === "All Years" ? "" : year)
  }

  const handleRatingChange = (rating: string) => {
    setSelectedRating(rating)
    onFilterChange("rating", rating === "All Ratings" ? "" : rating)
  }

  const clearFilters = () => {
    setSelectedGenre("All Genres")
    setSelectedYear("All Years")
    setSelectedRating("All Ratings")
    onFilterChange("genre", "")
    onFilterChange("year", "")
    onFilterChange("rating", "")
  }

  const hasActiveFilters =
    selectedGenre !== "All Genres" || selectedYear !== "All Years" || selectedRating !== "All Ratings"

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="text-gray-400 mr-2">Filter by:</div>

      {/* Genre Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="bg-zinc-900 border-zinc-700">
            <span className="mr-1">Genre:</span>
            <span className={selectedGenre !== "All Genres" ? "text-white font-medium" : "text-gray-400"}>
              {selectedGenre}
            </span>
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-zinc-900 border-zinc-700">
          {GENRE_OPTIONS.map((genre) => (
            <DropdownMenuItem
              key={genre}
              className="flex items-center justify-between cursor-pointer"
              onClick={() => handleGenreChange(genre)}
            >
              {genre}
              {selectedGenre === genre && <Check className="ml-2 h-4 w-4" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Year Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="bg-zinc-900 border-zinc-700">
            <span className="mr-1">Year:</span>
            <span className={selectedYear !== "All Years" ? "text-white font-medium" : "text-gray-400"}>
              {selectedYear}
            </span>
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-zinc-900 border-zinc-700">
          {YEAR_OPTIONS.map((year) => (
            <DropdownMenuItem
              key={year}
              className="flex items-center justify-between cursor-pointer"
              onClick={() => handleYearChange(year)}
            >
              {year}
              {selectedYear === year && <Check className="ml-2 h-4 w-4" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Rating Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="bg-zinc-900 border-zinc-700">
            <span className="mr-1">Rating:</span>
            <span className={selectedRating !== "All Ratings" ? "text-white font-medium" : "text-gray-400"}>
              {selectedRating}
            </span>
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-zinc-900 border-zinc-700">
          {RATING_OPTIONS.map((rating) => (
            <DropdownMenuItem
              key={rating}
              className="flex items-center justify-between cursor-pointer"
              onClick={() => handleRatingChange(rating)}
            >
              {rating}
              {selectedRating === rating && <Check className="ml-2 h-4 w-4" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Active Filters */}
      <div className="flex flex-wrap gap-2 ml-2">
        {selectedGenre !== "All Genres" && (
          <Badge
            variant="outline"
            className="bg-red-900/30 text-red-400 border-red-800 hover:bg-red-900/50"
            onClick={() => handleGenreChange("All Genres")}
          >
            {selectedGenre} <X className="ml-1 h-3 w-3" />
          </Badge>
        )}

        {selectedYear !== "All Years" && (
          <Badge
            variant="outline"
            className="bg-red-900/30 text-red-400 border-red-800 hover:bg-red-900/50"
            onClick={() => handleYearChange("All Years")}
          >
            {selectedYear} <X className="ml-1 h-3 w-3" />
          </Badge>
        )}

        {selectedRating !== "All Ratings" && (
          <Badge
            variant="outline"
            className="bg-red-900/30 text-red-400 border-red-800 hover:bg-red-900/50"
            onClick={() => handleRatingChange("All Ratings")}
          >
            {selectedRating} <X className="ml-1 h-3 w-3" />
          </Badge>
        )}
      </div>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white" onClick={clearFilters}>
          Clear all
        </Button>
      )}
    </div>
  )
}
