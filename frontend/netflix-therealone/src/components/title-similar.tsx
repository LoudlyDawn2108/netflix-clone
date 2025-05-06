import { VideoContent } from "../lib/types";
import { Link } from "react-router-dom";

interface TitleSimilarProps {
    similar: VideoContent[];
}

export default function TitleSimilar({ similar }: TitleSimilarProps) {
    if (!similar || similar.length === 0) {
        return null;
    }

    return (
        <div>
            <h2 className="text-2xl font-medium mb-4">More Like This</h2>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {similar.map((item) => (
                    <Link
                        key={item.id}
                        to={`/title/${item.id}`}
                        className="block group rounded-md overflow-hidden bg-gray-900 hover:scale-105 transition-transform duration-300"
                    >
                        <div className="aspect-video relative">
                            <img
                                src={item.thumbnailPath || "/placeholder.svg"}
                                alt={item.title}
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                                    <svg
                                        className="w-7 h-7"
                                        fill="white"
                                        viewBox="0 0 24 24"
                                    >
                                        <path d="M8 5v14l11-7z" />
                                    </svg>
                                </div>
                            </div>
                            {item.matchPercentage && (
                                <div className="absolute bottom-2 left-2 text-xs font-medium text-green-500">
                                    {item.matchPercentage}% Match
                                </div>
                            )}
                        </div>

                        <div className="p-3">
                            <h3 className="font-medium text-sm line-clamp-1">
                                {item.title}
                            </h3>
                            <div className="flex flex-wrap items-center gap-x-2 text-xs text-gray-400 mt-1">
                                <span>{item.releaseYear}</span>
                                <span className="border border-gray-700 px-1 text-xs">
                                    {item.maturityRating}
                                </span>
                                <span>{item.duration}</span>
                            </div>
                            <p className="text-gray-400 text-xs line-clamp-2 mt-2">
                                {item.overview}
                            </p>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
