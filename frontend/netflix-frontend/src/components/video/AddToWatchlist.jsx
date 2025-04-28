import { useState, useEffect } from "react";
import {
    getWatchlistStatus,
    addToWatchlist,
    removeFromWatchlist,
} from "../../services/watchlist";

export default function AddToWatchlist({ videoId }) {
    const [inWatchlist, setInWatchlist] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function fetchStatus() {
            try {
                const data = await getWatchlistStatus(videoId);
                setInWatchlist(data.inWatchlist);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        fetchStatus();
    }, [videoId]);

    async function toggleWatchlist() {
        setLoading(true);
        try {
            if (inWatchlist) {
                await removeFromWatchlist(videoId);
                setInWatchlist(false);
            } else {
                await addToWatchlist(videoId);
                setInWatchlist(true);
            }
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    if (error) return <p className="text-red-500">Error: {error}</p>;
    return (
        <button
            onClick={toggleWatchlist}
            disabled={loading}
            className={`px-4 py-2 rounded ${inWatchlist ? "bg-gray-600 text-white" : "bg-blue-600 text-white"} disabled:opacity-50`}
        >
            {loading
                ? "Updating..."
                : inWatchlist
                  ? "Remove from Watchlist"
                  : "Add to Watchlist"}
        </button>
    );
}
