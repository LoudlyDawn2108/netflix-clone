import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getWatchHistory, clearWatchHistory } from "../../services/watchlist";
import VideoCard from "./VideoCard";
import PaginationControls from "../search/PaginationControls";

export default function HistoryList() {
    const [historyItems, setHistoryItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({
        page: 1,
        totalPages: 1,
        totalItems: 0,
        limit: 12,
    });
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const navigate = useNavigate();

    // Fetch history data
    useEffect(() => {
        async function fetchHistory() {
            setLoading(true);
            setError(null);

            try {
                const data = await getWatchHistory({
                    page,
                    limit: pagination.limit,
                });
                setHistoryItems(data.items || []);
                setPagination(data.pagination || pagination);
            } catch (err) {
                console.error("Failed to load watch history:", err);
                setError(err.message || "Failed to load your watch history");
            } finally {
                setLoading(false);
            }
        }

        fetchHistory();
    }, [page]);

    // Handle clear history
    const handleClearHistory = async () => {
        setShowClearConfirm(false);

        try {
            await clearWatchHistory();

            // Update local state
            setHistoryItems([]);
            setPagination((prev) => ({
                ...prev,
                totalItems: 0,
                totalPages: 1,
            }));
            setPage(1);
        } catch (err) {
            console.error("Failed to clear history:", err);
            setError("Failed to clear watch history. Please try again.");
        }
    };

    // Handle remove single history item
    const handleRemoveItem = async (id, videoId) => {
        try {
            await clearWatchHistory(videoId);

            // Update local state by removing the item
            setHistoryItems((prev) => prev.filter((item) => item.id !== id));

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
            if (historyItems.length === 1 && page > 1) {
                setPage(page - 1);
            }
        } catch (err) {
            console.error("Failed to remove history item:", err);
        }
    };

    // Handle page change
    const handlePageChange = (newPage) => {
        setPage(newPage);
    };

    // Handle resume watching
    const handleResumeWatching = (item) => {
        // Navigate to the video player at the stored timestamp
        navigate(
            `/videos/${item.videoId}/watch?t=${calculateTimeInSeconds(item.progress, item.duration)}`
        );
    };

    // Loading state
    if (loading && !historyItems.length) {
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
    if (!historyItems.length) {
        return (
            <div className="py-4">
                <div className="bg-gray-800 rounded-lg p-8 text-center">
                    <h3 className="text-lg font-medium mb-2">
                        Your watch history is empty
                    </h3>
                    <p className="text-gray-400 mb-4">
                        Videos you watch will appear here
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
            {/* Clear history button */}
            <div className="mb-4 flex justify-between items-center">
                <h3 className="font-medium">
                    {pagination.totalItems}{" "}
                    {pagination.totalItems === 1 ? "item" : "items"} in your
                    history
                </h3>

                <button
                    onClick={() => setShowClearConfirm(true)}
                    className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded"
                >
                    Clear watch history
                </button>
            </div>

            {/* Video grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mb-6">
                {historyItems.map((item) => (
                    <div key={item.id} className="relative group">
                        <VideoCard video={item.video} />

                        {/* Progress bar */}
                        {item.progress < 100 && (
                            <div className="absolute bottom-[3.5rem] left-0 w-full px-2">
                                <div className="h-1 bg-gray-700 rounded overflow-hidden">
                                    <div
                                        className="h-full bg-red-600"
                                        style={{ width: `${item.progress}%` }}
                                    ></div>
                                </div>
                            </div>
                        )}

                        {/* Remove button */}
                        <button
                            className="absolute top-2 right-2 bg-black bg-opacity-70 hover:bg-opacity-90 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                            onClick={() =>
                                handleRemoveItem(item.id, item.videoId)
                            }
                            aria-label={`Remove ${item.video.title} from history`}
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

                        {/* Action buttons and watched date */}
                        <div className="mt-1 flex flex-col gap-1">
                            <span className="text-xs text-gray-400">
                                Watched: {formatDate(item.watchedAt)}
                            </span>

                            {item.progress < 100 && (
                                <button
                                    onClick={() => handleResumeWatching(item)}
                                    className="mt-1 text-xs bg-red-600 hover:bg-red-700 px-2 py-1 rounded flex items-center w-fit"
                                >
                                    <svg
                                        className="w-3 h-3 mr-1"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                    Resume
                                </button>
                            )}
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

            {/* Clear history confirmation modal */}
            {showClearConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-xl font-bold mb-4">
                            Clear Watch History
                        </h3>
                        <p className="text-gray-300 mb-6">
                            Are you sure you want to clear your entire watch
                            history? This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowClearConfirm(false)}
                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleClearHistory}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
                            >
                                Clear History
                            </button>
                        </div>
                    </div>
                </div>
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

// Helper function to calculate time in seconds based on percentage and duration
function calculateTimeInSeconds(progressPercent, durationMinutes) {
    const totalSeconds = durationMinutes * 60;
    return Math.floor((progressPercent / 100) * totalSeconds);
}
