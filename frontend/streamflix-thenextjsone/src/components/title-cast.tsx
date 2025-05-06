"use client"

import { useState, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { CastMember } from "@/lib/types"

interface TitleCastProps {
  cast: CastMember[]
}

export default function TitleCast({ cast }: TitleCastProps) {
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

  if (!cast || cast.length === 0) {
    return null
  }

  return (
    <div className="relative group" onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)}>
      <h2 className="text-2xl font-semibold mb-4">Cast & Crew</h2>

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

      {/* Cast Row */}
      <div
        ref={rowRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 -mx-4 px-4"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {cast.map((person) => (
          <Link
            key={person.id}
            href={`/person/${person.id}`}
            className="flex-shrink-0 w-[140px] transition-transform hover:scale-105"
          >
            <div className="relative aspect-square rounded-md overflow-hidden mb-2">
              <Image
                src={person.profilePath || "/placeholder.svg?height=200&width=200"}
                alt={person.name}
                fill
                className="object-cover"
              />
            </div>
            <div>
              <h3 className="font-medium text-sm truncate">{person.name}</h3>
              <p className="text-gray-400 text-xs truncate">{person.character}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
