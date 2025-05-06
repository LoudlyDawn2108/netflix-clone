import { useEffect, useState, Suspense } from "react";
import { useParams } from "react-router-dom";
import { getContentDetails } from "../lib/content-service";
import { ContentDetails } from "../lib/types";
import LoadingSkeleton from "../components/ui/loading-skeleton";

// We'll create these components
import TitleHero from "../components/title-hero";
import TitleDetails from "../components/title-details";
import TitleCast from "../components/title-cast";
import TitleEpisodes from "../components/title-episodes";
import TitleReviews from "../components/title-reviews";
import TitleSimilar from "../components/title-similar";

export default function TitlePage() {
    const { id } = useParams<{ id: string }>();
    const [content, setContent] = useState<ContentDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchContentDetails() {
            if (!id) {
                setError("No title ID provided");
                setLoading(false);
                return;
            }

            try {
                const data = await getContentDetails(id);
                if (!data) {
                    setError("Title not found");
                    setLoading(false);
                    return;
                }
                setContent(data);
            } catch (err) {
                setError("Failed to load title details");
                console.error(err);
            } finally {
                setLoading(false);
            }
        }

        fetchContentDetails();
    }, [id]);

    if (loading) {
        return <LoadingSkeleton />;
    }

    if (error || !content) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-semibold mb-2">Error</h2>
                    <p className="text-gray-400">
                        {error || "Failed to load content"}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-fit pb-20">
            <TitleHero content={content} />

            <div className="max-w-screen-2xl mx-auto px-4 md:px-8 -mt-16 relative z-10 space-y-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        {/* Overview will be part of hero for simplicity */}
                    </div>
                    <div className="space-y-8">
                        <TitleDetails content={content} />
                    </div>
                </div>

                <div className="mt-8">
                    <TitleCast cast={content.cast} />
                </div>

                {content.type === "series" && content.seasons && (
                    <div className="mt-8">
                        <TitleEpisodes series={content} />
                    </div>
                )}

                <div className="mt-8">
                    <TitleReviews reviews={content.reviews} />
                </div>

                <div className="mt-8">
                    <TitleSimilar similar={content.similar} />
                </div>
            </div>
        </div>
    );
}
