import { useState } from "react";

export default function Description({ text }) {
    const [expanded, setExpanded] = useState(false);
    const limit = 200;
    const isLong = text.length > limit;
    const displayText =
        !expanded && isLong ? text.slice(0, limit) + "..." : text;

    return (
        <div className="space-y-2">
            <h2 className="text-xl font-semibold">Description</h2>
            <p className="text-gray-300">{displayText}</p>
            {isLong && (
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="text-blue-500"
                >
                    {expanded ? "Show Less" : "Show More"}
                </button>
            )}
        </div>
    );
}
