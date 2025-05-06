import { useState } from "react";
import type { ReviewsSection } from "../lib/types";

interface TitleReviewsProps {
    reviews: ReviewsSection;
}

export default function TitleReviews({ reviews }: TitleReviewsProps) {
    const [activeTab, setActiveTab] = useState<"user" | "critic">("user");

    if (!reviews || (!reviews.user.length && !reviews.critic.length)) {
        return null;
    }

    const currentReviews = activeTab === "user" ? reviews.user : reviews.critic;

    // Generate star rating display
    const renderStars = (rating: number) => {
        return (
            <div className="flex text-yellow-400">
                {Array.from({ length: 5 }).map((_, i) => (
                    <svg
                        key={i}
                        className={`w-4 h-4 ${
                            i < rating ? "text-yellow-400" : "text-gray-600"
                        }`}
                        fill="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z" />
                    </svg>
                ))}
            </div>
        );
    };

    return (
        <div>
            <h2 className="text-2xl font-medium mb-4">Reviews</h2>

            <div className="mb-6">
                <div className="flex justify-between items-center">
                    <div className="space-y-1">
                        <div className="flex items-center">
                            <div className="text-2xl font-bold mr-3">
                                {reviews.averageRating.toFixed(1)}
                            </div>
                            {renderStars(Math.round(reviews.averageRating))}
                        </div>
                        <div className="text-sm text-gray-400">
                            {reviews.totalReviews} reviews
                        </div>
                    </div>

                    <div className="flex border border-gray-700 rounded-md overflow-hidden">
                        <button
                            className={`px-4 py-2 ${
                                activeTab === "user"
                                    ? "bg-gray-700 text-white"
                                    : "bg-transparent text-gray-300 hover:bg-gray-800"
                            }`}
                            onClick={() => setActiveTab("user")}
                        >
                            User Reviews
                        </button>
                        <button
                            className={`px-4 py-2 ${
                                activeTab === "critic"
                                    ? "bg-gray-700 text-white"
                                    : "bg-transparent text-gray-300 hover:bg-gray-800"
                            }`}
                            onClick={() => setActiveTab("critic")}
                        >
                            Critic Reviews
                        </button>
                    </div>
                </div>

                <div className="flex mt-4">
                    {reviews.ratingDistribution.map((count, idx) => (
                        <div key={idx} className="flex-1 space-y-1 px-1">
                            <div className="h-24 bg-gray-800 relative">
                                <div
                                    className="absolute bottom-0 left-0 right-0 bg-gray-600"
                                    style={{
                                        height: `${
                                            (count /
                                                Math.max(
                                                    ...reviews.ratingDistribution
                                                )) *
                                            100
                                        }%`,
                                    }}
                                ></div>
                            </div>
                            <div className="text-center text-sm text-gray-400">
                                {5 - idx}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-6">
                {currentReviews.map((review) => (
                    <div
                        key={review.id}
                        className="border-b border-gray-800 pb-6"
                    >
                        <div className="flex justify-between">
                            <div className="flex items-center">
                                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-700 mr-3">
                                    <img
                                        src={
                                            review.authorImage ||
                                            "/placeholder.svg"
                                        }
                                        alt={review.author}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div>
                                    <div className="font-medium">
                                        {review.author}
                                    </div>
                                    {review.publication && (
                                        <div className="text-sm text-gray-400">
                                            {review.publication}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center space-x-2">
                                <div className="text-gray-400 text-sm">
                                    {review.date}
                                </div>
                                {renderStars(review.rating)}
                            </div>
                        </div>

                        <h4 className="font-medium mt-3">{review.title}</h4>
                        <p className="text-gray-300 mt-2 text-sm">
                            {review.content}
                        </p>

                        <div className="flex items-center text-sm mt-3 text-gray-400">
                            <button className="flex items-center hover:text-white">
                                <svg
                                    className="w-4 h-4 mr-1"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                                    />
                                </svg>
                                Helpful ({review.helpfulCount})
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-6 text-center">
                <button className="border border-gray-600 rounded-md py-2 px-4 text-sm hover:bg-gray-800">
                    See More Reviews
                </button>
            </div>
        </div>
    );
}
