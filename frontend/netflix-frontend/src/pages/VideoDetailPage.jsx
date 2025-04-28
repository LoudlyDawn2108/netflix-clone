import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getVideoDetails } from "../services/videos";
import VideoPlayer from "../components/video/VideoPlayer";
import VideoInfo from "../components/video/VideoInfo";
import Description from "../components/video/Description";
import RatingsList from "../components/video/RatingsList";
import ReviewsList from "../components/video/ReviewsList";
import AddToWatchlist from "../components/video/AddToWatchlist";
import { fetchSimilarVideos } from "../services/recommendations";
import VideoCard from "../components/content/VideoCard";

export default function VideoDetailPage() {
    const { id } = useParams();
    const [details, setDetails] = useState(null);
    const [similarVideos, setSimilarVideos] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function fetchDetails() {
            try {
                setLoading(true);
                const data = await getVideoDetails(id);
                setDetails(data);

                // Fetch similar videos recommendation
                const similarData = await fetchSimilarVideos(id, 6);
                setSimilarVideos(similarData);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        fetchDetails();
    }, [id]);

    if (loading)
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            </div>
        );

    if (error)
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="bg-red-900/30 border border-red-500 text-red-200 p-6 rounded-lg max-w-lg">
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
        );

    if (!details) return null;

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <div className="max-w-6xl mx-auto p-4 space-y-8">
                <VideoPlayer src={details.videoUrl} />
                <VideoInfo video={details} />
                <Description text={details.description} />
                <RatingsList ratings={details.ratings || []} />
                <ReviewsList reviews={details.reviews || []} />
                <AddToWatchlist videoId={id} />

                {/* Similar Videos Recommendations */}
                {similarVideos &&
                    similarVideos.items &&
                    similarVideos.items.length > 0 && (
                        <div className="mt-12 pt-8 border-t border-gray-800">
                            <h2 className="text-2xl font-bold mb-6">
                                {similarVideos.title}
                            </h2>
                            {similarVideos.description && (
                                <p className="text-gray-400 mb-4">
                                    {similarVideos.description}
                                </p>
                            )}

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                {similarVideos.items.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex flex-col"
                                    >
                                        <VideoCard video={item.video} />
                                        {item.similarityScore > 0.9 && (
                                            <span className="mt-1 text-xs text-blue-400">
                                                Highly recommended
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
            </div>
        </div>
    );
}
