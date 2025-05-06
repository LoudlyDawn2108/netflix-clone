import { useState } from "react";
import { ContentDetails } from "../lib/types";

interface TitleEpisodesProps {
    series: ContentDetails;
}

export default function TitleEpisodes({ series }: TitleEpisodesProps) {
    const [selectedSeason, setSelectedSeason] = useState(1);

    if (!series.seasons || series.seasons.length === 0) {
        return null;
    }

    const currentSeason =
        series.seasons.find(
            (season) => season.seasonNumber === selectedSeason
        ) || series.seasons[0];

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-medium">Episodes</h2>

                <div className="relative">
                    <select
                        className="appearance-none bg-black/40 border border-gray-700 rounded-md py-2 px-4 pr-8 text-white"
                        value={selectedSeason}
                        onChange={(e) =>
                            setSelectedSeason(Number(e.target.value))
                        }
                    >
                        {series.seasons.map((season) => (
                            <option
                                key={season.seasonNumber}
                                value={season.seasonNumber}
                            >
                                Season {season.seasonNumber}
                            </option>
                        ))}
                    </select>
                    <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
                        <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                            />
                        </svg>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {currentSeason.episodes.map((episode) => (
                    <div
                        key={episode.id}
                        className="grid grid-cols-12 gap-4 p-4 rounded-md hover:bg-white/10 transition-colors"
                    >
                        <div className="col-span-1 text-center text-gray-400">
                            {episode.episodeNumber}
                        </div>

                        <div className="col-span-3 lg:col-span-2">
                            <div className="aspect-video rounded overflow-hidden bg-gray-800 relative">
                                <img
                                    src={
                                        episode.thumbnailPath ||
                                        "/placeholder.svg"
                                    }
                                    alt={episode.title}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/60 transition-opacity">
                                    <button className="bg-white text-black rounded-full p-2">
                                        <svg
                                            className="w-5 h-5"
                                            fill="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path d="M8 5v14l11-7z" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="col-span-8 lg:col-span-9 flex flex-col justify-center">
                            <div className="flex items-center justify-between">
                                <h3 className="font-medium">{episode.title}</h3>
                                <span className="text-sm text-gray-400">
                                    {episode.duration}
                                </span>
                            </div>
                            <p className="text-sm text-gray-300 line-clamp-2 mt-1">
                                {episode.overview}
                            </p>
                            {episode.isNew && (
                                <span className="bg-red-600 text-white text-xs px-2 py-1 rounded mt-2 w-fit">
                                    NEW
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
