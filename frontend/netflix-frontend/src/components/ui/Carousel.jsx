import { useState, useEffect, useRef, useCallback } from "react";

export default function Carousel({
    items,
    renderItem,
    autoSlide = true,
    interval = 5000,
    showIndicators = true,
    showControls = true,
    slideGap = 4,
    itemsPerSlide = { sm: 1, md: 2, lg: 3, xl: 4 },
}) {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);
    const [isPaused, setIsPaused] = useState(false);
    const carouselRef = useRef(null);
    const autoplayIntervalRef = useRef(null);

    // Calculate visible items based on screen size
    const getVisibleItems = useCallback(() => {
        if (window.innerWidth >= 1280) return itemsPerSlide.xl;
        if (window.innerWidth >= 1024) return itemsPerSlide.lg;
        if (window.innerWidth >= 768) return itemsPerSlide.md;
        return itemsPerSlide.sm;
    }, [itemsPerSlide]);

    const [visibleItems, setVisibleItems] = useState(getVisibleItems());

    // Calculate max slides
    const maxSlides = Math.max(
        1,
        Math.ceil((items?.length || 0) / visibleItems)
    );

    // Update visible items on resize
    useEffect(() => {
        const handleResize = () => {
            setVisibleItems(getVisibleItems());
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [getVisibleItems]);

    // Auto slide functionality
    useEffect(() => {
        if (!autoSlide || isPaused || !items?.length) return;

        autoplayIntervalRef.current = setInterval(() => {
            setCurrentSlide((prevSlide) => (prevSlide + 1) % maxSlides);
        }, interval);

        return () => {
            if (autoplayIntervalRef.current) {
                clearInterval(autoplayIntervalRef.current);
            }
        };
    }, [autoSlide, isPaused, interval, maxSlides, items?.length]);

    // Handle next/prev navigation
    const nextSlide = useCallback(() => {
        setCurrentSlide((prevSlide) => (prevSlide + 1) % maxSlides);
    }, [maxSlides]);

    const prevSlide = useCallback(() => {
        setCurrentSlide((prevSlide) => (prevSlide - 1 + maxSlides) % maxSlides);
    }, [maxSlides]);

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (document.activeElement !== carouselRef.current) return;

            if (e.key === "ArrowLeft") {
                prevSlide();
            } else if (e.key === "ArrowRight") {
                nextSlide();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [nextSlide, prevSlide]);

    // Handle touch events for swipe
    const handleTouchStart = (e) => {
        setIsPaused(true);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const handleTouchMove = (e) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const handleTouchEnd = () => {
        setIsPaused(false);
        if (!touchStart || !touchEnd) return;

        const distance = touchStart - touchEnd;
        const isSignificantMove = Math.abs(distance) > 50;

        if (isSignificantMove) {
            if (distance > 0) {
                nextSlide();
            } else {
                prevSlide();
            }
        }

        setTouchStart(null);
        setTouchEnd(null);
    };

    // If no items, return placeholder or nothing
    if (!items || items.length === 0) {
        return (
            <div className="flex justify-center items-center h-32 bg-gray-800 rounded-lg">
                <p className="text-gray-400">No items to display</p>
            </div>
        );
    }

    // Calculate which items to show
    const startIdx = currentSlide * visibleItems;
    const visibleItemsArray = items.slice(startIdx, startIdx + visibleItems);

    // Pad with empty slots if needed for last page
    while (visibleItemsArray.length < visibleItems) {
        visibleItemsArray.push(null);
    }

    return (
        <div
            className="relative w-full"
            ref={carouselRef}
            tabIndex={0}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            aria-roledescription="carousel"
            aria-label="Content carousel"
        >
            {/* Slides container */}
            <div
                className={`flex transition-transform duration-300 ease-in-out gap-${slideGap}`}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{ transform: `translateX(0)` }}
                aria-live="polite"
            >
                {visibleItemsArray.map((item, index) => (
                    <div
                        key={`slide-${startIdx + index}`}
                        className={`flex-grow min-w-0 ${item ? "" : "invisible"}`}
                        style={{
                            flex: `0 0 calc((100% - (${visibleItems - 1}) * ${slideGap / 4}rem) / ${visibleItems})`,
                        }}
                    >
                        {item && renderItem(item, startIdx + index)}
                    </div>
                ))}
            </div>

            {/* Navigation controls */}
            {showControls && items.length > visibleItems && (
                <>
                    <button
                        className="absolute left-0 top-1/2 -translate-y-1/2 bg-black bg-opacity-60 hover:bg-opacity-80 text-white p-3 rounded-full z-10 transform -translate-x-1/2"
                        onClick={prevSlide}
                        aria-label="Previous slide"
                        disabled={currentSlide === 0 && !autoSlide}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 19l-7-7 7-7"
                            />
                        </svg>
                    </button>
                    <button
                        className="absolute right-0 top-1/2 -translate-y-1/2 bg-black bg-opacity-60 hover:bg-opacity-80 text-white p-3 rounded-full z-10 transform translate-x-1/2"
                        onClick={nextSlide}
                        aria-label="Next slide"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                            />
                        </svg>
                    </button>
                </>
            )}

            {/* Slide indicators */}
            {showIndicators && maxSlides > 1 && (
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-2">
                    {[...Array(maxSlides)].map((_, index) => (
                        <button
                            key={`indicator-${index}`}
                            className={`h-2 rounded-full transition-all ${
                                index === currentSlide
                                    ? "w-8 bg-blue-500"
                                    : "w-2 bg-gray-400"
                            }`}
                            onClick={() => setCurrentSlide(index)}
                            aria-label={`Go to slide ${index + 1}`}
                            aria-current={index === currentSlide}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
