"use client"

import { useState, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { ChevronLeft, ChevronRight, Play, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { VideoContent } from "@/lib/types"

interface TitleSimilarProps {
  similar: VideoContent[]
}

export default function TitleSimilar({ similar }: TitleSimilarProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [isHovering, setIsHovering] = useState(false)
  const rowRef = useRef<HTMLDivElement>(null)
  const [scrollPosition, setScrollPosition] = useState(0)

  const handleScroll = (direction: "left" | "right") => {
    if (!rowRef.current) return

    const { scrollWidth, clientWidth } = rowRef.current
    const scrollAmount = clientWidth * 0.9
    const maxScroll = scrollWidth - clientWidth

    const newPosition =
      direction === "left"
        ? Math.max(0, scrollPosition - scrollAmount)
        : Math.min(maxScroll, scrollPosition + scrollAmount)

    rowRef.current.scrollTo({ left: newPosition, behavior: "smooth" })
    setScrollPosition(newPosition)
  }

  if (!similar || similar.length === 0) {
    return null
  }

  return (
    <div
      className="relative group"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => {
        setIsHovering(false)
        setHoveredIndex(null)
      }}
    >
      <h2 className="text-2xl font-semibold mb-4">More Like This</h2>

      {/* Navigation Arrows */}
      <button
        className={cn(
          "absolute left-0 top-1/2 z-10 -translate-y-1/2 bg-black/50 p-1 rounded-full opacity-0 transition-opacity",
          isHovering && scrollPosition > 0 && "opacity-100",
        )}
        onClick={() => handleScroll("left")}
        aria-label="Scroll left"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>

      <button
        className={cn(
          "absolute right-0 top-1/2 z-10 -translate-y-1/2 bg-black/50 p-1 rounded-full opacity-0 transition-opacity",
          isHovering && "opacity-100",
        )}
        onClick={() => handleScroll("right")}
        aria-label="Scroll right"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      {/* Similar Content Row */}
      <div
        ref={rowRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 -mx-4 px-4"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {similar.map((item, index) => (
          <div
            key={item.id}
            className="flex-shrink-0 w-[240px] relative transition-transform duration-200"
            style={{ transform: hoveredIndex === index ? "scale(1.05)" : "scale(1)" }}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <Link href={`/title/${item.id}`}>
              <div className="relative aspect-video rounded-md overflow-hidden mb-2">
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

            <div>
              <div className="flex items-center justify-between">
                <span className="text-green-500 text-sm">{item.matchPercentage}% Match</span>
                <div className="flex items-center text-xs text-gray-400">
                  <span className="border border-gray-600 px-1 mr-1">{item.maturityRating}</span>
                  <span>{item.duration}</span>
                </div>
              </div>
              <h3 className="font-medium truncate mt-1">{item.title}</h3>
              <p className="text-xs text-gray-400 line-clamp-2 mt-1">{item.overview}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
