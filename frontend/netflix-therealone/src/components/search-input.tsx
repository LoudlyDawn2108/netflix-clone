import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { getSearchSuggestions } from "../lib/content-service";

interface SearchInputProps {
    initialQuery?: string;
}

export default function SearchInput({ initialQuery = "" }: SearchInputProps) {
    const [query, setQuery] = useState(initialQuery);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        // Get suggestions when query changes
        const fetchSuggestions = async () => {
            if (!query || query.length < 2) {
                setSuggestions([]);
                return;
            }

            try {
                const results = await getSearchSuggestions(query);
                setSuggestions(results);
            } catch (error) {
                console.error("Error fetching suggestions:", error);
            }
        };

        fetchSuggestions();
    }, [query]);

    useEffect(() => {
        // Close suggestions on click outside
        const handleClickOutside = (event: MouseEvent) => {
            if (
                suggestionsRef.current &&
                inputRef.current &&
                !suggestionsRef.current.contains(event.target as Node) &&
                !inputRef.current.contains(event.target as Node)
            ) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            navigate(`/search?q=${encodeURIComponent(query.trim())}`);
            setShowSuggestions(false);
        }
    };

    const handleSuggestionClick = (suggestion: string) => {
        setQuery(suggestion);
        navigate(`/search?q=${encodeURIComponent(suggestion)}`);
        setShowSuggestions(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleSubmit(e);
        } else if (e.key === "Escape") {
            setShowSuggestions(false);
        }
    };

    const handleClear = () => {
        setQuery("");
        inputRef.current?.focus();
    };

    return (
        <div className="relative w-full max-w-md">
            <form onSubmit={handleSubmit} className="relative">
                <div className="relative">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="m21 21-4.3-4.3"></path>
                    </svg>

                    <Input
                        ref={inputRef}
                        type="text"
                        placeholder="Search for movies, TV shows, genres..."
                        className="pl-10 pr-10 py-6 bg-zinc-900 border-zinc-700 text-white text-lg rounded-md"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setShowSuggestions(true);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        onKeyDown={handleKeyDown}
                    />

                    {query && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                            onClick={handleClear}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M18 6 6 18"></path>
                                <path d="m6 6 12 12"></path>
                            </svg>
                        </Button>
                    )}
                </div>
            </form>

            {/* Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
                <div
                    ref={suggestionsRef}
                    className="absolute z-10 mt-1 w-full rounded-md bg-zinc-800 border border-zinc-700 shadow-lg"
                >
                    <ul className="py-1 max-h-60 overflow-auto">
                        {suggestions.map((suggestion, index) => (
                            <li
                                key={index}
                                className="px-4 py-2 hover:bg-zinc-700 cursor-pointer"
                                onClick={() =>
                                    handleSuggestionClick(suggestion)
                                }
                            >
                                {suggestion}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
