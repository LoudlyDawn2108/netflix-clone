// This utility file helps with the service worker registration process

// Register the service worker
export function register() {
    // Check if service workers are supported in the browser
    if ("serviceWorker" in navigator) {
        // Wait until window is loaded to register, to avoid affecting page load performance
        window.addEventListener("load", () => {
            // The service worker URL (relative to the public path)
            const swUrl = `/serviceWorker.js`;

            registerValidSW(swUrl);
        });
    }
}

// Register valid service worker
function registerValidSW(swUrl) {
    navigator.serviceWorker
        .register(swUrl)
        .then((registration) => {
            console.log(
                "Service Worker registered with scope:",
                registration.scope
            );

            // Check for updates when the page loads
            registration.addEventListener("updatefound", () => {
                const installingWorker = registration.installing;
                if (installingWorker == null) {
                    return;
                }

                installingWorker.addEventListener("statechange", () => {
                    if (installingWorker.state === "installed") {
                        if (navigator.serviceWorker.controller) {
                            // At this point, the updated service worker has been installed,
                            // but the previous service worker is still active.
                            console.log(
                                "New content is available; please refresh."
                            );

                            // Display update notification to user
                            if (
                                window.confirm(
                                    "New version available! Update now?"
                                )
                            ) {
                                // Skip waiting and reload the page to use the new service worker
                                registration.waiting.postMessage({
                                    type: "SKIP_WAITING",
                                });
                                window.location.reload();
                            }
                        } else {
                            // At this point, everything has been cached for offline use.
                            console.log("Content is cached for offline use.");
                        }
                    }
                });
            });
        })
        .catch((error) => {
            console.error("Error during service worker registration:", error);
        });
}

// Unregister service worker
export function unregister() {
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.ready
            .then((registration) => {
                registration.unregister();
            })
            .catch((error) => {
                console.error("Error unregistering service worker:", error);
            });
    }
}

// Check if updates are available and prompt user to update
export function checkForUpdates() {
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.ready
            .then((registration) => {
                // Check for updates
                registration.update();
            })
            .catch((error) => {
                console.error(
                    "Error checking for service worker updates:",
                    error
                );
            });
    }
}
