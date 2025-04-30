import { useEffect, useState } from "react";
import Hero from "../components/hero";
import ContentRow from "../components/content-row";
import RecommendationRow from "../components/recommendation-row";
import { getHomePageContent } from "../lib/content-service";
import type { HomePageContent } from "../lib/types";

export default function HomePage() {
    const [content, setContent] = useState<HomePageContent | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchHomePageContent = async () => {
            try {
                setLoading(true);
                const data = await getHomePageContent();
                setContent(data);
            } catch (err) {
                setError("Failed to load content. Please try again later.");
                console.error("Error fetching home page content:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchHomePageContent();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex justify-center items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
            </div>
        );
    }

    if (error || !content) {
        return (
            <div className="min-h-screen bg-black flex flex-col justify-center items-center p-4">
                <div className="text-red-600 text-3xl mb-4">⚠️</div>
                <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
                <p className="text-gray-400 mb-4">
                    {error || "Failed to load content"}
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                >
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <Hero featured={content.featured} />

            <div className="space-y-8 p-4 md:px-8 bg-black">
                {content.continueWatching.items.length > 0 && (
                    <ContentRow
                        title="Continue Watching"
                        items={content.continueWatching.items}
                        type="continue-watching"
                    />
                )}

                {content.myList.items.length > 0 && (
                    <ContentRow
                        title="My List"
                        items={content.myList.items}
                        type="my-list"
                    />
                )}

                {/* Personalized Recommendations */}
                <RecommendationRow
                    title={content.becauseYouWatched.title}
                    items={content.becauseYouWatched.items}
                    type="because-you-watched"
                />

                <RecommendationRow
                    title={content.topPicks.title}
                    subtitle={content.topPicks.subtitle}
                    items={content.topPicks.items}
                    type="top-picks"
                />

                <ContentRow
                    title="Trending Now"
                    items={content.trending.items}
                    type="trending"
                />

                <RecommendationRow
                    title={content.watchAgain.title}
                    subtitle={content.watchAgain.subtitle}
                    items={content.watchAgain.items}
                    type="watch-again"
                />

                <ContentRow
                    title="Popular on Netflix"
                    items={content.popular.items}
                    type="popular"
                />

                <ContentRow
                    title="New Releases"
                    items={content.newReleases.items}
                    type="new-releases"
                />
            </div>
        </div>
    );
}
