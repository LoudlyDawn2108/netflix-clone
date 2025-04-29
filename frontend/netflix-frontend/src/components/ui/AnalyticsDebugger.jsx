import React, { useState, useEffect, useRef } from "react";
import { analytics, eventTaxonomy } from "../../services/analytics";

/**
 * Analytics Debugger Component
 *
 * This component provides a floating UI for developers to monitor analytics events
 * in real-time during local development. It's automatically disabled in production.
 *
 * Features:
 * - Shows real-time event stream
 * - Validates events against taxonomy
 * - Allows filtering by event type
 * - Can be toggled with keyboard shortcut (Shift+Alt+D)
 */
const AnalyticsDebugger = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [events, setEvents] = useState([]);
    const [filter, setFilter] = useState("");
    const [activeTab, setActiveTab] = useState("events");
    const [position, setPosition] = useState({ right: 20, bottom: 20 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const debuggerRef = useRef(null);
    const eventsEndRef = useRef(null);

    // Only show in development
    const isDev = process.env.NODE_ENV === "development";

    useEffect(() => {
        if (!isDev) return;

        // Set up keyboard shortcut (Shift+Alt+D)
        const handleKeyDown = (event) => {
            if (event.shiftKey && event.altKey && event.key === "D") {
                setIsVisible((prevState) => !prevState);
            }
        };

        // Override the track method to capture events
        const originalTrack = analytics.track;
        analytics.track = (eventName, properties = {}) => {
            // Call the original method
            const result = originalTrack.call(analytics, eventName, properties);

            // Add to our events list with validation status
            const isValid = eventTaxonomy.isValidEvent(eventName);
            setEvents((prevEvents) => [
                {
                    id: Date.now(),
                    timestamp: new Date().toISOString(),
                    name: eventName,
                    properties,
                    isValid,
                },
                ...prevEvents.slice(0, 99), // Keep last 100 events
            ]);

            return result;
        };

        // Set up listeners
        window.addEventListener("keydown", handleKeyDown);

        // Clean up
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            analytics.track = originalTrack;
        };
    }, [isDev]);

    // Scroll to bottom when new events arrive
    useEffect(() => {
        if (activeTab === "events" && eventsEndRef.current) {
            eventsEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [events, activeTab]);

    // Handle dragging
    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e) => {
            setPosition({
                right: window.innerWidth - e.clientX - dragOffset.x,
                bottom: window.innerHeight - e.clientY - dragOffset.y,
            });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);

        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isDragging, dragOffset]);

    const handleMouseDown = (e) => {
        if (debuggerRef.current) {
            const rect = debuggerRef.current.getBoundingClientRect();
            setDragOffset({
                x:
                    window.innerWidth -
                    rect.right -
                    position.right +
                    (e.clientX - rect.left),
                y:
                    window.innerHeight -
                    rect.bottom -
                    position.bottom +
                    (e.clientY - rect.top),
            });
        }
        setIsDragging(true);
        e.preventDefault();
    };

    // Filter events by search term
    const filteredEvents = events.filter((event) => {
        if (!filter) return true;
        return (
            event.name.toLowerCase().includes(filter.toLowerCase()) ||
            JSON.stringify(event.properties)
                .toLowerCase()
                .includes(filter.toLowerCase())
        );
    });

    if (!isDev || !isVisible) return null;

    return (
        <div
            ref={debuggerRef}
            className="fixed z-50 bg-gray-900 border border-gray-700 shadow-lg rounded-lg overflow-hidden"
            style={{
                right: `${position.right}px`,
                bottom: `${position.bottom}px`,
                width: "400px",
                maxHeight: "500px",
                minHeight: "300px",
                resize: "both",
            }}
        >
            {/* Header */}
            <div
                className="p-2 bg-gray-800 text-gray-100 flex items-center justify-between cursor-move"
                onMouseDown={handleMouseDown}
            >
                <div className="flex items-center">
                    <span className="text-sm font-medium">
                        Analytics Debugger
                    </span>
                    <div className="ml-2 px-2 py-0.5 bg-red-600 rounded text-xs">
                        DEV
                    </div>
                </div>
                <div className="flex gap-1">
                    <button
                        className="text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-700 transition"
                        onClick={() => setEvents([])}
                    >
                        Clear
                    </button>
                    <button
                        className="text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-700 transition"
                        onClick={() => setIsVisible(false)}
                    >
                        ✕
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-700">
                <button
                    className={`px-4 py-2 text-sm ${activeTab === "events" ? "text-white border-b-2 border-red-500" : "text-gray-400"}`}
                    onClick={() => setActiveTab("events")}
                >
                    Events
                </button>
                <button
                    className={`px-4 py-2 text-sm ${activeTab === "taxonomy" ? "text-white border-b-2 border-red-500" : "text-gray-400"}`}
                    onClick={() => setActiveTab("taxonomy")}
                >
                    Taxonomy
                </button>
            </div>

            {/* Search bar */}
            {activeTab === "events" && (
                <div className="p-2 border-b border-gray-700 bg-gray-800">
                    <input
                        type="text"
                        placeholder="Filter events..."
                        className="w-full p-2 text-sm bg-gray-700 border border-gray-600 rounded text-white"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    />
                    <div className="mt-1 text-xs text-gray-400">
                        {filteredEvents.length} of {events.length} events
                    </div>
                </div>
            )}

            {/* Event List Tab */}
            {activeTab === "events" && (
                <div
                    className="overflow-y-auto h-64 bg-gray-850"
                    style={{ height: "calc(100% - 110px)" }}
                >
                    {filteredEvents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
                            <p className="text-center">
                                No events recorded yet.
                            </p>
                            <p className="text-center text-sm mt-2">
                                Interact with the app to see analytics events
                                here.
                            </p>
                        </div>
                    ) : (
                        filteredEvents.map((event) => (
                            <div
                                key={event.id}
                                className="border-b border-gray-700 p-3 hover:bg-gray-800"
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <div className="font-medium text-gray-100">
                                        {event.name}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {!event.isValid && (
                                            <span className="bg-amber-800 text-amber-200 text-xs px-1.5 py-0.5 rounded">
                                                Invalid
                                            </span>
                                        )}
                                        <span className="text-xs text-gray-400">
                                            {new Date(
                                                event.timestamp
                                            ).toLocaleTimeString()}
                                        </span>
                                    </div>
                                </div>
                                <pre className="text-xs bg-gray-900 p-2 rounded overflow-x-auto text-gray-300 max-h-32">
                                    {JSON.stringify(event.properties, null, 2)}
                                </pre>
                            </div>
                        ))
                    )}
                    <div ref={eventsEndRef} />
                </div>
            )}

            {/* Taxonomy Reference Tab */}
            {activeTab === "taxonomy" && (
                <div
                    className="overflow-y-auto h-64 bg-gray-850 p-3"
                    style={{ height: "calc(100% - 74px)" }}
                >
                    <h3 className="font-medium text-white mb-2">
                        Event Categories
                    </h3>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                        {Object.entries(eventTaxonomy.EVENT_CATEGORIES).map(
                            ([key, value]) => (
                                <div
                                    key={key}
                                    className="bg-gray-800 p-2 rounded"
                                >
                                    <span className="text-gray-400 text-xs">
                                        {key}
                                    </span>
                                    <div className="text-sm text-white font-mono">
                                        {value}
                                    </div>
                                </div>
                            )
                        )}
                    </div>

                    <h3 className="font-medium text-white mb-2 mt-4">
                        Usage Examples
                    </h3>
                    <div className="bg-gray-800 p-3 rounded mb-3">
                        <div className="text-sm font-medium text-gray-300 mb-1">
                            Hook Usage
                        </div>
                        <pre className="text-xs overflow-x-auto text-gray-300">
                            {`const { trackVideoPlay } = useTracking();\ntrackVideoPlay(videoId, { quality: 'hd' });`}
                        </pre>
                    </div>

                    <div className="bg-gray-800 p-3 rounded">
                        <div className="text-sm font-medium text-gray-300 mb-1">
                            HOC Usage
                        </div>
                        <pre className="text-xs overflow-x-auto text-gray-300">
                            {`this.props.trackEvent('video_play', { videoId });\nthis.props.trackElement(e, 'click');`}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnalyticsDebugger;
