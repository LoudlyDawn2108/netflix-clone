import { Badge } from "@/components/ui/badge"
import type { ContentDetails } from "@/lib/types"

interface TitleOverviewProps {
  content: ContentDetails
}

export default function TitleOverview({ content }: TitleOverviewProps) {
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {content.genres.map((genre) => (
          <Badge key={genre} variant="outline" className="bg-zinc-900/80 border-zinc-700">
            {genre}
          </Badge>
        ))}
      </div>

      <h2 className="text-2xl font-semibold mb-3">Overview</h2>
      <p className="text-gray-300 mb-6">{content.overview}</p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4">
        {content.director && (
          <div>
            <span className="text-gray-400 block">Director</span>
            <span>{content.director}</span>
          </div>
        )}
        {content.writers && content.writers.length > 0 && (
          <div>
            <span className="text-gray-400 block">Writer{content.writers.length > 1 ? "s" : ""}</span>
            <span>{content.writers.join(", ")}</span>
          </div>
        )}
        {content.creator && (
          <div>
            <span className="text-gray-400 block">Creator</span>
            <span>{content.creator}</span>
          </div>
        )}
      </div>
    </div>
  )
}
