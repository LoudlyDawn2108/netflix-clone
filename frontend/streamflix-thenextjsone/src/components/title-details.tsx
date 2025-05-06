import type { ContentDetails } from "@/lib/types"

interface TitleDetailsProps {
  content: ContentDetails
}

export default function TitleDetails({ content }: TitleDetailsProps) {
  return (
    <div className="bg-zinc-900/50 rounded-lg p-6">
      <h3 className="text-lg font-medium mb-4">Details</h3>

      <dl className="space-y-3">
        {content.type === "series" && (
          <>
            <div className="grid grid-cols-2">
              <dt className="text-gray-400">Seasons</dt>
              <dd>{content.seasons?.length || 0}</dd>
            </div>
            <div className="grid grid-cols-2">
              <dt className="text-gray-400">Episodes</dt>
              <dd>{content.totalEpisodes || 0}</dd>
            </div>
          </>
        )}

        <div className="grid grid-cols-2">
          <dt className="text-gray-400">Release Date</dt>
          <dd>{content.releaseDate}</dd>
        </div>

        <div className="grid grid-cols-2">
          <dt className="text-gray-400">Genres</dt>
          <dd>{content.genres.join(", ")}</dd>
        </div>

        <div className="grid grid-cols-2">
          <dt className="text-gray-400">Audio</dt>
          <dd>{content.audioLanguages.join(", ")}</dd>
        </div>

        <div className="grid grid-cols-2">
          <dt className="text-gray-400">Subtitles</dt>
          <dd>{content.subtitleLanguages.join(", ")}</dd>
        </div>

        {content.awards && content.awards.length > 0 && (
          <div className="grid grid-cols-2">
            <dt className="text-gray-400">Awards</dt>
            <dd>{content.awards.join(", ")}</dd>
          </div>
        )}

        <div className="grid grid-cols-2">
          <dt className="text-gray-400">Video Quality</dt>
          <dd>{content.videoQuality}</dd>
        </div>

        {content.studio && (
          <div className="grid grid-cols-2">
            <dt className="text-gray-400">Studio</dt>
            <dd>{content.studio}</dd>
          </div>
        )}
      </dl>
    </div>
  )
}
