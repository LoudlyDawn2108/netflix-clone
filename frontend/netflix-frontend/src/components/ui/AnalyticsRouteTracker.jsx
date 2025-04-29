import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { analytics } from "../../services/analytics";

/**
 * Component that tracks route changes and page views
 *
 * Automatically tracks page views as the user navigates through the application
 * and provides detailed navigation path data for analytics purposes.
 *
 * This component should be included once near the root of your application.
 */
const AnalyticsRouteTracker = () => {
    const location = useLocation();

    useEffect(() => {
        // Track a page view
        const trackPageView = () => {
            const pageData = {
                path: location.pathname,
                url: window.location.href,
                title: document.title,
                referrer: document.referrer,
                search: location.search,
                hash: location.hash,
                state: location.state || {},
                timestamp: Date.now(),
            };

            // Parse URL parameters
            const searchParams = new URLSearchParams(location.search);
            const queryParams = {};

            for (const [key, value] of searchParams.entries()) {
                queryParams[key] = value;
            }

            // Extract UTM parameters for campaign tracking
            const utmParams = {};
            const utmFields = [
                "utm_source",
                "utm_medium",
                "utm_campaign",
                "utm_term",
                "utm_content",
            ];

            utmFields.forEach((field) => {
                if (searchParams.has(field)) {
                    utmParams[field] = searchParams.get(field);
                }
            });

            // Track the page view event
            analytics.trackPageView({
                ...pageData,
                queryParams,
                ...(Object.keys(utmParams).length > 0 ? { utmParams } : {}),
            });

            // Track performance metrics if available
            if (window.performance && window.performance.timing) {
                setTimeout(() => {
                    const timing = window.performance.timing;
                    const perfMetrics = {
                        loadTime: timing.loadEventEnd - timing.navigationStart,
                        domReadyTime:
                            timing.domContentLoadedEventEnd -
                            timing.navigationStart,
                        firstPaintTime:
                            timing.responseEnd - timing.navigationStart,
                        ttfb: timing.responseStart - timing.navigationStart,
                    };

                    analytics.track("performance_metrics", {
                        ...pageData,
                        metrics: perfMetrics,
                    });
                }, 0);
            }

            // Track using newer Performance API metrics if available
            if (window.performance && window.performance.getEntriesByType) {
                setTimeout(() => {
                    try {
                        const paintMetrics = {};
                        const paintEntries =
                            window.performance.getEntriesByType("paint");

                        if (paintEntries.length) {
                            paintEntries.forEach((entry) => {
                                if (entry.name === "first-paint") {
                                    paintMetrics.firstPaint = entry.startTime;
                                }
                                if (entry.name === "first-contentful-paint") {
                                    paintMetrics.firstContentfulPaint =
                                        entry.startTime;
                                }
                            });

                            if (Object.keys(paintMetrics).length) {
                                analytics.track("paint_metrics", {
                                    ...pageData,
                                    metrics: paintMetrics,
                                });
                            }
                        }

                        // Track Largest Contentful Paint if available
                        const lcpObserver = new PerformanceObserver(
                            (entryList) => {
                                const entries = entryList.getEntries();
                                const lastEntry = entries[entries.length - 1];

                                analytics.track("core_web_vitals", {
                                    ...pageData,
                                    metrics: {
                                        largestContentfulPaint:
                                            lastEntry.startTime,
                                    },
                                });

                                lcpObserver.disconnect();
                            }
                        );

                        lcpObserver.observe({
                            type: "largest-contentful-paint",
                            buffered: true,
                        });

                        // Track Cumulative Layout Shift if available
                        const clsObserver = new PerformanceObserver(
                            (entryList) => {
                                let clsValue = 0;

                                for (const entry of entryList.getEntries()) {
                                    if (!entry.hadRecentInput) {
                                        clsValue += entry.value;
                                    }
                                }

                                analytics.track("core_web_vitals", {
                                    ...pageData,
                                    metrics: {
                                        cumulativeLayoutShift: clsValue,
                                    },
                                });
                            }
                        );

                        clsObserver.observe({
                            type: "layout-shift",
                            buffered: true,
                        });
                    } catch (error) {
                        // Silently fail if browser doesn't support some of these APIs
                        console.debug(
                            "Some performance metrics could not be collected",
                            error
                        );
                    }
                }, 0);
            }
        };

        // Track the page view when the location changes
        trackPageView();

        // For SPA, we also need to update document title after the component mounts
        const originalTitle = document.title;

        return () => {
            // Track navigation away from the page
            analytics.track("navigation_away", {
                from: location.pathname,
                to: null, // We don't know the next page yet
                timestamp: Date.now(),
            });

            // Restore original title if needed
            if (document.title !== originalTitle) {
                document.title = originalTitle;
            }
        };
    }, [location]);

    // This component doesn't render anything
    return null;
};

export default AnalyticsRouteTracker;
