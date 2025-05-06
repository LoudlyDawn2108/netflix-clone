import { ContentDetails } from "../lib/types";

interface TitleDetailsProps {
    content: ContentDetails;
}

export default function TitleDetails({ content }: TitleDetailsProps) {
    return (
        <div className="bg-black/40 p-4 rounded-md backdrop-blur-sm border border-gray-800">
            <h3 className="text-xl font-medium mb-4">Details</h3>

            <dl className="space-y-2 text-sm">
                {content.director && (
                    <div className="grid grid-cols-3">
                        <dt className="text-gray-400">Director:</dt>
                        <dd className="col-span-2">{content.director}</dd>
                    </div>
                )}

                {content.creator && (
                    <div className="grid grid-cols-3">
                        <dt className="text-gray-400">Creator:</dt>
                        <dd className="col-span-2">{content.creator}</dd>
                    </div>
                )}

                {content.writers && content.writers.length > 0 && (
                    <div className="grid grid-cols-3">
                        <dt className="text-gray-400">Writers:</dt>
                        <dd className="col-span-2">
                            {content.writers.join(", ")}
                        </dd>
                    </div>
                )}

                {content.cast && content.cast.length > 0 && (
                    <div className="grid grid-cols-3">
                        <dt className="text-gray-400">Cast:</dt>
                        <dd className="col-span-2">
                            {content.cast
                                .slice(0, 3)
                                .map((actor) => actor.name)
                                .join(", ")}
                            {content.cast.length > 3 && "..."}
                        </dd>
                    </div>
                )}

                {content.genres && content.genres.length > 0 && (
                    <div className="grid grid-cols-3">
                        <dt className="text-gray-400">Genres:</dt>
                        <dd className="col-span-2">
                            {content.genres.join(", ")}
                        </dd>
                    </div>
                )}

                {content.studio && (
                    <div className="grid grid-cols-3">
                        <dt className="text-gray-400">Studio:</dt>
                        <dd className="col-span-2">{content.studio}</dd>
                    </div>
                )}

                {content.releaseDate && (
                    <div className="grid grid-cols-3">
                        <dt className="text-gray-400">Release Date:</dt>
                        <dd className="col-span-2">{content.releaseDate}</dd>
                    </div>
                )}

                {content.maturityRating && (
                    <div className="grid grid-cols-3">
                        <dt className="text-gray-400">Rating:</dt>
                        <dd className="col-span-2">
                            <span className="border border-gray-600 px-1 text-xs mr-2">
                                {content.maturityRating}
                            </span>
                            {content.maturityRating === "TV-MA" &&
                                "Adults only"}
                            {content.maturityRating === "TV-14" && "Ages 14+"}
                            {content.maturityRating === "PG-13" && "Ages 13+"}
                            {content.maturityRating === "R" && "Restricted"}
                        </dd>
                    </div>
                )}
            </dl>

            <div className="mt-4 pt-4 border-t border-gray-800">
                <h4 className="font-medium mb-1">Available In</h4>
                <div className="flex flex-wrap gap-2">
                    {content.audioLanguages?.map((language) => (
                        <span
                            key={language}
                            className="bg-gray-800 px-2 py-1 rounded text-xs"
                        >
                            {language}
                        </span>
                    ))}
                </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-800">
                <h4 className="font-medium mb-1">Subtitles</h4>
                <div className="flex flex-wrap gap-2">
                    {content.subtitleLanguages?.map((language) => (
                        <span
                            key={language}
                            className="bg-gray-800 px-2 py-1 rounded text-xs"
                        >
                            {language}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}
