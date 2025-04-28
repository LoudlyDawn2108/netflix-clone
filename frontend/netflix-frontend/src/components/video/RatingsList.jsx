import React from "react";

export default function RatingsList({ ratings }) {
    if (!ratings.length) return null;

    return (
        <div className="space-y-2">
            <h2 className="text-xl font-semibold">Ratings</h2>
            <ul className="list-none flex space-x-2">
                {ratings.map((r, idx) => (
                    <li key={idx} className="flex items-center text-yellow-400">
                        {"★".repeat(Math.round(r))}
                        {"☆".repeat(5 - Math.round(r))}
                    </li>
                ))}
            </ul>
        </div>
    );
}
