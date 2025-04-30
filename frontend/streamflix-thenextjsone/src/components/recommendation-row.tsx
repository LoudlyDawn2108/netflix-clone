"use client"

import { useState, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { ChevronLeft, ChevronRight, Play, Plus, ThumbsUp, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import type { VideoContent } from "@/lib/types"

interface RecommendationRowProps {
  title: string
  subtitle?: string
  items: VideoContent[]
  type: string
}

export default function RecommendationRow({ title, subtitle, items, type }: RecommendationRowProps) {
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

  return (
    <div
      className="relative group"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => {
        setIsHovering(false)
        setHoveredIndex(null)
      }}
    >
      <div className="flex flex-col mb-2">
        <h2 className="text-xl font-medium">{title}</h2>
        {subtitle && <p className="text-sm text-gray-400">{subtitle}</p>}
      </div>

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

      {/* Content Row */}
      <div
        ref={rowRef}
        className="flex gap-2 overflow-x-auto scrollbar-hide pb-10 pt-1 -mx-4 px-4"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {items.map((item, index) => (
          <div
            key={item.id}
            className={cn(
              "flex-shrink-0 relative transition-all duration-200 rounded-md overflow-hidden",
              hoveredIndex === index ? "scale-110 z-10" : "scale-100",
              type === "because-you-watched" ? "w-[300px]" : "w-[200px]",
            )}
            style={{ width: hoveredIndex === index ? "320px" : type === "because-you-watched" ? "300px" : "200px" }}
            onMouseEnter={() => setHoveredIndex(index)}
          >
            <Link href={`/watch/${item.id}`}>
              <div className="relative aspect-video">
                <Image src={item.thumbnailPath || "/placeholder.svg"} alt={item.title} fill className="object-cover" />

                {type === "continue-watching" && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-600">
                    <div className="h-full bg-red-600" style={{ width: `${item.progress || 0}%` }} />
                  </div>
                )}
              </div>
            </Link>

            {type === "because-you-watched" && (
              <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-2">
                <div className="text-xs text-gray-300">Because you watched</div>
                <div className="font-medium truncate">{item.relatedTo}</div>
              </div>
            )}

            {hoveredIndex === index && (
              <div className="absolute bottom-0 left-0 right-0 bg-zinc-900 p-3 shadow-lg">
                <div className="flex gap-2 mb-2">
                  <button className="bg-white text-black rounded-full p-1 hover:bg-white/90">
                    <Play className="h-4 w-4" />
                  </button>
                  <button className="border border-gray-400 rounded-full p-1 hover:border-white">
                    <Plus className="h-4 w-4" />
                  </button>
                  <button className="border border-gray-400 rounded-full p-1 hover:border-white">
                    <ThumbsUp className="h-4 w-4" />
                  </button>
                  <button className="border border-gray-400 rounded-full p-1 hover:border-white ml-auto">
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-green-500 font-semibold">{item.matchPercentage}% Match</span>
                  <span className="border border-gray-600 px-1">{item.maturityRating}</span>
                  <span>{item.duration}</span>
                </div>

                <div className="flex gap-1 mt-2 text-xs">
                  {item.genres.slice(0, 3).map((genre, i) => (
                    <span key={i}>
                      {genre}
                      {i < Math.min(item.genres.length, 3) - 1 && <span className="mx-1">•</span>}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
