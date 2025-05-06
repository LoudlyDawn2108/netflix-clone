"use client"

import { useState } from "react"
import Image from "next/image"
import { Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import type { ContentDetails, Episode } from "@/lib/types"

interface TitleEpisodesProps {
  series: ContentDetails
}

export default function TitleEpisodes({ series }: TitleEpisodesProps) {
  const [selectedSeason, setSelectedSeason] = useState("1")

  if (series.type !== "series" || !series.seasons) {
    return null
  }

  const currentSeason = series.seasons.find((season) => season.seasonNumber === Number.parseInt(selectedSeason, 10))

  if (!currentSeason) {
    return null
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">Episodes</h2>
        <Select value={selectedSeason} onValueChange={setSelectedSeason}>
          <SelectTrigger className="w-[180px] bg-zinc-900 border-zinc-700">
            <SelectValue placeholder="Select Season" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            {series.seasons.map((season) => (
              <SelectItem key={season.seasonNumber} value={season.seasonNumber.toString()}>
                Season {season.seasonNumber}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        <Accordion type="single" collapsible className="w-full">
          {currentSeason.episodes.map((episode) => (
            <EpisodeItem key={episode.id} episode={episode} />
          ))}
        </Accordion>
      </div>
    </div>
  )
}

function EpisodeItem({ episode }: { episode: Episode }) {
  return (
    <AccordionItem value={episode.id} className="border-zinc-800">
      <div className="grid grid-cols-[auto,1fr] gap-4">
        <div className="relative w-32 md:w-48 aspect-video rounded-md overflow-hidden">
          <Image src={episode.thumbnailPath || "/placeholder.svg"} alt={episode.title} fill className="object-cover" />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/60">
            <Button size="icon" className="rounded-full bg-white text-black hover:bg-white/90">
              <Play className="h-5 w-5 fill-current" />
            </Button>
          </div>
        </div>

        <div className="flex flex-col justify-center">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-lg font-medium">
                {episode.episodeNumber}. {episode.title}
              </span>
              {episode.isNew && <span className="ml-2 bg-red-600 text-white text-xs px-2 py-0.5 rounded">NEW</span>}
            </div>
            <span className="text-gray-400">{episode.duration}</span>
          </div>
          <AccordionTrigger className="py-0 hover:no-underline">
            <span className="text-sm text-gray-400 line-clamp-1 text-left">{episode.overview}</span>
          </AccordionTrigger>
        </div>
      </div>

      <AccordionContent className="pl-36 md:pl-52">
        <p className="text-gray-300 mb-4">{episode.overview}</p>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center">
            <span className="text-gray-400 mr-1">Director:</span>
            <span>{episode.director}</span>
          </div>
          <div className="flex items-center">
            <span className="text-gray-400 mr-1">Air date:</span>
            <span>{episode.airDate}</span>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}
