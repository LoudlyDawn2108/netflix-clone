"use client"

import { useState } from "react"
import Image from "next/image"
import { Play, Plus, ThumbsUp, VolumeX, Volume2, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ContentDetails } from "@/lib/types"

interface TitleHeroProps {
  content: ContentDetails
}

export default function TitleHero({ content }: TitleHeroProps) {
  const [muted, setMuted] = useState(true)

  return (
    <div className="relative w-full h-[65vw] max-h-[90vh] min-h-[600px] overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src={content.backdropPath || "/placeholder.svg"}
          alt={content.title}
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent" />
      </div>

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-center px-4 md:px-16 pt-20 pb-32">
        <div className="max-w-2xl">
          {content.logoPath ? (
            <Image
              src={content.logoPath || "/placeholder.svg"}
              alt={content.title}
              width={400}
              height={200}
              className="w-full max-w-md mb-6"
            />
          ) : (
            <h1 className="text-4xl md:text-6xl font-bold mb-6">{content.title}</h1>
          )}

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-green-500 font-semibold">{content.matchPercentage}% Match</span>
            <span className="text-gray-400">{content.releaseYear}</span>
            <span className="border border-gray-600 px-1 text-xs">{content.maturityRating}</span>
            <span className="text-gray-400">{content.duration}</span>
            {content.type === "series" && <span className="text-gray-400">{content.seasons} Seasons</span>}
            <span className="text-gray-400">{content.videoQuality}</span>
          </div>

          <p className="text-lg text-gray-200 mb-6 line-clamp-3 md:line-clamp-none">{content.overview}</p>

          <div className="flex flex-wrap gap-3">
            <Button size="lg" className="bg-white text-black hover:bg-white/90">
              <Play className="mr-2 h-5 w-5" /> Play
            </Button>
            <Button size="lg" variant="secondary" className="bg-gray-600/80 hover:bg-gray-600">
              <Plus className="mr-2 h-5 w-5" /> My List
            </Button>
            <Button size="lg" variant="secondary" className="bg-gray-600/80 hover:bg-gray-600">
              <ThumbsUp className="mr-2 h-5 w-5" /> Rate
            </Button>
            <Button size="icon" variant="outline" className="ml-auto border-gray-600 bg-black/30">
              <Share2 className="h-5 w-5" />
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
