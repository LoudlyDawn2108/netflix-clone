import React from "react";

export default function ReviewsList({ reviews }) {
    if (!reviews.length) return null;

    return (
        <div className="space-y-2">
            <h2 className="text-xl font-semibold">Reviews</h2>
            <ul className="space-y-4">
                {reviews.map((review, idx) => (
                    <li key={idx} className="bg-gray-800 p-4 rounded">
                        <p className="text-sm text-gray-300">
                            {review.content}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                            - {review.author}, {review.date}
                        </p>
                    </li>
                ))}
            </ul>
        </div>
    );
}
