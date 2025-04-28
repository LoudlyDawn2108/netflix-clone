import React from "react";

export default function VideoInfo({ video }) {
    const { title, year, duration, genre } = video;
    return (
        <div className="space-y-2">
            <h1 className="text-3xl font-bold">{title}</h1>
            <div className="flex space-x-4 text-sm text-gray-300">
                {year && <span>{year}</span>}
                {genre && <span>{genre}</span>}
                {duration && <span>{duration}</span>}
            </div>
            <button className="mt-2 px-3 py-1 bg-blue-600 text-white rounded">
                Share
            </button>
        </div>
    );
}
