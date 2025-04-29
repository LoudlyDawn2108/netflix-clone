/**
 * User Session Manager
 * Handles user session data, anonymous IDs, and user identification for analytics
 */

// Generate a random UUID v4 for anonymous tracking
const generateUUID = () => {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
        /[xy]/g,
        function (c) {
            const r = (Math.random() * 16) | 0;
            const v = c === "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        }
    );
};

// Session storage keys
const SESSION_STORAGE_KEYS = {
    ANONYMOUS_ID: "netflix_clone_anonymous_id",
    SESSION_ID: "netflix_clone_session_id",
    SESSION_START: "netflix_clone_session_start",
    USER_TRAITS: "netflix_clone_user_traits",
};

// Local storage keys for persistent data
const LOCAL_STORAGE_KEYS = {
    USER_ID: "netflix_clone_user_id",
    LAST_SEEN: "netflix_clone_last_seen",
    FIRST_SEEN: "netflix_clone_first_seen",
    CONSENT_STATUS: "netflix_clone_analytics_consent",
};

class UserSessionManager {
    constructor() {
        this.initialized = false;
        this.anonymousId = null;
        this.userId = null;
        this.sessionId = null;
        this.sessionStart = null;
        this.userTraits = {};
        this.isIdentified = false;
        this.consentGiven = false;
    }

    /**
     * Initialize the session manager
     * Should be called when app starts
     */
    init() {
        if (this.initialized) return;

        // Check for analytics consent
        this.consentGiven =
            localStorage.getItem(LOCAL_STORAGE_KEYS.CONSENT_STATUS) === "true";

        // Get or generate anonymous ID
        this.anonymousId =
            sessionStorage.getItem(SESSION_STORAGE_KEYS.ANONYMOUS_ID) ||
            generateUUID();
        sessionStorage.setItem(
            SESSION_STORAGE_KEYS.ANONYMOUS_ID,
            this.anonymousId
        );

        // Get or create session ID
        this.sessionId =
            sessionStorage.getItem(SESSION_STORAGE_KEYS.SESSION_ID) ||
            generateUUID();
        sessionStorage.setItem(SESSION_STORAGE_KEYS.SESSION_ID, this.sessionId);

        // Track session start time
        this.sessionStart =
            sessionStorage.getItem(SESSION_STORAGE_KEYS.SESSION_START) ||
            Date.now();
        sessionStorage.setItem(
            SESSION_STORAGE_KEYS.SESSION_START,
            this.sessionStart
        );

        // Get existing user traits
        const storedTraits = sessionStorage.getItem(
            SESSION_STORAGE_KEYS.USER_TRAITS
        );
        this.userTraits = storedTraits ? JSON.parse(storedTraits) : {};

        // Check for existing user ID (logged in state)
        const storedUserId = localStorage.getItem(LOCAL_STORAGE_KEYS.USER_ID);
        if (storedUserId) {
            this.identifyUser(storedUserId);
        }

        // Update timestamps
        const now = new Date().toISOString();
        if (!localStorage.getItem(LOCAL_STORAGE_KEYS.FIRST_SEEN)) {
            localStorage.setItem(LOCAL_STORAGE_KEYS.FIRST_SEEN, now);
        }
        localStorage.setItem(LOCAL_STORAGE_KEYS.LAST_SEEN, now);

        // Listen for page visibility change to handle tab switching/browser closing
        document.addEventListener(
            "visibilitychange",
            this.handleVisibilityChange.bind(this)
        );

        // Listen for before unload to capture exit
        window.addEventListener(
            "beforeunload",
            this.handleBeforeUnload.bind(this)
        );

        this.initialized = true;

        // Return session data for immediate use
        return this.getSessionData();
    }

    /**
     * Identify a user when they log in
     * @param {string} userId - The user's ID after authentication
     * @param {object} traits - Additional user traits/properties
     */
    identifyUser(userId, traits = {}) {
        if (!userId) return;

        this.userId = userId;
        localStorage.setItem(LOCAL_STORAGE_KEYS.USER_ID, userId);

        // Merge any passed traits with existing
        if (traits && typeof traits === "object") {
            this.updateUserTraits(traits);
        }

        this.isIdentified = true;
        return this.getSessionData();
    }

    /**
     * Clear user identity on logout
     */
    clearUserIdentity() {
        this.userId = null;
        localStorage.removeItem(LOCAL_STORAGE_KEYS.USER_ID);
        this.isIdentified = false;

        // Generate new anonymous ID for the new session
        this.anonymousId = generateUUID();
        sessionStorage.setItem(
            SESSION_STORAGE_KEYS.ANONYMOUS_ID,
            this.anonymousId
        );

        // Clear user-specific traits but keep device/session info
        const deviceTraits = {
            device_type: this.userTraits.device_type,
            browser: this.userTraits.browser,
            os: this.userTraits.os,
        };

        this.userTraits = deviceTraits;
        sessionStorage.setItem(
            SESSION_STORAGE_KEYS.USER_TRAITS,
            JSON.stringify(this.userTraits)
        );

        return this.getSessionData();
    }

    /**
     * Update user traits/properties for segmentation
     * @param {object} traits - User traits to add/update
     */
    updateUserTraits(traits = {}) {
        if (!traits || typeof traits !== "object") return;

        this.userTraits = {
            ...this.userTraits,
            ...traits,
            last_updated: new Date().toISOString(),
        };

        sessionStorage.setItem(
            SESSION_STORAGE_KEYS.USER_TRAITS,
            JSON.stringify(this.userTraits)
        );
        return this.userTraits;
    }

    /**
     * Get current session data
     * @returns {object} Complete session data for analytics
     */
    getSessionData() {
        return {
            anonymous_id: this.anonymousId,
            user_id: this.userId,
            session_id: this.sessionId,
            session_start: parseInt(this.sessionStart),
            session_duration: Date.now() - parseInt(this.sessionStart),
            is_identified: this.isIdentified,
            traits: this.userTraits,
            consent_given: this.consentGiven,
            first_seen: localStorage.getItem(LOCAL_STORAGE_KEYS.FIRST_SEEN),
            last_seen: localStorage.getItem(LOCAL_STORAGE_KEYS.LAST_SEEN),
        };
    }

    /**
     * Handle visibility change (tab switching/browser minimizing)
     */
    handleVisibilityChange() {
        // Update last seen time when tab becomes visible again
        if (document.visibilityState === "visible") {
            localStorage.setItem(
                LOCAL_STORAGE_KEYS.LAST_SEEN,
                new Date().toISOString()
            );
        }
    }

    /**
     * Handle before unload (page close/refresh)
     */
    handleBeforeUnload() {
        localStorage.setItem(
            LOCAL_STORAGE_KEYS.LAST_SEEN,
            new Date().toISOString()
        );
    }

    /**
     * Update analytics consent status
     * @param {boolean} consentGiven - Whether user consented to analytics
     */
    updateConsentStatus(consentGiven) {
        this.consentGiven = Boolean(consentGiven);
        localStorage.setItem(
            LOCAL_STORAGE_KEYS.CONSENT_STATUS,
            this.consentGiven
        );
        return this.consentGiven;
    }

    /**
     * Check if analytics tracking is allowed
     * @returns {boolean} Whether tracking is allowed
     */
    canTrack() {
        return this.consentGiven;
    }

    /**
     * Reset all tracking data (for GDPR/privacy requests)
     */
    resetAllTrackingData() {
        // Clear session storage
        Object.values(SESSION_STORAGE_KEYS).forEach((key) =>
            sessionStorage.removeItem(key)
        );

        // Clear local storage tracking items
        Object.values(LOCAL_STORAGE_KEYS).forEach((key) =>
            localStorage.removeItem(key)
        );

        // Reset instance variables
        this.anonymousId = generateUUID();
        this.userId = null;
        this.sessionId = generateUUID();
        this.sessionStart = Date.now();
        this.userTraits = {};
        this.isIdentified = false;

        // Save new anonymous values
        sessionStorage.setItem(
            SESSION_STORAGE_KEYS.ANONYMOUS_ID,
            this.anonymousId
        );
        sessionStorage.setItem(SESSION_STORAGE_KEYS.SESSION_ID, this.sessionId);
        sessionStorage.setItem(
            SESSION_STORAGE_KEYS.SESSION_START,
            this.sessionStart
        );

        return true;
    }
}

const userSessionManager = new UserSessionManager();
export default userSessionManager;
