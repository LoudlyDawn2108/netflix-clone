import React from "react";

const genres = ["Action", "Comedy", "Drama", "Romance", "Sci-Fi"];
const years = Array.from(
    { length: 10 },
    (_, i) => `${new Date().getFullYear() - i}`
);

export default function FacetFilters({ filters, onChange }) {
    function handleGenre(e) {
        onChange({ ...filters, genre: e.target.value });
    }
    function handleYear(e) {
        onChange({ ...filters, year: e.target.value });
    }

    return (
        <div className="w-full md:w-64 space-y-4 mb-4 md:mb-0">
            <div>
                <label className="block text-sm mb-1">Genre</label>
                <select
                    value={filters.genre}
                    onChange={handleGenre}
                    className="w-full p-2 rounded bg-gray-700 text-white"
                >
                    <option value="">All</option>
                    {genres.map((g) => (
                        <option key={g} value={g.toLowerCase()}>
                            {g}
                        </option>
                    ))}
                </select>
            </div>
            <div>
                <label className="block text-sm mb-1">Year</label>
                <select
                    value={filters.year}
                    onChange={handleYear}
                    className="w-full p-2 rounded bg-gray-700 text-white"
                >
                    <option value="">All</option>
                    {years.map((y) => (
                        <option key={y} value={y}>
                            {y}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}
