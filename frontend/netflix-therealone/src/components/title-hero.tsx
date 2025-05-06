import { useState } from "react";
import { ContentDetails } from "../lib/types";

interface TitleHeroProps {
    content: ContentDetails;
}

export default function TitleHero({ content }: TitleHeroProps) {
    const [muted, setMuted] = useState(true);

    return (
        <div className="relative w-full h-[65vw] max-h-[90vh] min-h-[600px] overflow-hidden">
            {/* Background Image */}
            <div className="absolute inset-0">
                <img
                    src={content.backdropPath || "/placeholder.svg"}
                    alt={content.title}
                    className="object-cover w-full h-full"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent" />
            </div>

            {/* Content */}
            <div className="absolute inset-0 flex flex-col justify-center px-4 md:px-16 pt-20 pb-32">
                <div className="max-w-2xl">
                    {content.logoPath ? (
                        <img
                            src={content.logoPath || "/placeholder.svg"}
                            alt={content.title}
                            className="w-full max-w-md mb-6"
                        />
                    ) : (
                        <h1 className="text-4xl md:text-6xl font-bold mb-6">
                            {content.title}
                        </h1>
                    )}

                    <div className="flex flex-wrap items-center gap-2 mb-4">
                        <span className="text-green-500 font-semibold">
                            {content.matchPercentage}% Match
                        </span>
                        <span className="text-gray-400">
                            {content.releaseYear}
                        </span>
                        <span className="border border-gray-600 px-1 text-xs">
                            {content.maturityRating}
                        </span>
                        <span className="text-gray-400">
                            {content.duration}
                        </span>
                        {content.type === "series" && (
                            <span className="text-gray-400">
                                {content.seasons?.length} Seasons
                            </span>
                        )}
                        <span className="text-gray-400">
                            {content.videoQuality}
                        </span>
                    </div>

                    <p className="text-lg text-gray-200 mb-6 line-clamp-3 md:line-clamp-none">
                        {content.overview}
                    </p>

                    <div className="flex flex-wrap gap-3">
                        <button className="bg-white text-black hover:bg-white/90 py-2 px-6 rounded-md flex items-center font-medium">
                            <svg
                                className="w-5 h-5 mr-2"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M5 5.5C5 4.11929 6.11929 3 7.5 3H16.5C17.8807 3 19 4.11929 19 5.5V18.5C19 19.8807 17.8807 21 16.5 21H7.5C6.11929 21 5 19.8807 5 18.5V5.5ZM9.5 8.5C9.5 8.22386 9.72386 8 10 8H14C14.2761 8 14.5 8.22386 14.5 8.5V15.5C14.5 15.7761 14.2761 16 14 16H10C9.72386 16 9.5 15.7761 9.5 15.5V8.5Z"
                                    clipRule="evenodd"
                                />
                            </svg>
                            Play
                        </button>
                        <button className="bg-gray-600/80 hover:bg-gray-600 text-white py-2 px-6 rounded-md flex items-center font-medium">
                            <svg
                                className="w-5 h-5 mr-2"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path d="M12 4a1 1 0 0 1 1 1v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 1 1-2 0v-6H5a1 1 0 1 1 0-2h6V5a1 1 0 0 1 1-1z" />
                            </svg>
                            My List
                        </button>
                        <button className="bg-gray-600/80 hover:bg-gray-600 text-white py-2 px-6 rounded-md flex items-center font-medium">
                            <svg
                                className="w-5 h-5 mr-2"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path d="M7 11a1 1 0 0 1 1-1h8a1 1 0 1 1 0 2H8a1 1 0 0 1-1-1zm0 4a1 1 0 0 1 1-1h8a1 1 0 1 1 0 2H8a1 1 0 0 1-1-1zm1-9a1 1 0 1 0 0 2h8a1 1 0 1 0 0-2H8z" />
                            </svg>
                            Rate
                        </button>
                        <button className="ml-auto border border-gray-600 bg-black/30 text-white p-2 rounded-full">
                            <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                                />
                            </svg>
                        </button>
                        <button
                            className="border border-gray-600 bg-black/30 text-white p-2 rounded-full"
                            onClick={() => setMuted(!muted)}
                        >
                            {muted ? (
                                <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                                    />
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                                    />
                                </svg>
                            ) : (
                                <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                                    />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
