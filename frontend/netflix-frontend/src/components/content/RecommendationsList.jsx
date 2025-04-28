import { useState, useEffect } from "react";
import { fetchRecommendations } from "../../services/recommendations";
import VideoCard from "./VideoCard";
import Carousel from "../ui/Carousel";

export default function RecommendationsList({
    source = "personalized",
    limit = 6,
    autoSlide = false,
    userId = "me",
    className = "",
}) {
    const [recommendations, setRecommendations] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function loadRecommendations() {
            setLoading(true);
            setError(null);

            try {
                const data = await fetchRecommendations({
                    userId,
                    limit,
                    source,
                });

                setRecommendations(data);
            } catch (err) {
                console.error("Failed to load recommendations:", err);
                setError(err.message || "Failed to load recommendations");
            } finally {
                setLoading(false);
            }
        }

        loadRecommendations();
    }, [userId, limit, source]);

    // Loading state
    if (loading) {
        return (
            <div className={`py-4 ${className}`}>
                <div className="h-7 bg-gray-700 rounded w-64 animate-pulse mb-6"></div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                    {[...Array(Math.min(limit, 6))].map((_, index) => (
                        <div
                            key={index}
                            className="aspect-[2/3] bg-gray-800 rounded-md animate-pulse"
                        />
                    ))}
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className={`py-4 ${className}`}>
                <div className="bg-gray-800 p-4 rounded-md text-gray-400 text-sm">
                    Unable to load recommendations. Please try again later.
                </div>
            </div>
        );
    }

    // Empty state - no recommendations available
    if (
        !recommendations ||
        !recommendations.items ||
        recommendations.items.length === 0
    ) {
        return null; // Return nothing if no recommendations
    }

    return (
        <section className={`py-4 ${className}`}>
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold">
                        {recommendations.title}
                    </h2>
                    {recommendations.description && (
                        <p className="text-sm text-gray-400">
                            {recommendations.description}
                        </p>
                    )}
                </div>
            </div>

            {/* Display recommendations in a carousel */}
            <Carousel
                items={recommendations.items}
                renderItem={(item) => (
                    <div className="flex flex-col">
                        <VideoCard video={item.video} />

                        {/* Show reason if available */}
                        {item.reason && (
                            <div className="mt-1">
                                <span className="text-xs text-gray-400">
                                    {item.reason}
                                </span>
                            </div>
                        )}
                    </div>
                )}
                autoSlide={autoSlide}
                interval={6000}
                itemsPerSlide={{ sm: 2, md: 3, lg: 4, xl: 6 }}
                showIndicators={recommendations.items.length > 6}
            />
        </section>
    );
}
