import { useState } from "react";
import type { FeaturedContent } from "../lib/types";
import { Button } from "./ui/button";

interface HeroProps {
    featured: FeaturedContent;
}

export default function Hero({ featured }: HeroProps) {
    const [muted, setMuted] = useState(true);

    return (
        <div className="relative w-full h-[56.25vw] max-h-[80vh] min-h-[500px] overflow-hidden">
            {/* Background Image */}
            <div className="absolute inset-0">
                <img
                    src={featured.backdropPath || "/placeholder.svg"}
                    alt={featured.title}
                    className="object-cover w-full h-full"
                    style={{ objectPosition: "center top" }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent" />
            </div>

            {/* Content */}
            <div className="absolute inset-0 flex flex-col justify-center px-4 md:px-16 pt-20">
                <div className="max-w-2xl">
                    {featured.logoPath ? (
                        <img
                            src={featured.logoPath || "/placeholder.svg"}
                            alt={featured.title}
                            className="w-full max-w-md mb-6"
                        />
                    ) : (
                        <h1 className="text-4xl md:text-6xl font-bold mb-6">
                            {featured.title}
                        </h1>
                    )}

                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-green-500 font-semibold">
                            {featured.matchPercentage}% Match
                        </span>
                        <span className="text-gray-400">
                            {featured.releaseYear}
                        </span>
                        <span className="border border-gray-600 px-1 text-xs">
                            {featured.maturityRating}
                        </span>
                        <span className="text-gray-400">
                            {featured.duration}
                        </span>
                    </div>

                    <p className="text-lg text-gray-200 mb-6 line-clamp-3 md:line-clamp-4">
                        {featured.overview}
                    </p>

                    <div className="flex flex-wrap gap-3">
                        <Button
                            size="lg"
                            className="bg-white text-black hover:bg-white/90"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="mr-2 h-5 w-5"
                            >
                                <polygon points="5 3 19 12 5 21 5 3"></polygon>
                            </svg>
                            Play
                        </Button>
                        <Button
                            size="lg"
                            variant="secondary"
                            className="bg-gray-600/80 hover:bg-gray-600"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="mr-2 h-5 w-5"
                            >
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="16" x2="12" y2="12"></line>
                                <line x1="12" y1="8" x2="12.01" y2="8"></line>
                            </svg>
                            More Info
                        </Button>
                        <Button
                            size="icon"
                            variant="outline"
                            className="ml-auto border-gray-600 bg-black/30"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="h-5 w-5"
                            >
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                        </Button>
                        <Button
                            size="icon"
                            variant="outline"
                            className="border-gray-600 bg-black/30"
                            onClick={() => setMuted(!muted)}
                        >
                            {muted ? (
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="h-5 w-5"
                                >
                                    <line x1="1" y1="1" x2="23" y2="23"></line>
                                    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
                                    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
                                    <line
                                        x1="12"
                                        y1="19"
                                        x2="12"
                                        y2="23"
                                    ></line>
                                    <line x1="8" y1="23" x2="16" y2="23"></line>
                                </svg>
                            ) : (
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="h-5 w-5"
                                >
                                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                                </svg>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
