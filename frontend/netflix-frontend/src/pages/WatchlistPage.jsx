import { useState } from "react";
import WatchlistList from "../components/content/WatchlistList";
import HistoryList from "../components/content/HistoryList";

export default function WatchlistPage() {
    const [activeTab, setActiveTab] = useState("watchlist");

    // Handle tab change
    const handleTabChange = (tab) => {
        setActiveTab(tab);
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold mb-8">My List</h1>

                {/* Tabs */}
                <div className="mb-6 border-b border-gray-700">
                    <div className="flex space-x-8">
                        <button
                            className={`py-2 px-1 -mb-px font-medium text-sm sm:text-base transition-colors duration-200 ${
                                activeTab === "watchlist"
                                    ? "border-b-2 border-red-600 text-white"
                                    : "text-gray-400 hover:text-gray-300"
                            }`}
                            onClick={() => handleTabChange("watchlist")}
                        >
                            Watchlist
                        </button>

                        <button
                            className={`py-2 px-1 -mb-px font-medium text-sm sm:text-base transition-colors duration-200 ${
                                activeTab === "history"
                                    ? "border-b-2 border-red-600 text-white"
                                    : "text-gray-400 hover:text-gray-300"
                            }`}
                            onClick={() => handleTabChange("history")}
                        >
                            Watch History
                        </button>
                    </div>
                </div>

                {/* Tab content */}
                <div className="min-h-[50vh]">
                    {activeTab === "watchlist" ? (
                        <WatchlistList />
                    ) : (
                        <HistoryList />
                    )}
                </div>
            </div>
        </div>
    );
}
