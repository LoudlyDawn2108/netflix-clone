import { useState, useEffect } from "react";
import FeaturedBanner from "../components/content/FeaturedBanner";
import CategorySection from "../components/content/CategorySection";
import RecommendationsList from "../components/content/RecommendationsList";
import { getCategories } from "../services/videos";

export default function HomePage() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function loadCategories() {
            setLoading(true);
            try {
                const data = await getCategories();
                setCategories(data || []);
            } catch (err) {
                console.error("Failed to load categories:", err);
                setError(err.message || "Failed to load content categories");
            } finally {
                setLoading(false);
            }
        }

        loadCategories();
    }, []);

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <div className="container mx-auto px-4">
                {/* Featured banner */}
                <section className="pt-4 pb-8">
                    <FeaturedBanner />
                </section>

                {/* Loading state */}
                {loading && !categories.length && (
                    <div className="py-20 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
                        <p className="mt-4 text-gray-400">
                            Loading categories...
                        </p>
                    </div>
                )}

                {/* Error state */}
                {error && (
                    <div className="py-10 max-w-3xl mx-auto">
                        <div className="bg-red-900/30 border border-red-500 text-red-200 p-6 rounded-lg">
                            <h2 className="text-xl font-bold mb-2">Error</h2>
                            <p>{error}</p>
                            <button
                                onClick={() => window.location.reload()}
                                className="mt-4 bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
                            >
                                Retry
                            </button>
                        </div>
                    </div>
                )}

                {/* Personalized recommendations (always shown first when available) */}
                {!loading && !error && (
                    <RecommendationsList source="personalized" limit={6} />
                )}

                {/* Predefined trending section */}
                {!loading && !error && (
                    <CategorySection
                        category={{ id: "trending", name: "Trending Now" }}
                        autoSlide={false}
                    />
                )}

                {/* Dynamic categories */}
                {!loading &&
                    !error &&
                    categories.map((category) => (
                        <CategorySection
                            key={category.id}
                            category={category}
                            autoSlide={false}
                        />
                    ))}

                {/* New releases recommendations */}
                {!loading && !error && (
                    <RecommendationsList
                        source="new"
                        limit={6}
                        className="mt-4"
                    />
                )}

                {/* Recently added section (always shown last) */}
                {!loading && !error && (
                    <CategorySection
                        category={{ id: "recent", name: "Recently Added" }}
                        autoSlide={false}
                    />
                )}
            </div>
        </div>
    );
}
