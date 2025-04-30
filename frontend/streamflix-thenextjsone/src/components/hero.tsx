"use client"

import { useState } from "react"
import Image from "next/image"
import { Play, Info, Plus, VolumeX, Volume2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { FeaturedContent } from "@/lib/types"

interface HeroProps {
  featured: FeaturedContent
}

export default function Hero({ featured }: HeroProps) {
  const [muted, setMuted] = useState(true)

  return (
    <div className="relative w-full h-[56.25vw] max-h-[80vh] min-h-[500px] overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src={featured.backdropPath || "/placeholder.svg"}
          alt={featured.title}
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent" />
      </div>

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-center px-4 md:px-16 pt-20">
        <div className="max-w-2xl">
          {featured.logoPath ? (
            <Image
              src={featured.logoPath || "/placeholder.svg"}
              alt={featured.title}
              width={400}
              height={200}
              className="w-full max-w-md mb-6"
            />
          ) : (
            <h1 className="text-4xl md:text-6xl font-bold mb-6">{featured.title}</h1>
          )}

          <div className="flex items-center gap-2 mb-4">
            <span className="text-green-500 font-semibold">{featured.matchPercentage}% Match</span>
            <span className="text-gray-400">{featured.releaseYear}</span>
            <span className="border border-gray-600 px-1 text-xs">{featured.maturityRating}</span>
            <span className="text-gray-400">{featured.duration}</span>
          </div>

          <p className="text-lg text-gray-200 mb-6 line-clamp-3 md:line-clamp-4">{featured.overview}</p>

          <div className="flex flex-wrap gap-3">
            <Button size="lg" className="bg-white text-black hover:bg-white/90">
              <Play className="mr-2 h-5 w-5" /> Play
            </Button>
            <Button size="lg" variant="secondary" className="bg-gray-600/80 hover:bg-gray-600">
              <Info className="mr-2 h-5 w-5" /> More Info
            </Button>
            <Button size="icon" variant="outline" className="ml-auto border-gray-600 bg-black/30">
              <Plus className="h-5 w-5" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="border-gray-600 bg-black/30"
              onClick={() => setMuted(!muted)}
            >
              {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
