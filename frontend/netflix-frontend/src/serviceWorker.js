// Service Worker configuration for Netflix Clone
// This enables offline functionality and improved performance

// Cache names for different types of assets
const CACHE_NAMES = {
    static: "static-v1",
    dynamic: "dynamic-v1",
    api: "api-v1",
};

// Assets to cache on install (static cache)
const STATIC_ASSETS = [
    "/",
    "/index.html",
    "/offline.html",
    "/manifest.json",
    "/src/main.jsx",
    "/src/App.jsx",
    "/src/index.css",
    "/src/assets/images/default-avatar.png",
    // Add other critical static assets here
];

// Install event - cache static assets
self.addEventListener("install", (event) => {
    console.log("[Service Worker] Installing Service Worker");

    // Skip waiting to ensure the new service worker activates immediately
    self.skipWaiting();

    // Cache static assets
    event.waitUntil(
        caches.open(CACHE_NAMES.static).then((cache) => {
            console.log("[Service Worker] Precaching App Shell");
            return cache.addAll(STATIC_ASSETS);
        })
    );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
    console.log("[Service Worker] Activating Service Worker");

    // Clean up old caches
    event.waitUntil(
        caches
            .keys()
            .then((keyList) => {
                return Promise.all(
                    keyList.map((key) => {
                        // If the key doesn't match our current cache names, delete it
                        if (!Object.values(CACHE_NAMES).includes(key)) {
                            console.log(
                                "[Service Worker] Removing old cache",
                                key
                            );
                            return caches.delete(key);
                        }
                        return Promise.resolve();
                    })
                );
            })
            .then(() => {
                console.log("[Service Worker] Claiming clients");
                return self.clients.claim();
            })
    );
});

// API endpoints to cache
const API_ENDPOINTS = [
    // Cache homepage data for offline access
    { url: "/api/v1/videos", strategy: "staleWhileRevalidate" },
    { url: "/api/v1/videos/featured", strategy: "staleWhileRevalidate" },
    // Cache plans data for offline access
    { url: "/api/v1/plans", strategy: "staleWhileRevalidate" },
    // Cache user profile and watchlist for offline access
    { url: "/api/v1/profiles/", strategy: "networkFirst" },
    { url: "/api/v1/profiles/watchlist", strategy: "networkFirst" },
    // Don't cache sensitive data
    { url: "/api/v1/auth", strategy: "networkOnly" },
];

// Fetch event - handle network requests
self.addEventListener("fetch", (event) => {
    const url = new URL(event.request.url);

    // Don't cache browser-sync websocket connections during development
    if (url.pathname.includes("/browser-sync/")) {
        return;
    }

    // Handle API requests
    if (url.pathname.startsWith("/api/")) {
        const apiEndpoint = API_ENDPOINTS.find((endpoint) =>
            url.pathname.includes(endpoint.url)
        );

        if (apiEndpoint) {
            switch (apiEndpoint.strategy) {
                case "staleWhileRevalidate":
                    event.respondWith(staleWhileRevalidate(event.request));
                    break;
                case "networkFirst":
                    event.respondWith(networkFirst(event.request));
                    break;
                case "networkOnly":
                    // Don't cache, go to network
                    return;
                default:
                    // Default to network first
                    event.respondWith(networkFirst(event.request));
            }
            return;
        }
    }

    // For non-API requests, use cache first for static assets, network first for everything else
    if (event.request.method === "GET") {
        // HTML files - use network first
        if (event.request.headers.get("accept")?.includes("text/html")) {
            event.respondWith(networkFirstWithOfflineFallback(event.request));
        }
        // Images, CSS, JS - use cache first
        else if (
            url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|gif)$/) ||
            STATIC_ASSETS.includes(url.pathname)
        ) {
            event.respondWith(cacheFirst(event.request));
        }
        // Everything else - use network first
        else {
            event.respondWith(networkFirst(event.request));
        }
    }
});

// Cache First strategy - good for static assets
async function cacheFirst(request) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }

    try {
        const networkResponse = await fetch(request);
        // Only cache valid responses
        if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
        }
        // Cache the new response
        const cache = await caches.open(CACHE_NAMES.static);
        cache.put(request, networkResponse.clone());
        return networkResponse;
    } catch (err) {
        console.error("[Service Worker] Fetch failed:", err);
        // If offline and not in cache, could return a fallback here
    }
}

// Network First strategy - good for dynamic content that changes often
async function networkFirst(request) {
    try {
        // Try network first
        const networkResponse = await fetch(request);
        // Only cache valid GET responses
        if (
            request.method === "GET" &&
            networkResponse &&
            networkResponse.status === 200
        ) {
            const cache = await caches.open(CACHE_NAMES.dynamic);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (err) {
        console.log(
            "[Service Worker] Fetch failed; falling back to cache",
            err
        );
        // If network fails, try from cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        // If both network and cache fail, could return a fallback
    }
}

// Network First with Offline Fallback - provide offline page when network fails for HTML requests
async function networkFirstWithOfflineFallback(request) {
    try {
        // Try network first
        const networkResponse = await fetch(request);
        // Cache successful responses
        if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(CACHE_NAMES.dynamic);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (err) {
        console.log(
            "[Service Worker] Fetch failed; falling back to cache",
            err
        );

        // Try from cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        // If not in cache, return the offline page
        console.log("[Service Worker] Serving offline fallback page");
        return caches.match("/offline.html");
    }
}

// Stale While Revalidate - good for content that can be slightly outdated
async function staleWhileRevalidate(request) {
    // Try from cache
    const cachedResponse = await caches.match(request);

    // Fetch from network and update cache in the background
    const fetchAndCachePromise = fetch(request)
        .then((networkResponse) => {
            // Only cache valid GET responses
            if (
                request.method === "GET" &&
                networkResponse &&
                networkResponse.status === 200
            ) {
                const cache = caches.open(CACHE_NAMES.api);
                cache.then((cache) => {
                    cache.put(request, networkResponse.clone());
                });
            }
            return networkResponse;
        })
        .catch((err) => {
            console.error("[Service Worker] Fetch failed:", err);
        });

    // Return the cached response immediately, or wait for the network response
    return cachedResponse || fetchAndCachePromise;
}

// Handle messages from the client
self.addEventListener("message", (event) => {
    if (event.data && event.data.type === "SKIP_WAITING") {
        self.skipWaiting();
    }
});
