import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { searchVideos } from "../lib/content-service";
import SearchInput from "../components/search-input";
import SearchFilters from "../components/search-filters";
import SearchResults from "../components/search-results";
import type { VideoContent } from "../lib/types";

export default function SearchPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const query = searchParams.get("q") || "";
    const genre = searchParams.get("genre") || "";
    const year = searchParams.get("year") || "";
    const rating = searchParams.get("rating") || "";
    const page = Number.parseInt(searchParams.get("page") || "1", 10);

    const [results, setResults] = useState<VideoContent[]>([]);
    const [totalResults, setTotalResults] = useState(0);
    const [loading, setLoading] = useState(false);
    const [activeFilters, setActiveFilters] = useState({
        genre: genre,
        year: year,
        rating: rating,
    });

    const ITEMS_PER_PAGE = 20;

    useEffect(() => {
        const fetchResults = async () => {
            if (!query) {
                setResults([]);
                setTotalResults(0);
                return;
            }

            setLoading(true);
            try {
                const filters = {
                    genre: activeFilters.genre,
                    year: activeFilters.year,
                    rating: activeFilters.rating,
                    page,
                    limit: ITEMS_PER_PAGE,
                };

                const data = await searchVideos(query, filters);
                setResults(data);
                // In a real app, the API would return the total count
                setTotalResults(Math.floor(Math.random() * 100) + data.length);
            } catch (error) {
                console.error("Search error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, [query, activeFilters, page]);

    const handleFilterChange = (filterType: string, value: string) => {
        const newFilters = { ...activeFilters, [filterType]: value };
        setActiveFilters(newFilters);

        // Update URL with new filters and reset to page 1
        const params = new URLSearchParams(searchParams.toString());
        params.set(filterType, value);
        params.set("page", "1");
        setSearchParams(params);
    };

    const handlePageChange = (newPage: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("page", newPage.toString());
        setSearchParams(params);
    };

    return (
        <div className="min-h-screen pt-24 pb-16 px-4 md:px-8">
            <div className="max-w-screen-2xl mx-auto">
                <h1 className="text-3xl font-bold mb-8">Search</h1>

                <div className="mb-8">
                    <SearchInput initialQuery={query} />
                </div>

                {query && (
                    <>
                        <div className="mb-6">
                            <SearchFilters
                                activeFilters={activeFilters}
                                onFilterChange={handleFilterChange}
                            />
                        </div>

                        <SearchResults
                            results={results}
                            loading={loading}
                            totalResults={totalResults}
                            currentPage={page}
                            itemsPerPage={ITEMS_PER_PAGE}
                            onPageChange={handlePageChange}
                        />
                    </>
                )}

                {!query && (
                    <div className="flex flex-col items-center justify-center py-20">
                        <p className="text-xl text-gray-400 mb-4">
                            Search for movies, TV shows, and more
                        </p>
                        <p className="text-gray-500">
                            Try searching for a title, genre, or actor
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
