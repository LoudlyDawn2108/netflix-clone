"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Play, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { VideoContent } from "@/lib/types"

interface SearchResultsProps {
  results: VideoContent[]
  loading: boolean
  totalResults: number
  currentPage: number
  itemsPerPage: number
  onPageChange: (page: number) => void
}

export default function SearchResults({
  results,
  loading,
  totalResults,
  currentPage,
  itemsPerPage,
  onPageChange,
}: SearchResultsProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const totalPages = Math.ceil(totalResults / itemsPerPage)

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, index) => (
          <div key={index} className="animate-pulse">
            <div className="bg-zinc-800 aspect-video rounded-md mb-2"></div>
            <div className="h-4 bg-zinc-800 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-zinc-800 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-xl text-gray-400 mb-2">No results found</p>
        <p className="text-gray-500">Try adjusting your search or filters</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 text-gray-400">
        Showing {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, totalResults)} of{" "}
        {totalResults} results
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-8">
        {results.map((item, index) => (
          <div
            key={item.id}
            className="relative group"
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <Link href={`/watch/${item.id}`}>
              <div className="relative aspect-video rounded-md overflow-hidden transition-transform duration-300 group-hover:scale-105">
                <Image src={item.thumbnailPath || "/placeholder.svg"} alt={item.title} fill className="object-cover" />

                {hoveredIndex === index && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" className="rounded-full bg-white text-black hover:bg-white/90 mr-2">
                      <Play className="h-5 w-5 fill-current" />
                    </Button>
                    <Button size="icon" variant="secondary" className="rounded-full">
                      <Info className="h-5 w-5" />
                    </Button>
                  </div>
                )}
              </div>
            </Link>

            <div className="mt-2">
              <h3 className="font-medium truncate">{item.title}</h3>
              <div className="flex items-center text-sm text-gray-400">
                <span className="text-green-500 mr-2">{item.matchPercentage}% Match</span>
                <span>{item.releaseYear}</span>
                <span className="mx-1">•</span>
                <span>{item.maturityRating}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">{item.genres.slice(0, 3).join(" • ")}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <Button
            variant="outline"
            size="icon"
            className="bg-zinc-900 border-zinc-700"
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {Array.from({ length: Math.min(5, totalPages) }).map((_, index) => {
            let pageNumber: number

            if (totalPages <= 5) {
              pageNumber = index + 1
            } else if (currentPage <= 3) {
              pageNumber = index + 1
            } else if (currentPage >= totalPages - 2) {
              pageNumber = totalPages - 4 + index
            } else {
              pageNumber = currentPage - 2 + index
            }

            return (
              <Button
                key={pageNumber}
                variant={currentPage === pageNumber ? "default" : "outline"}
                className={
                  currentPage === pageNumber ? "bg-red-600 hover:bg-red-700 border-none" : "bg-zinc-900 border-zinc-700"
                }
                onClick={() => onPageChange(pageNumber)}
              >
                {pageNumber}
              </Button>
            )
          })}

          <Button
            variant="outline"
            size="icon"
            className="bg-zinc-900 border-zinc-700"
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(currentPage + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
