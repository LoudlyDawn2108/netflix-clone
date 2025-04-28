import { useState, useEffect } from "react";
import SearchBar from "../components/search/SearchBar";
import SuggestionsDropdown from "../components/search/SuggestionsDropdown";
import FacetFilters from "../components/search/FacetFilters";
import ResultsGrid from "../components/search/ResultsGrid";
import PaginationControls from "../components/search/PaginationControls";
import { searchVideos, getSearchSuggestions } from "../services/search";

export default function SearchPage() {
    const [query, setQuery] = useState("");
    const [suggestions, setSuggestions] = useState([]);
    const [filters, setFilters] = useState({ genre: "", year: "" });
    const [results, setResults] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (query) {
            getSearchSuggestions(query)
                .then(setSuggestions)
                .catch(() => {});
        } else {
            setSuggestions([]);
        }
    }, [query]);

    useEffect(() => {
        async function fetchResults() {
            setLoading(true);
            try {
                const data = await searchVideos(query, filters, page);
                setResults(data.results || data.items || []);
                setTotalPages(data.totalPages || 1);
                setError(null);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        fetchResults();
    }, [query, filters, page]);

    function handleSelectSuggestion(term) {
        setQuery(term);
        setSuggestions([]);
    }

    return (
        <div className="max-w-6xl mx-auto p-4 text-white">
            <SearchBar query={query} onQueryChange={setQuery} />
            <SuggestionsDropdown
                suggestions={suggestions}
                onSelect={handleSelectSuggestion}
            />
            <div className="mt-4 flex flex-col md:flex-row md:space-x-4">
                <FacetFilters filters={filters} onChange={setFilters} />
                <div className="flex-1">
                    {error && (
                        <div className="text-red-500">Error: {error}</div>
                    )}
                    <ResultsGrid results={results} loading={loading} />
                    <PaginationControls
                        page={page}
                        totalPages={totalPages}
                        onPageChange={setPage}
                    />
                </div>
            </div>
        </div>
    );
}
