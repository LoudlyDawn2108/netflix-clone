/**
 * Analytics Service
 *
 * A central service for tracking user events across the application.
 * Supports multiple analytics providers, event batching, and privacy controls.
 */

import eventTaxonomy, {
    isValidEvent,
    STANDARD_PROPERTIES,
} from "./analytics/eventTaxonomy";
import userSessionManager from "./analytics/userSessionManager";

// Provider interfaces for different analytics services
const PROVIDERS = {
    GOOGLE_ANALYTICS: "google_analytics",
    MIXPANEL: "mixpanel",
    CUSTOM: "custom_backend",
};

// Default configuration
const DEFAULT_CONFIG = {
    batchSize: 10, // Number of events to batch before sending
    batchInterval: 2000, // Flush events every 2 seconds
    retryAttempts: 3, // Number of retry attempts for failed submissions
    retryDelay: 1000, // Base delay between retries (will be multiplied by attempt #)
    privacyEnabled: true, // Enable privacy controls by default
    providers: [PROVIDERS.CUSTOM], // Default to custom backend only
    debug: false, // Debug mode for local development
    endpoint: "/api/v1/events", // Default endpoint for custom backend
    validateEvents: true, // Validate events against taxonomy
};

class AnalyticsService {
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.eventQueue = [];
        this.isSending = false;
        this.retryTimeouts = {};
        this.batchIntervalId = null;
        this.userConsent = this.loadConsentSettings();
        this.anonymousId = this.getAnonymousId();
        this.userId = null;
        this.sessionId = null;
        this.initialized = false;

        // Provider instances will be stored here
        this.providerInstances = {};

        // Event taxonomy
        this.eventTaxonomy = eventTaxonomy;

        // User session manager
        this.sessionManager = userSessionManager;
    }

    /**
     * Initialize the analytics service
     */
    init() {
        if (this.initialized) return;

        // Initialize session manager first
        this.sessionManager.init();

        // Setup providers
        this.setupProviders();
        this.setupBatchProcessing();

        this.initialized = true;

        // Track initial page view
        if (typeof window !== "undefined") {
            this.trackPageView(window.location.pathname);
        }

        if (this.config.debug) {
            console.info(
                "Analytics service initialized with config:",
                this.config
            );
        }
    }

    /**
     * Set up configured analytics providers
     */
    setupProviders() {
        this.config.providers.forEach((provider) => {
            switch (provider) {
                case PROVIDERS.GOOGLE_ANALYTICS:
                    // Initialize Google Analytics (would typically load script)
                    if (this.config.debug)
                        console.info("Setting up Google Analytics provider");
                    break;

                case PROVIDERS.MIXPANEL:
                    // Initialize Mixpanel (would typically load script)
                    if (this.config.debug)
                        console.info("Setting up Mixpanel provider");
                    break;

                case PROVIDERS.CUSTOM:
                    // Custom backend doesn't require initialization, just endpoint config
                    if (this.config.debug)
                        console.info("Setting up Custom backend provider");
                    break;

                default:
                    console.warn(`Unknown analytics provider: ${provider}`);
            }
        });
    }

    /**
     * Set up batch processing interval
     */
    setupBatchProcessing() {
        // Clear any existing interval
        if (this.batchIntervalId) {
            clearInterval(this.batchIntervalId);
        }

        // Set up interval to process events
        this.batchIntervalId = setInterval(() => {
            this.processQueue();
        }, this.config.batchInterval);
    }

    /**
     * Process the event queue and send to providers
     */
    async processQueue() {
        if (this.eventQueue.length === 0 || this.isSending) return;

        try {
            this.isSending = true;

            // Take events up to batch size
            const eventsToProcess = this.eventQueue.splice(
                0,
                this.config.batchSize
            );

            if (eventsToProcess.length === 0) return;

            // Send events to each provider
            await Promise.all(
                this.config.providers.map((provider) => {
                    return this.sendToProvider(provider, eventsToProcess);
                })
            );
        } catch (error) {
            if (this.config.debug) {
                console.error("Error processing analytics queue:", error);
            }
        } finally {
            this.isSending = false;

            // If there are more events, process again
            if (this.eventQueue.length >= this.config.batchSize) {
                this.processQueue();
            }
        }
    }

    /**
     * Send events to a specific provider with retry logic
     */
    async sendToProvider(provider, events) {
        // Skip if user hasn't given consent for this provider
        if (!this.hasProviderConsent(provider)) {
            if (this.config.debug) {
                console.info(`Skipping ${provider} due to consent settings`);
            }
            return;
        }

        try {
            switch (provider) {
                case PROVIDERS.GOOGLE_ANALYTICS:
                    // Send to Google Analytics
                    await this.sendToGoogleAnalytics(events);
                    break;

                case PROVIDERS.MIXPANEL:
                    // Send to Mixpanel
                    await this.sendToMixpanel(events);
                    break;

                case PROVIDERS.CUSTOM:
                    // Send to custom backend
                    await this.sendToCustomBackend(events);
                    break;

                default:
                    console.warn(`Unknown analytics provider: ${provider}`);
            }
        } catch (error) {
            // Implement retry logic
            this.scheduleRetry(provider, events, 0);
            if (this.config.debug) {
                console.error(`Error sending to ${provider}:`, error);
            }
        }
    }

    /**
     * Retry sending events with exponential backoff
     */
    scheduleRetry(provider, events, attempt) {
        if (attempt >= this.config.retryAttempts) {
            if (this.config.debug) {
                console.warn(`Max retries exceeded for ${provider}`);
            }
            return;
        }

        const retryKey = `${provider}-${Date.now()}`;
        const delay = this.config.retryDelay * Math.pow(2, attempt);

        this.retryTimeouts[retryKey] = setTimeout(async () => {
            try {
                await this.sendToProvider(provider, events);
                delete this.retryTimeouts[retryKey];

                if (this.config.debug) {
                    console.info(
                        `Retry ${attempt + 1} successful for ${provider}`
                    );
                }
            } catch (error) {
                this.scheduleRetry(provider, events, attempt + 1);

                if (this.config.debug) {
                    console.warn(
                        `Retry ${attempt + 1} failed for ${provider}, scheduling next retry`
                    );
                }
            }
        }, delay);
    }

    /**
     * Send events to Google Analytics
     */
    async sendToGoogleAnalytics(events) {
        // Implementation would depend on GA4 setup
        if (this.config.debug) {
            console.info("Sending to Google Analytics:", events);
        }

        // Placeholder for actual implementation
        return Promise.resolve();
    }

    /**
     * Send events to Mixpanel
     */
    async sendToMixpanel(events) {
        // Implementation would depend on Mixpanel setup
        if (this.config.debug) {
            console.info("Sending to Mixpanel:", events);
        }

        // Placeholder for actual implementation
        return Promise.resolve();
    }

    /**
     * Send events to custom backend
     */
    async sendToCustomBackend(events) {
        if (this.config.debug) {
            console.info("Sending to custom backend:", events);
        }

        try {
            const response = await fetch(this.config.endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${this.getAuthToken()}`,
                },
                body: JSON.stringify({
                    events,
                    sessionId: this.sessionId,
                    timestamp: Date.now(),
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            if (this.config.debug) {
                console.error("Error sending to custom backend:", error);
            }
            throw error; // Re-throw to trigger retry logic
        }
    }

    /**
     * Get auth token for API requests
     */
    getAuthToken() {
        // Implementation would depend on your auth service
        // This is a placeholder - integrate with your auth service
        try {
            return localStorage.getItem("auth_token") || null;
        } catch (e) {
            return null;
        }
    }

    /**
     * Track an event
     *
     * @param {String} eventName - Name of the event
     * @param {Object} properties - Event properties
     * @returns {Boolean} - Whether the event was queued
     */
    track(eventName, properties = {}) {
        if (!this.initialized) {
            this.init();
        }

        // Skip if all tracking is disabled
        if (this.userConsent.doNotTrack) {
            if (this.config.debug) {
                console.info("Tracking disabled by user consent settings");
            }
            return false;
        }

        // Validate event against taxonomy if validation is enabled
        if (this.config.validateEvents && !isValidEvent(eventName)) {
            if (this.config.debug) {
                console.warn(
                    `Event "${eventName}" does not follow the defined taxonomy. ` +
                        `Please use the event constants from eventTaxonomy.js`
                );
            }
        }

        // Make sure we have a valid session
        if (this.sessionManager.currentSession) {
            this.sessionManager.extendSession();
        } else {
            this.sessionManager.startSession();
        }

        const event = this.buildEvent(eventName, properties);
        this.eventQueue.push(event);

        if (this.config.debug) {
            console.info("Analytics event queued:", event);
        }

        // If we've reached batch size, process immediately
        if (
            this.eventQueue.length >= this.config.batchSize &&
            !this.isSending
        ) {
            this.processQueue();
        }

        return true;
    }

    // Track user interaction events
    trackInteraction(action, elementData = {}, additionalProps = {}) {
        const { ELEMENT_ID, ELEMENT_TYPE, ELEMENT_TEXT, SCREEN_NAME } =
            STANDARD_PROPERTIES.UI;

        return this.track(`user_interaction_${action}`, {
            [ELEMENT_ID]: elementData.id,
            [ELEMENT_TYPE]: elementData.type || "unknown",
            [ELEMENT_TEXT]: elementData.text,
            [SCREEN_NAME]: elementData.screen || window.location.pathname,
            ...additionalProps,
        });
    }

    // Track click events with standardized properties
    trackClick(elementData, additionalProps = {}) {
        return this.trackInteraction("click", elementData, additionalProps);
    }

    /**
     * Track page view
     *
     * @param {String} path - Page path
     * @param {Object} properties - Additional properties
     */
    trackPageView(path, properties = {}) {
        const { PAGE_VIEW } = this.eventTaxonomy.NAVIGATION_EVENTS;

        this.track(`navigation_${PAGE_VIEW}`, {
            path,
            title: document.title,
            referrer: document.referrer,
            ...properties,
        });
    }

    /**
     * Track video play event
     */
    trackVideoPlay(videoId, properties = {}) {
        const { PLAY } = this.eventTaxonomy.PLAYBACK_EVENTS;
        const { VIDEO_ID } = STANDARD_PROPERTIES.VIDEO;

        this.track(`playback_${PLAY}`, {
            [VIDEO_ID]: videoId,
            ...properties,
        });
    }

    /**
     * Track video pause event
     */
    trackVideoPause(videoId, position, properties = {}) {
        const { PAUSE } = this.eventTaxonomy.PLAYBACK_EVENTS;
        const { VIDEO_ID, POSITION } = STANDARD_PROPERTIES.VIDEO;

        this.track(`playback_${PAUSE}`, {
            [VIDEO_ID]: videoId,
            [POSITION]: position, // Position in seconds
            ...properties,
        });
    }

    /**
     * Track video complete event
     */
    trackVideoComplete(videoId, properties = {}) {
        const { COMPLETE } = this.eventTaxonomy.PLAYBACK_EVENTS;
        const { VIDEO_ID } = STANDARD_PROPERTIES.VIDEO;

        this.track(`playback_${COMPLETE}`, {
            [VIDEO_ID]: videoId,
            ...properties,
        });
    }

    /**
     * Track video seek event
     */
    trackVideoSeek(videoId, fromPosition, toPosition, properties = {}) {
        const { SEEK } = this.eventTaxonomy.PLAYBACK_EVENTS;
        const { VIDEO_ID } = STANDARD_PROPERTIES.VIDEO;

        this.track(`playback_${SEEK}`, {
            [VIDEO_ID]: videoId,
            from_position: fromPosition,
            to_position: toPosition,
            ...properties,
        });
    }

    /**
     * Track search event
     */
    trackSearch(query, resultCount, properties = {}) {
        const { SEARCH_START } = this.eventTaxonomy.SEARCH_EVENTS;

        this.track(`search_${SEARCH_START}`, {
            query,
            result_count: resultCount,
            ...properties,
        });
    }

    /**
     * Track search result click
     */
    trackSearchResultClick(query, videoId, position, properties = {}) {
        const { SEARCH_RESULT_CLICK } = this.eventTaxonomy.SEARCH_EVENTS;
        const { VIDEO_ID } = STANDARD_PROPERTIES.VIDEO;

        this.track(`search_${SEARCH_RESULT_CLICK}`, {
            query,
            [VIDEO_ID]: videoId,
            position,
            ...properties,
        });
    }

    /**
     * Track content interactions like adding to watchlist
     */
    trackContentAction(action, videoId, properties = {}) {
        const { VIDEO_ID } = STANDARD_PROPERTIES.VIDEO;

        this.track(`content_${action}`, {
            [VIDEO_ID]: videoId,
            ...properties,
        });
    }

    /**
     * Track conversion events like signup or subscription changes
     */
    trackConversion(action, properties = {}) {
        this.track(`conversion_${action}`, properties);
    }

    /**
     * Track error events
     */
    trackError(errorType, errorDetails = {}, properties = {}) {
        const { ERROR_CODE, ERROR_MESSAGE, ERROR_TYPE } =
            STANDARD_PROPERTIES.ERROR;

        this.track(`error_${errorType}`, {
            [ERROR_TYPE]: errorType,
            [ERROR_CODE]: errorDetails.code,
            [ERROR_MESSAGE]: errorDetails.message,
            ...properties,
        });
    }

    /**
     * Track system events
     */
    trackSystemEvent(action, properties = {}) {
        this.track(`system_${action}`, {
            ...properties,
            timestamp: Date.now(),
            user_agent: navigator.userAgent,
        });
    }

    /**
     * Track engagement metrics
     */
    trackEngagement(action, properties = {}) {
        this.track(`engagement_${action}`, properties);
    }

    /**
     * Build standardized event object
     */
    buildEvent(eventName, properties = {}) {
        const timestamp = Date.now();
        const { doNotTrack, anonymizeIp } = this.userConsent;

        // Get current session from session manager
        const sessionId = this.sessionManager.getSessionId();

        // Get user device/system info
        const systemInfo = this.getSystemInfo();

        // Get user traits that are safe to send
        const userTraits = this.sessionManager.getFilteredUserTraits();

        // Base event with standard fields
        const event = {
            event: eventName,
            timestamp,
            sessionId: sessionId || this.sessionId,
            anonymousId: this.anonymousId,
            properties: {
                ...properties,
                url: window.location.href,
                path: window.location.pathname,
            },
        };

        // Add userId if we have it and privacy settings allow
        if (this.userId && !doNotTrack) {
            event.userId = this.userId;
        }

        // If the session manager has user traits, add them
        if (userTraits && Object.keys(userTraits).length > 0) {
            event.userTraits = userTraits;
        }

        // Handle IP anonymization
        if (anonymizeIp) {
            event.anonymizeIp = true;
        }

        // Add system info
        event.properties = {
            ...event.properties,
            ...systemInfo,
        };

        // Get UTM parameters if available
        const utmParams = this.getUtmParameters();
        if (Object.keys(utmParams).length > 0) {
            event.properties.utm = utmParams;
        }

        return event;
    }

    /**
     * Get system information for event context
     */
    getSystemInfo() {
        const {
            APP_VERSION,
            OS_NAME,
            BROWSER_NAME,
            BROWSER_VERSION,
            DEVICE_TYPE,
            SCREEN_RESOLUTION,
            VIEWPORT_SIZE,
            LANGUAGE,
        } = STANDARD_PROPERTIES.SYSTEM;

        // Extract browser and OS information
        const userAgent = navigator.userAgent;
        let browserName = "unknown";
        let browserVersion = "unknown";
        let osName = "unknown";

        // Simple detection - this would be more sophisticated in production
        if (userAgent.includes("Firefox/")) {
            browserName = "Firefox";
            browserVersion =
                userAgent.match(/Firefox\/([\d.]+)/)?.[1] || "unknown";
        } else if (userAgent.includes("Chrome/")) {
            browserName = "Chrome";
            browserVersion =
                userAgent.match(/Chrome\/([\d.]+)/)?.[1] || "unknown";
        } else if (
            userAgent.includes("Safari/") &&
            !userAgent.includes("Chrome/")
        ) {
            browserName = "Safari";
            browserVersion =
                userAgent.match(/Version\/([\d.]+)/)?.[1] || "unknown";
        } else if (userAgent.includes("Edg/")) {
            browserName = "Edge";
            browserVersion = userAgent.match(/Edg\/([\d.]+)/)?.[1] || "unknown";
        }

        if (userAgent.includes("Windows")) {
            osName = "Windows";
        } else if (userAgent.includes("Mac OS")) {
            osName = "macOS";
        } else if (userAgent.includes("Linux")) {
            osName = "Linux";
        } else if (userAgent.includes("Android")) {
            osName = "Android";
        } else if (userAgent.includes("iOS")) {
            osName = "iOS";
        }

        // Determine device type
        let deviceType = "desktop";
        if (/Mobi|Android|iPhone|iPad|iPod|Windows Phone/i.test(userAgent)) {
            deviceType = "mobile";
            if (/iPad|Tablet|Android(?!.*Mobile)/i.test(userAgent)) {
                deviceType = "tablet";
            }
        }

        return {
            [APP_VERSION]: process.env.VITE_APP_VERSION || "1.0.0",
            [OS_NAME]: osName,
            [BROWSER_NAME]: browserName,
            [BROWSER_VERSION]: browserVersion,
            [DEVICE_TYPE]: deviceType,
            [SCREEN_RESOLUTION]: `${window.screen.width}x${window.screen.height}`,
            [VIEWPORT_SIZE]: `${window.innerWidth}x${window.innerHeight}`,
            [LANGUAGE]: navigator.language,
        };
    }

    /**
     * Set user ID after login
     * @param {string} userId - User ID from authentication system
     * @param {Object} traits - Optional user traits to associate
     */
    setUserId(userId, traits = {}) {
        if (!userId) return;

        this.userId = userId;

        // Update user session manager with user ID and traits
        this.sessionManager.identifyUser(userId, traits);

        // Update user ID in providers
        this.config.providers.forEach((provider) => {
            switch (provider) {
                case PROVIDERS.GOOGLE_ANALYTICS:
                    // Update user ID in GA
                    break;

                case PROVIDERS.MIXPANEL:
                    // Update user ID in Mixpanel
                    break;

                default:
                    break;
            }
        });
    }

    /**
     * Clear user ID on logout
     */
    clearUserId() {
        this.userId = null;
        this.sessionId = this.generateSessionId();

        // Clear user in session manager
        this.sessionManager.clearUser();

        // Clear user ID in providers
        this.config.providers.forEach((provider) => {
            switch (provider) {
                case PROVIDERS.GOOGLE_ANALYTICS:
                    // Clear user ID in GA
                    break;

                case PROVIDERS.MIXPANEL:
                    // Clear user ID in Mixpanel
                    break;

                default:
                    break;
            }
        });
    }

    /**
     * Update user traits without changing user ID
     * @param {Object} traits - User traits to set
     */
    setUserTraits(traits = {}) {
        this.sessionManager.setUserTraits(traits);
    }

    /**
     * Track user login event
     * @param {string} userId - User ID from authentication
     * @param {Object} traits - User traits to associate
     * @param {Object} properties - Additional properties
     */
    trackLogin(userId, traits = {}, properties = {}) {
        // First set the user ID
        this.setUserId(userId, traits);

        // Then track the login event
        this.track("conversion_login", {
            loginMethod: properties.method || "email",
            ...properties,
        });
    }

    /**
     * Track user signup event
     * @param {string} userId - User ID from authentication
     * @param {Object} traits - User traits to associate
     * @param {Object} properties - Additional properties
     */
    trackSignup(userId, traits = {}, properties = {}) {
        // First set the user ID
        this.setUserId(userId, traits);

        // Then track the signup event
        this.track("conversion_signup_complete", {
            signupMethod: properties.method || "email",
            ...properties,
        });
    }

    /**
     * Track user subscription changes
     * @param {string} planName - Name of the plan
     * @param {string} planPrice - Price of the plan
     * @param {Object} properties - Additional properties
     */
    trackSubscription(planName, planPrice, properties = {}) {
        this.track("conversion_subscription_purchase", {
            planName,
            planPrice,
            ...properties,
        });

        // Update user traits with subscription info
        this.setUserTraits({
            subscription: {
                planName,
                planPrice,
                purchaseDate: Date.now(),
                ...properties,
            },
        });
    }

    /**
     * Get/generate anonymous ID for unauthenticated tracking
     */
    getAnonymousId() {
        try {
            let anonymousId = localStorage.getItem("analytics_anonymous_id");

            if (!anonymousId) {
                anonymousId = this.generateUUID();
                localStorage.setItem("analytics_anonymous_id", anonymousId);
            }

            return anonymousId;
        } catch (e) {
            // If localStorage is not available, generate temporary ID
            return this.generateUUID();
        }
    }

    /**
     * Generate session ID
     */
    generateSessionId() {
        return `${Date.now()}-${this.generateUUID().slice(0, 8)}`;
    }

    /**
     * Generate UUID v4
     */
    generateUUID() {
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
            /[xy]/g,
            function (c) {
                const r = (Math.random() * 16) | 0,
                    v = c === "x" ? r : (r & 0x3) | 0x8;
                return v.toString(16);
            }
        );
    }

    /**
     * Load user consent settings from storage
     */
    loadConsentSettings() {
        try {
            const storedConsent = localStorage.getItem("analytics_consent");

            if (storedConsent) {
                return JSON.parse(storedConsent);
            }
        } catch (e) {
            // Handle errors reading from localStorage
        }

        // Default consent settings
        return {
            doNotTrack: this.checkDoNotTrackBrowserSetting(),
            anonymizeIp: true,
            providers: {
                [PROVIDERS.GOOGLE_ANALYTICS]: false,
                [PROVIDERS.MIXPANEL]: false,
                [PROVIDERS.CUSTOM]: true,
            },
        };
    }

    /**
     * Check browser Do Not Track setting
     */
    checkDoNotTrackBrowserSetting() {
        if (typeof navigator === "undefined") return false;

        // Check for browser's DNT setting
        const dnt =
            navigator.doNotTrack === "1" ||
            navigator.doNotTrack === "yes" ||
            navigator.msDoNotTrack === "1" ||
            window.doNotTrack === "1";

        return dnt;
    }

    /**
     * Update user consent settings
     */
    updateConsentSettings(settings = {}) {
        this.userConsent = {
            ...this.userConsent,
            ...settings,
        };

        // Save to storage
        try {
            localStorage.setItem(
                "analytics_consent",
                JSON.stringify(this.userConsent)
            );
        } catch (e) {
            // Handle errors saving to localStorage
        }

        if (this.config.debug) {
            console.info(
                "Analytics consent settings updated:",
                this.userConsent
            );
        }
    }

    /**
     * Check consent for a specific provider
     */
    hasProviderConsent(provider) {
        if (this.userConsent.doNotTrack) {
            return false;
        }

        return !!this.userConsent.providers[provider];
    }

    /**
     * Get UTM parameters from URL
     */
    getUtmParameters() {
        const utm = {};
        const urlParams = new URLSearchParams(window.location.search);

        ["source", "medium", "campaign", "term", "content"].forEach((param) => {
            const value = urlParams.get(`utm_${param}`);
            if (value) {
                utm[param] = value;
            }
        });

        return utm;
    }

    /**
     * Clean up resources when unmounting
     */
    destroy() {
        // Clear batch interval
        if (this.batchIntervalId) {
            clearInterval(this.batchIntervalId);
        }

        // Clear retry timeouts
        Object.values(this.retryTimeouts).forEach((timeout) => {
            clearTimeout(timeout);
        });

        // Flush remaining events
        this.processQueue();

        // Cleanup session manager
        this.sessionManager.destroy();

        this.initialized = false;
    }
}

// Create singleton instance
const analytics = new AnalyticsService();

export {
    analytics,
    AnalyticsService,
    PROVIDERS,
    eventTaxonomy,
    userSessionManager,
};
