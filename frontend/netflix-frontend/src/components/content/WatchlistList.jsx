import { useState, useEffect } from "react";
import { getWatchlist, removeFromWatchlist } from "../../services/watchlist";
import VideoCard from "./VideoCard";
import PaginationControls from "../search/PaginationControls";

export default function WatchlistList() {
    const [watchlistItems, setWatchlistItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({
        page: 1,
        totalPages: 1,
        totalItems: 0,
        limit: 12,
    });

    // Fetch watchlist data
    useEffect(() => {
        async function fetchWatchlist() {
            setLoading(true);
            setError(null);

            try {
                const data = await getWatchlist({
                    page,
                    limit: pagination.limit,
                });
                setWatchlistItems(data.items || []);
                setPagination(data.pagination || pagination);
            } catch (err) {
                console.error("Failed to load watchlist:", err);
                setError(err.message || "Failed to load your watchlist");
            } finally {
                setLoading(false);
            }
        }

        fetchWatchlist();
    }, [page]);

    // Handle remove from watchlist
    const handleRemove = async (videoId) => {
        try {
            await removeFromWatchlist(videoId);

            // Update local state by removing the item
            setWatchlistItems((prev) =>
                prev.filter((item) => item.videoId !== videoId)
            );

            // Update pagination count
            setPagination((prev) => ({
                ...prev,
                totalItems: prev.totalItems - 1,
                totalPages: Math.max(
                    1,
                    Math.ceil((prev.totalItems - 1) / prev.limit)
                ),
            }));

            // If page is now empty and not the first page, go back
            if (watchlistItems.length === 1 && page > 1) {
                setPage(page - 1);
            }
        } catch (err) {
            console.error("Failed to remove from watchlist:", err);
        }
    };

    // Handle page change
    const handlePageChange = (newPage) => {
        setPage(newPage);
    };

    // Loading state
    if (loading && !watchlistItems.length) {
        return (
            <div className="py-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                    {[...Array(6)].map((_, idx) => (
                        <div
                            key={idx}
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
            <div className="py-4">
                <div className="bg-red-900/30 border border-red-500 text-red-200 p-4 rounded-md">
                    <p>{error}</p>
                    <button
                        onClick={() => setPage(1)}
                        className="mt-2 px-4 py-2 bg-red-600 rounded hover:bg-red-700"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    // Empty state
    if (!watchlistItems.length) {
        return (
            <div className="py-4">
                <div className="bg-gray-800 rounded-lg p-8 text-center">
                    <h3 className="text-lg font-medium mb-2">
                        Your watchlist is empty
                    </h3>
                    <p className="text-gray-400 mb-4">
                        Find shows and movies you want to watch later by
                        clicking the + button
                    </p>
                    <a
                        href="/"
                        className="inline-block px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded"
                    >
                        Browse content
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="py-4">
            {/* Video grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mb-6">
                {watchlistItems.map((item) => (
                    <div key={item.id} className="relative group">
                        <VideoCard video={item.video} />

                        {/* Remove button */}
                        <button
                            className="absolute top-2 right-2 bg-black bg-opacity-70 hover:bg-opacity-90 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                            onClick={() => handleRemove(item.videoId)}
                            aria-label={`Remove ${item.video.title} from watchlist`}
                        >
                            <svg
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>

                        {/* Date added */}
                        <div className="mt-1">
                            <span className="text-xs text-gray-400">
                                Added: {formatDate(item.addedAt)}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Pagination controls */}
            {pagination.totalPages > 1 && (
                <PaginationControls
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    onPageChange={handlePageChange}
                />
            )}
        </div>
    );
}

// Helper function to format date
function formatDate(dateString) {
    if (!dateString) return "";

    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    }).format(date);
}
