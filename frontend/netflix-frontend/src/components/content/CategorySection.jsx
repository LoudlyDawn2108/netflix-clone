import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Carousel from "../ui/Carousel";
import VideoCard from "./VideoCard";
import ResponsiveText from "../ui/ResponsiveText";
import { getVideosByCategory } from "../../services/videos";

export default function CategorySection({
    category,
    limit = 20,
    autoSlide = false,
    showMoreLink = true,
    sectionTheme = "default", // Options: 'default', 'contrast', 'featured'
    cardSize = "medium", // Options: 'small', 'medium', 'large'
    className = "",
}) {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Get theme-based classes
    const getThemeClasses = () => {
        switch (sectionTheme) {
            case "contrast":
                return "py-6 bg-netflix-dark-gray rounded-lg px-4";
            case "featured":
                return "py-6 bg-gradient-to-r from-netflix-dark-gray to-netflix-black rounded-lg px-4";
            default:
                return "py-4";
        }
    };

    useEffect(() => {
        async function loadVideos() {
            if (!category?.id) return;

            setLoading(true);
            try {
                const data = await getVideosByCategory(category.id, { limit });
                setVideos(data.items || []);
            } catch (err) {
                console.error(
                    "Failed to load videos for category:",
                    category.id,
                    err
                );
                setError(err.message || "Failed to load videos");
            } finally {
                setLoading(false);
            }
        }

        loadVideos();
    }, [category, limit]);

    // Loading state - show skeleton loaders with responsive grid
    if (loading) {
        return (
            <section className={`${getThemeClasses()} mb-8 ${className}`}>
                <div className="flex justify-between items-center mb-4">
                    <div className="h-7 bg-gray-700 rounded w-48 animate-pulse"></div>
                    {showMoreLink && (
                        <div className="h-5 bg-gray-700 rounded w-20 animate-pulse"></div>
                    )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                    {[...Array(6)].map((_, index) => (
                        <div
                            key={index}
                            className="aspect-[2/3] bg-gray-800 rounded-md animate-pulse"
                        />
                    ))}
                </div>
            </section>
        );
    }

    // Error state
    if (error) {
        return (
            <section className={`${getThemeClasses()} mb-8 ${className}`}>
                <ResponsiveText as="h2" variant="h3" className="mb-4">
                    {category?.name || "Category"}
                </ResponsiveText>
                <div className="bg-red-900/30 border border-red-500 text-red-200 p-4 rounded-md">
                    <p>Error loading videos: {error}</p>
                </div>
            </section>
        );
    }

    // Empty state
    if (!videos.length) {
        return (
            <section className={`${getThemeClasses()} mb-8 ${className}`}>
                <ResponsiveText as="h2" variant="h3" className="mb-4">
                    {category?.name || "Category"}
                </ResponsiveText>
                <div className="bg-gray-800 p-8 rounded-md text-center">
                    <p className="text-gray-400">
                        No videos available in this category.
                    </p>
                </div>
            </section>
        );
    }

    // Determine items per slide based on card size and screen size
    const getItemsPerSlide = () => {
        switch (cardSize) {
            case "small":
                return { xs: 3, sm: 4, md: 5, lg: 6, xl: 8 };
            case "large":
                return { xs: 1, sm: 2, md: 3, lg: 4, xl: 5 };
            default: // medium
                return { xs: 2, sm: 3, md: 4, lg: 5, xl: 6 };
        }
    };

    // Render category section with videos
    return (
        <section
            className={`${getThemeClasses()} mb-8 ${className}`}
            data-testid={`category-${category?.id}`}
        >
            <div className="flex justify-between items-center mb-4 px-1">
                <ResponsiveText
                    as="h2"
                    variant={sectionTheme === "featured" ? "h2" : "h3"}
                    className="font-bold"
                >
                    {category?.name || "Category"}
                </ResponsiveText>

                {showMoreLink && category?.id && (
                    <Link
                        to={`/browse/${category.id}`}
                        className="text-sm text-gray-300 hover:text-white flex items-center transition-colors group"
                    >
                        <span>See all</span>
                        <svg
                            className="w-4 h-4 ml-1 transform transition-transform group-hover:translate-x-1"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            aria-hidden="true"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                            />
                        </svg>
                    </Link>
                )}
            </div>

            <Carousel
                items={videos}
                renderItem={(video) => (
                    <VideoCard
                        video={video}
                        size={cardSize}
                        isFeatured={
                            sectionTheme === "featured" && cardSize === "large"
                        }
                    />
                )}
                autoSlide={autoSlide}
                interval={6000}
                itemsPerSlide={getItemsPerSlide()}
                showIndicators={videos.length > getItemsPerSlide().md}
                className="px-1" // Add slight padding for better visual appearance
            />
        </section>
    );
}
