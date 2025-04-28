import VideoCard from "../../components/content/VideoCard";

export default function ResultsGrid({ results, loading }) {
    if (loading) {
        return <div className="text-center text-white">Loading results...</div>;
    }
    if (!results.length) {
        return (
            <div className="text-center text-gray-400">No results found.</div>
        );
    }
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {results.map((video) => (
                <VideoCard key={video.id} video={video} />
            ))}
        </div>
    );
}
