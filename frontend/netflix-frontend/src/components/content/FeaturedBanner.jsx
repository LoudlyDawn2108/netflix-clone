import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ResponsiveText from "../ui/ResponsiveText";
import ResponsiveContainer from "../ui/ResponsiveContainer";
import { getFeaturedVideos } from "../../services/videos";

export default function FeaturedBanner() {
    const [featured, setFeatured] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        async function loadFeatured() {
            setLoading(true);
            try {
                const data = await getFeaturedVideos(1);
                if (data.items?.length > 0) {
                    setFeatured(data.items[0]);
                }
            } catch (err) {
                console.error("Failed to load featured content:", err);
                setError(err.message || "Failed to load featured content");
            } finally {
                setLoading(false);
            }
        }

        loadFeatured();
    }, []);

    // Loading state with more responsive skeleton
    if (loading) {
        return (
            <div className="w-full h-[30vh] sm:h-[40vh] md:h-[50vh] lg:h-[60vh] bg-gradient-to-b from-gray-900 to-gray-800 animate-pulse rounded-lg relative overflow-hidden">
                <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-12">
                    <div className="w-3/4 h-8 md:h-12 bg-gray-700 rounded mb-4 animate-pulse"></div>
                    <div className="w-1/2 h-4 bg-gray-700 rounded mb-6 animate-pulse"></div>
                    <div className="w-full h-16 md:h-24 bg-gray-700 rounded mb-6 animate-pulse"></div>
                    <div className="flex gap-4">
                        <div className="w-28 h-10 bg-gray-700 rounded animate-pulse"></div>
                        <div className="w-28 h-10 bg-gray-700 rounded animate-pulse"></div>
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="w-full bg-red-900/30 border border-red-500 text-red-200 p-8 rounded-lg">
                <ResponsiveContainer>
                    <p className="text-center">
                        Error loading featured content: {error}
                    </p>
                </ResponsiveContainer>
            </div>
        );
    }

    // Empty state
    if (!featured) {
        return (
            <div className="w-full bg-gray-800 p-8 rounded-lg">
                <ResponsiveContainer>
                    <p className="text-center text-gray-400">
                        No featured content available.
                    </p>
                </ResponsiveContainer>
            </div>
        );
    }

    const {
        id,
        title,
        backdropUrl,
        description,
        releaseYear,
        duration,
        genre = [],
        rating = {},
        logo = null,
    } = featured;

    return (
        <div className="relative w-full overflow-hidden">
            {/* Backdrop image */}
            <div className="h-[50vh] sm:h-[60vh] md:h-[70vh] lg:h-[80vh] w-full">
                <img
                    src={
                        backdropUrl ||
                        "https://via.placeholder.com/1920x1080?text=Featured+Content"
                    }
                    alt={title}
                    className="w-full h-full object-cover object-center"
                    loading="eager"
                />

                {/* Gradient overlays for better text legibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-netflix-black via-transparent to-netflix-black/30"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-netflix-black/90 via-netflix-black/50 to-transparent"></div>
            </div>

            {/* Content */}
            <div className="absolute inset-0 flex flex-col justify-end">
                <ResponsiveContainer className="flex-1 flex flex-col justify-end pb-16 md:pb-20">
                    {/* Logo (if available) or Title */}
                    {logo ? (
                        <img
                            src={logo}
                            alt={title}
                            className="w-1/2 sm:w-2/5 md:w-1/3 lg:w-1/4 h-auto mb-4 md:mb-6"
                        />
                    ) : (
                        <ResponsiveText
                            as="h1"
                            variant="h1"
                            className="font-bold mb-2 md:mb-4 drop-shadow-md"
                        >
                            {title}
                        </ResponsiveText>
                    )}

                    {/* Metadata row */}
                    <div className="flex flex-wrap items-center gap-2 md:gap-4 text-sm md:text-base text-gray-200 mb-3 md:mb-5">
                        {rating?.average && (
                            <span className="flex items-center text-green-400 font-medium mr-2">
                                <svg
                                    className="w-4 h-4 mr-1"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                    aria-hidden="true"
                                >
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                {rating.average.toFixed(1)}
                            </span>
                        )}

                        {releaseYear && (
                            <span className="text-gray-300 mx-2">
                                {releaseYear}
                            </span>
                        )}

                        {duration && (
                            <span className="text-gray-300 mx-2">
                                {Math.floor(duration / 60)}m
                            </span>
                        )}

                        {/* HD/4K quality badge */}
                        {featured.quality && (
                            <span className="border border-gray-500 text-gray-300 text-xs px-2 py-0.5 rounded mx-2">
                                {featured.quality}
                            </span>
                        )}
                    </div>

                    {/* Genre tags */}
                    {genre && genre.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                            {genre.slice(0, 3).map((g) => (
                                <span
                                    key={g}
                                    className="text-xs md:text-sm bg-gray-800/60 px-2 py-0.5 rounded text-gray-300"
                                >
                                    {g}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Description - responsive line clamping */}
                    <p className="text-sm sm:text-base md:text-lg mb-6 max-w-xl md:max-w-2xl lg:max-w-3xl text-gray-200 line-clamp-2 sm:line-clamp-3 md:line-clamp-4">
                        {description}
                    </p>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-3 md:gap-4">
                        <button
                            onClick={() => navigate(`/videos/${id}/watch`)}
                            className="bg-netflix-red hover:bg-red-700 text-white px-5 sm:px-6 py-2 sm:py-3 rounded-md flex items-center font-medium transition-colors"
                        >
                            <svg
                                className="w-5 h-5 mr-2"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                                aria-hidden="true"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                                    clipRule="evenodd"
                                />
                            </svg>
                            Play
                        </button>

                        <button
                            onClick={() => navigate(`/videos/${id}`)}
                            className="bg-gray-600/80 hover:bg-gray-700 text-white px-5 sm:px-6 py-2 sm:py-3 rounded-md flex items-center transition-colors"
                        >
                            <svg
                                className="w-5 h-5 mr-2"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                            More Info
                        </button>

                        {/* Add to watchlist button - visible on larger screens */}
                        <button
                            className="hidden md:flex bg-transparent border border-gray-400 hover:border-white text-white px-2 py-2 rounded-full items-center transition-colors"
                            aria-label="Add to My List"
                            onClick={(e) => {
                                e.stopPropagation();
                                // Add to watchlist functionality
                            }}
                        >
                            <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 4v16m8-8H4"
                                />
                            </svg>
                        </button>
                    </div>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
