import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ResponsiveText from "../ui/ResponsiveText";

export default function VideoCard({
    video,
    isFeatured = false,
    className = "",
    size = "medium", // Options: "small", "medium", "large"
}) {
    const [isHovered, setIsHovered] = useState(false);
    const navigate = useNavigate();

    // Disable hover effects on touch devices
    const [isTouchDevice, setIsTouchDevice] = useState(false);

    // Detect touch device on first interaction
    const handleTouchStart = () => {
        setIsTouchDevice(true);
    };

    // Ensure video has the required properties
    if (!video || !video.id) {
        return null;
    }

    const {
        id,
        title,
        thumbnailUrl,
        backdropUrl,
        releaseYear,
        rating = {},
        duration,
        genre = [],
        description,
    } = video;

    // Use backdrop for featured cards, thumbnail for regular cards
    const imageUrl = isFeatured ? backdropUrl || thumbnailUrl : thumbnailUrl;

    // Handle click to navigate to video details
    const handleClick = () => {
        navigate(`/videos/${id}`);
    };

    // Size-specific classes
    const sizeClasses = {
        small: {
            card: "w-full",
            title: "text-xs sm:text-sm",
            details: "text-xxs sm:text-xs",
            buttons: "scale-75 origin-left",
        },
        medium: {
            card: "w-full",
            title: "text-sm sm:text-base md:text-lg",
            details: "text-xs",
            buttons: "",
        },
        large: {
            card: "w-full",
            title: "text-lg sm:text-xl md:text-2xl",
            details: "text-xs sm:text-sm",
            buttons: "scale-110 origin-left",
        },
    };

    // Get correct size class or default to medium
    const sizeClass = sizeClasses[size] || sizeClasses.medium;

    return (
        <div
            className={`group relative rounded-md overflow-hidden bg-gray-900 transition-all duration-300 
            ${isHovered && !isTouchDevice ? "z-10 scale-105 shadow-netflix-hover" : "shadow-netflix"} 
            ${isFeatured ? "aspect-video" : "aspect-[2/3]"} 
            ${sizeClass.card}
            ${className}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={handleClick}
            onTouchStart={handleTouchStart}
            tabIndex="0"
            role="button"
            aria-label={`View ${title} details`}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleClick();
                }
            }}
        >
            {/* Image */}
            <img
                src={
                    imageUrl ||
                    "https://via.placeholder.com/300x450?text=No+Image"
                }
                alt={`${title} poster`}
                className={`w-full h-full object-cover transition-opacity duration-300 ${isHovered && !isTouchDevice ? "opacity-30" : "opacity-100"}`}
                loading="lazy"
            />

            {/* Hover overlay with details */}
            <div
                className={`absolute inset-0 flex flex-col justify-end p-2 sm:p-3 md:p-4 bg-gradient-to-t from-black/90 to-transparent transition-opacity duration-300
                ${isHovered || isFeatured ? "opacity-100" : "opacity-0"}
                ${isFeatured ? "opacity-100" : ""}
            `}
            >
                <ResponsiveText
                    as="h3"
                    variant={isFeatured ? "h3" : "h4"}
                    className={`font-bold text-white mb-1 line-clamp-1 ${sizeClass.title}`}
                >
                    {title}
                </ResponsiveText>

                <div
                    className={`flex items-center gap-2 mb-1 ${sizeClass.details}`}
                >
                    {releaseYear && (
                        <span className="text-gray-300">{releaseYear}</span>
                    )}
                    {duration && (
                        <span className="text-gray-300">
                            {Math.floor(duration / 60)}m
                        </span>
                    )}
                    {rating?.average && (
                        <span
                            className="flex items-center text-gray-300"
                            aria-label={`Rating ${rating.average.toFixed(1)} out of 10`}
                        >
                            <svg
                                className="w-3 h-3 text-yellow-400 mr-1"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                                aria-hidden="true"
                            >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            {rating.average.toFixed(1)}
                        </span>
                    )}
                </div>

                {/* Genre tags - hide on smallest screens */}
                {genre && genre.length > 0 && (
                    <div
                        className="hidden xs:flex flex-wrap gap-1 mb-2"
                        aria-label="Genres"
                    >
                        {genre.slice(0, 2).map((g) => (
                            <span
                                key={g}
                                className={`bg-gray-800 px-1.5 py-0.5 rounded-full text-gray-300 ${sizeClass.details}`}
                            >
                                {g}
                            </span>
                        ))}
                    </div>
                )}

                {/* Description - only show on hover on non-touch devices and medium+ screens */}
                {(isHovered || isFeatured) && description && (
                    <p
                        className={`text-gray-300 line-clamp-2 hidden sm:block ${sizeClass.details}`}
                        aria-hidden="true"
                    >
                        {description}
                    </p>
                )}

                {/* Action buttons - play and add to list */}
                <div className={`flex gap-2 mt-2 ${sizeClass.buttons}`}>
                    <button
                        className="bg-white text-black p-1 rounded-full hover:bg-gray-300 transition-colors"
                        aria-label={`Play ${title}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/videos/${id}/watch`);
                        }}
                    >
                        <svg
                            className="w-4 h-4"
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
                    </button>
                    <button
                        className="bg-gray-600 text-white p-1 rounded-full hover:bg-gray-700 transition-colors"
                        aria-label={`Add ${title} to my list`}
                        onClick={(e) => {
                            e.stopPropagation();
                            // Add to watchlist logic
                        }}
                    >
                        <svg
                            className="w-4 h-4"
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
            </div>

            {/* "New" indicator if applicable */}
            {video.isNew && (
                <div
                    className="absolute top-2 left-2 bg-netflix-red text-white text-xs px-2 py-0.5 rounded"
                    aria-label="New content"
                >
                    NEW
                </div>
            )}

            {/* "Top 10" indicator if applicable */}
            {video.topRank && (
                <div
                    className="absolute top-2 right-2 bg-netflix-red text-white text-xs px-2 py-0.5 rounded flex items-center"
                    aria-label={`Top ${video.topRank} content`}
                >
                    <svg
                        className="w-3 h-3 mr-1"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        aria-hidden="true"
                    >
                        <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-2 0a6 6 0 11-12 0 6 6 0 0112 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z"
                            clipRule="evenodd"
                        />
                    </svg>
                    {video.topRank}
                </div>
            )}
        </div>
    );
}
