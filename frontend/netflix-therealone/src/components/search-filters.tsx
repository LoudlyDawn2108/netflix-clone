import React from "react";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";

interface SearchFiltersProps {
    activeFilters: {
        genre: string;
        year: string;
        rating: string;
    };
    onFilterChange: (filterType: string, value: string) => void;
}

export default function SearchFilters({
    activeFilters,
    onFilterChange,
}: SearchFiltersProps) {
    const genres = [
        "Action",
        "Comedy",
        "Drama",
        "Fantasy",
        "Horror",
        "Mystery",
        "Romance",
        "Sci-Fi",
        "Thriller",
    ];

    const years = [
        "2025",
        "2024",
        "2023",
        "2022",
        "2021",
        "2020",
        "2010-2019",
        "2000-2009",
        "Before 2000",
    ];

    const ratings = [
        "G",
        "PG",
        "PG-13",
        "R",
        "TV-Y",
        "TV-Y7",
        "TV-G",
        "TV-PG",
        "TV-14",
        "TV-MA",
    ];

    const renderFilterGroup = (
        title: string,
        options: string[],
        filterType: keyof typeof activeFilters
    ) => (
        <div className="mb-6">
            <h3 className="text-sm font-medium mb-2">{title}</h3>
            <div className="flex flex-wrap gap-2">
                {options.map((option) => (
                    <Button
                        key={option}
                        variant="outline"
                        size="sm"
                        className={cn(
                            "rounded-full bg-zinc-800 border-zinc-700 text-sm",
                            activeFilters[filterType] === option
                                ? "bg-red-600 hover:bg-red-700 text-white border-transparent"
                                : "hover:bg-zinc-700"
                        )}
                        onClick={() => {
                            if (activeFilters[filterType] === option) {
                                // If already selected, clear the filter
                                onFilterChange(filterType, "");
                            } else {
                                // Otherwise, set the filter
                                onFilterChange(filterType, option);
                            }
                        }}
                    >
                        {option}
                    </Button>
                ))}
            </div>
        </div>
    );

    return (
        <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-medium">Filters</h2>
                {(activeFilters.genre ||
                    activeFilters.year ||
                    activeFilters.rating) && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-white"
                        onClick={() => {
                            onFilterChange("genre", "");
                            onFilterChange("year", "");
                            onFilterChange("rating", "");
                        }}
                    >
                        Clear All
                    </Button>
                )}
            </div>

            {renderFilterGroup("Genre", genres, "genre")}
            {renderFilterGroup("Year", years, "year")}
            {renderFilterGroup("Rating", ratings, "rating")}
        </div>
    );
}
