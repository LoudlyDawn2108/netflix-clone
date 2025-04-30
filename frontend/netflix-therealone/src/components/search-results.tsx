import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import LoadingSkeleton from "./ui/loading-skeleton";
import type { VideoContent } from "../lib/types";

interface SearchResultsProps {
    results: VideoContent[];
    loading: boolean;
    totalResults: number;
    currentPage: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
}

export default function SearchResults({
    results,
    loading,
    totalResults,
    currentPage,
    itemsPerPage,
    onPageChange,
}: SearchResultsProps) {
    const totalPages = Math.ceil(totalResults / itemsPerPage);

    // Generate pagination range
    const generatePaginationRange = () => {
        const range = [];
        const delta = 2; // Show 2 pages before and after current page

        for (
            let i = Math.max(2, currentPage - delta);
            i <= Math.min(totalPages - 1, currentPage + delta);
            i++
        ) {
            range.push(i);
        }

        // Always add first page
        if (range[0] > 2) {
            range.unshift("...");
        }
        range.unshift(1);

        // Always add last page
        if (range[range.length - 1] < totalPages - 1) {
            range.push("...");
        }
        if (totalPages > 1) {
            range.push(totalPages);
        }

        return range;
    };

    if (loading) {
        return (
            <div className="space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {Array(10)
                        .fill(0)
                        .map((_, i) => (
                            <LoadingSkeleton key={i} className="h-64 w-full" />
                        ))}
                </div>
            </div>
        );
    }

    if (results.length === 0) {
        return (
            <div className="py-12 text-center">
                <h3 className="text-2xl font-semibold mb-4">
                    No results found
                </h3>
                <p className="text-gray-400 mb-6">
                    Try adjusting your search or filters to find what you're
                    looking for.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <p className="text-gray-400">
                    Showing {(currentPage - 1) * itemsPerPage + 1}-
                    {Math.min(currentPage * itemsPerPage, totalResults)} of{" "}
                    {totalResults} results
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {results.map((item) => (
                    <Link
                        key={item.id}
                        to={`/watch/${item.id}`}
                        className="group bg-zinc-900 rounded-md overflow-hidden hover:scale-105 transition-transform duration-200"
                    >
                        <div className="relative aspect-video">
                            <img
                                src={item.thumbnailPath || "/placeholder.svg"}
                                alt={item.title}
                                className="object-cover w-full h-full"
                            />
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                <div className="bg-white text-black rounded-full p-3">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="24"
                                        height="24"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="h-6 w-6"
                                    >
                                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div className="p-3">
                            <h3 className="font-medium line-clamp-1">
                                {item.title}
                            </h3>

                            <div className="flex items-center text-sm text-gray-400 mt-1 mb-2">
                                <span className="text-green-500 mr-2">
                                    {item.matchPercentage}%
                                </span>
                                <span>{item.releaseYear}</span>
                                <span className="mx-1">•</span>
                                <span className="border border-gray-600 px-1 text-xs">
                                    {item.maturityRating}
                                </span>
                            </div>

                            <p className="text-xs text-gray-500 line-clamp-2">
                                {item.overview}
                            </p>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center pt-8">
                    <div className="flex space-x-1">
                        <Button
                            variant="outline"
                            size="sm"
                            className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700"
                            disabled={currentPage === 1}
                            onClick={() => onPageChange(currentPage - 1)}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="h-4 w-4"
                            >
                                <polyline points="15 18 9 12 15 6"></polyline>
                            </svg>
                        </Button>

                        {generatePaginationRange().map((page, i) => (
                            <Button
                                key={i}
                                variant="outline"
                                size="sm"
                                className={
                                    page === currentPage
                                        ? "bg-red-600 text-white border-transparent hover:bg-red-700"
                                        : "bg-zinc-800 border-zinc-700 hover:bg-zinc-700"
                                }
                                disabled={page === "..."}
                                onClick={() =>
                                    page !== "..." &&
                                    onPageChange(page as number)
                                }
                            >
                                {page}
                            </Button>
                        ))}

                        <Button
                            variant="outline"
                            size="sm"
                            className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700"
                            disabled={currentPage === totalPages}
                            onClick={() => onPageChange(currentPage + 1)}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="h-4 w-4"
                            >
                                <polyline points="9 18 15 12 9 6"></polyline>
                            </svg>
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
