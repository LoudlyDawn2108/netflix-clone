import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import type { VideoContent } from "../lib/types";
import { cn } from "../lib/utils";

interface ContentRowProps {
    title: string;
    items: VideoContent[];
    type: string;
}

export default function ContentRow({ title, items, type }: ContentRowProps) {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [isHovering, setIsHovering] = useState(false);
    const rowRef = useRef<HTMLDivElement>(null);
    const [scrollPosition, setScrollPosition] = useState(0);

    const handleScroll = (direction: "left" | "right") => {
        if (!rowRef.current) return;

        const { scrollWidth, clientWidth } = rowRef.current;
        const scrollAmount = clientWidth * 0.9;
        const maxScroll = scrollWidth - clientWidth;

        const newPosition =
            direction === "left"
                ? Math.max(0, scrollPosition - scrollAmount)
                : Math.min(maxScroll, scrollPosition + scrollAmount);

        rowRef.current.scrollTo({ left: newPosition, behavior: "smooth" });
        setScrollPosition(newPosition);
    };

    // Special rendering for continue watching items with progress bar
    const renderContinueWatchingItem = (item: VideoContent, index: number) => {
        return (
            <div
                key={item.id}
                className={cn(
                    "flex-shrink-0 relative transition-all duration-200 rounded-md overflow-hidden",
                    hoveredIndex === index ? "scale-110 z-10" : "scale-100"
                )}
                style={{ width: hoveredIndex === index ? "300px" : "200px" }}
                onMouseEnter={() => setHoveredIndex(index)}
            >
                <Link to={`/title/${item.id}`}>
                    <div className="relative aspect-video">
                        <img
                            src={item.thumbnailPath || "/placeholder.svg"}
                            alt={item.title}
                            className="object-cover w-full h-full"
                        />

                        {/* Progress bar */}
                        {item.progress !== undefined && (
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700">
                                <div
                                    className="h-full bg-red-600"
                                    style={{ width: `${item.progress}%` }}
                                />
                            </div>
                        )}
                    </div>
                </Link>

                {hoveredIndex === index && (
                    <div className="absolute bottom-0 left-0 right-0 bg-zinc-900 p-3 shadow-lg">
                        <div className="flex gap-2 mb-2">
                            <button className="bg-white text-black rounded-full p-1 hover:bg-white/90">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="h-4 w-4"
                                >
                                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                                </svg>
                            </button>
                            <button className="border border-gray-400 rounded-full p-1 hover:border-white">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="h-4 w-4"
                                >
                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                            </button>
                            <button className="border border-gray-400 rounded-full p-1 hover:border-white ml-auto">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="h-4 w-4"
                                >
                                    <polyline points="6 9 12 15 18 9"></polyline>
                                </svg>
                            </button>
                        </div>

                        <div className="flex items-center gap-2 text-xs">
                            <span className="text-green-500 font-semibold">
                                {item.matchPercentage}% Match
                            </span>
                            <span className="border border-gray-600 px-1">
                                {item.maturityRating}
                            </span>
                            <span>{item.duration}</span>
                        </div>

                        {item.progress !== undefined && (
                            <div className="mt-2 text-xs text-gray-400">
                                <span>{item.progress}% completed</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    // Default rendering for standard items
    const renderStandardItem = (item: VideoContent, index: number) => {
        return (
            <div
                key={item.id}
                className={cn(
                    "flex-shrink-0 relative transition-all duration-200 rounded-md overflow-hidden",
                    hoveredIndex === index ? "scale-110 z-10" : "scale-100"
                )}
                style={{ width: hoveredIndex === index ? "300px" : "200px" }}
                onMouseEnter={() => setHoveredIndex(index)}
            >
                <Link to={`/watch/${item.id}`}>
                    <div className="relative aspect-video">
                        <img
                            src={item.thumbnailPath || "/placeholder.svg"}
                            alt={item.title}
                            className="object-cover w-full h-full"
                        />
                    </div>
                </Link>

                {hoveredIndex === index && (
                    <div className="absolute bottom-0 left-0 right-0 bg-zinc-900 p-3 shadow-lg">
                        <div className="flex gap-2 mb-2">
                            <button className="bg-white text-black rounded-full p-1 hover:bg-white/90">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="h-4 w-4"
                                >
                                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                                </svg>
                            </button>
                            <button className="border border-gray-400 rounded-full p-1 hover:border-white">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="h-4 w-4"
                                >
                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                            </button>
                            <button className="border border-gray-400 rounded-full p-1 hover:border-white">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="h-4 w-4"
                                >
                                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                                </svg>
                            </button>
                            <button className="border border-gray-400 rounded-full p-1 hover:border-white ml-auto">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="h-4 w-4"
                                >
                                    <polyline points="6 9 12 15 18 9"></polyline>
                                </svg>
                            </button>
                        </div>

                        <div className="flex items-center gap-2 text-xs">
                            <span className="text-green-500 font-semibold">
                                {item.matchPercentage}% Match
                            </span>
                            <span className="border border-gray-600 px-1">
                                {item.maturityRating}
                            </span>
                            <span>{item.duration}</span>
                        </div>

                        <div className="flex gap-1 mt-2 text-xs">
                            {item.genres.slice(0, 3).map((genre, i) => (
                                <span key={i}>
                                    {genre}
                                    {i <
                                        Math.min(item.genres.length, 3) - 1 && (
                                        <span className="mx-1">•</span>
                                    )}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div
            className="relative group mb-8"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => {
                setIsHovering(false);
                setHoveredIndex(null);
            }}
        >
            <div className="mb-2">
                <h2 className="text-xl font-medium">{title}</h2>
            </div>

            {/* Navigation Arrows */}
            <button
                className={cn(
                    "absolute left-0 top-1/2 z-10 -translate-y-1/2 bg-black/50 p-1 rounded-full opacity-0 transition-opacity",
                    isHovering && scrollPosition > 0 && "opacity-100"
                )}
                onClick={() => handleScroll("left")}
                aria-label="Scroll left"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-6 w-6"
                >
                    <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
            </button>

            <button
                className={cn(
                    "absolute right-0 top-1/2 z-10 -translate-y-1/2 bg-black/50 p-1 rounded-full opacity-0 transition-opacity",
                    isHovering && "opacity-100"
                )}
                onClick={() => handleScroll("right")}
                aria-label="Scroll right"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-6 w-6"
                >
                    <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
            </button>

            {/* Content Row */}
            <div
                ref={rowRef}
                className="flex gap-2 overflow-x-auto scrollbar-hide pb-10 pt-1 -mx-4 px-4"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
                {items.map((item, index) =>
                    type === "continue-watching" && item.progress !== undefined
                        ? renderContinueWatchingItem(item, index)
                        : renderStandardItem(item, index)
                )}
            </div>
        </div>
    );
}
