import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getVideoById, getRelatedVideos } from "../lib/content-service";
import RecommendationRow from "../components/recommendation-row";
import { Button } from "../components/ui/button";
import LoadingSkeleton from "../components/ui/loading-skeleton";
import type { VideoContent } from "../lib/types";

export default function WatchPage() {
    const { id } = useParams<{ id: string }>();
    const [video, setVideo] = useState<VideoContent | null>(null);
    const [relatedVideos, setRelatedVideos] = useState<VideoContent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchVideoData = async () => {
            if (!id) return;

            setLoading(true);
            setError(null);

            try {
                // Fetch video details
                const videoData = await getVideoById(id);
                if (!videoData) {
                    setError("Video not found");
                    return;
                }

                setVideo(videoData);

                // Fetch related videos
                const related = await getRelatedVideos(id);
                setRelatedVideos(related);
            } catch (err) {
                console.error("Error fetching video:", err);
                setError("Failed to load video. Please try again later.");
            } finally {
                setLoading(false);
            }
        };

        fetchVideoData();
    }, [id]);

    if (loading) {
        return (
            <div className="pt-16">
                <LoadingSkeleton type="hero" />
                <div className="container mx-auto px-4 py-8">
                    <LoadingSkeleton
                        type="text"
                        count={3}
                        className="max-w-2xl mb-8"
                    />
                    <LoadingSkeleton type="row" className="mb-8" />
                </div>
            </div>
        );
    }

    if (error || !video) {
        return (
            <div className="container mx-auto px-4 py-32 flex flex-col items-center justify-center">
                <div className="text-red-600 text-5xl mb-4">⚠️</div>
                <h1 className="text-2xl font-bold mb-4">
                    {error || "Video not found"}
                </h1>
                <p className="text-gray-400 mb-8">
                    The video you're looking for might have been removed or is
                    unavailable.
                </p>
                <Link to="/">
                    <Button
                        variant="default"
                        size="lg"
                        className="bg-red-600 hover:bg-red-700"
                    >
                        Back to Home
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black">
            {/* Video player section */}
            <div className="pt-16 relative">
                <div className="relative w-full aspect-video bg-black">
                    {/* In a real app, this would be a video player */}
                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                        <div className="text-center p-4">
                            <div className="bg-white/20 backdrop-blur-sm p-8 rounded-lg">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="mx-auto h-16 w-16 text-red-600 mb-4"
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <polygon points="10 8 16 12 10 16 10 8"></polygon>
                                </svg>
                                <p className="text-xl">
                                    Demo Mode: Video Playback Simulated
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Video controls overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                    <div className="container mx-auto flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold">
                                {video.title}
                            </h1>
                            <div className="flex items-center text-sm mt-1">
                                <span className="text-green-500 font-semibold">
                                    {video.matchPercentage}% Match
                                </span>
                                <span className="mx-2">
                                    {video.releaseYear}
                                </span>
                                <span className="border border-gray-600 px-1 text-xs mx-2">
                                    {video.maturityRating}
                                </span>
                                <span>{video.duration}</span>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                className="bg-transparent border-white text-white"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-5 w-5 mr-2"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                                </svg>
                                Rate
                            </Button>
                            <Button
                                variant="outline"
                                className="bg-transparent border-white text-white"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-5 w-5 mr-2"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                                Add to List
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content details */}
            <div className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <p className="text-lg mb-6">{video.overview}</p>

                        <div>
                            <h2 className="text-xl font-medium mb-2">
                                Details
                            </h2>
                            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                                <div>
                                    <dt className="text-gray-400 inline">
                                        Released:
                                    </dt>
                                    <dd className="inline ml-2">
                                        {video.releaseYear}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-gray-400 inline">
                                        Rating:
                                    </dt>
                                    <dd className="inline ml-2">
                                        {video.maturityRating}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-gray-400 inline">
                                        Duration:
                                    </dt>
                                    <dd className="inline ml-2">
                                        {video.duration}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-gray-400 inline">
                                        Genres:
                                    </dt>
                                    <dd className="inline ml-2">
                                        {video.genres.join(", ")}
                                    </dd>
                                </div>
                            </dl>
                        </div>
                    </div>

                    <div>
                        {/* Suggested actions or extras could go here */}
                        <div className="bg-zinc-900 p-4 rounded-lg">
                            <h3 className="text-lg font-medium mb-3">
                                Cast & Crew
                            </h3>
                            <ul className="space-y-2">
                                <li>
                                    <span className="text-gray-400">
                                        Director:
                                    </span>{" "}
                                    Sample Director
                                </li>
                                <li>
                                    <span className="text-gray-400">
                                        Writer:
                                    </span>{" "}
                                    Sample Writer
                                </li>
                                <li>
                                    <span className="text-gray-400">Cast:</span>{" "}
                                    Actor One, Actor Two, Actor Three
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* Related content */}
            <div className="container mx-auto px-4 py-8">
                {relatedVideos.length > 0 && (
                    <div className="pt-4">
                        <h2 className="text-2xl font-medium mb-4">
                            More Like This
                        </h2>
                        <RecommendationRow
                            title=""
                            items={relatedVideos}
                            type="related"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
