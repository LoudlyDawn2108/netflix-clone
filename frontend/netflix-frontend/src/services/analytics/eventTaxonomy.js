/**
 * Analytics Event Taxonomy
 *
 * Standardized event names, categories and structures for the analytics system.
 * This ensures consistent tracking across the application.
 */

// Event Categories
export const EVENT_CATEGORIES = {
    USER_INTERACTION: "user_interaction",
    PLAYBACK: "playback",
    CONVERSION: "conversion",
    ERROR: "error",
    NAVIGATION: "navigation",
    SEARCH: "search",
    CONTENT: "content",
    SYSTEM: "system",
    ENGAGEMENT: "engagement",
};

// User Interaction Events
export const USER_INTERACTION_EVENTS = {
    CLICK: "click",
    VIEW: "view",
    SCROLL: "scroll",
    HOVER: "hover",
    INPUT: "input",
    FOCUS: "focus",
    BLUR: "blur",
    SUBMIT: "submit",
};

// Playback Events
export const PLAYBACK_EVENTS = {
    PLAY: "play",
    PAUSE: "pause",
    SEEK: "seek",
    COMPLETE: "complete",
    BUFFER_START: "buffer_start",
    BUFFER_END: "buffer_end",
    QUALITY_CHANGE: "quality_change",
    VOLUME_CHANGE: "volume_change",
    FULLSCREEN_ENTER: "fullscreen_enter",
    FULLSCREEN_EXIT: "fullscreen_exit",
    SUBTITLE_TOGGLE: "subtitle_toggle",
    CHAPTER_CHANGE: "chapter_change",
    RATE_CHANGE: "rate_change", // Playback speed
    AD_START: "ad_start",
    AD_COMPLETE: "ad_complete",
    AD_SKIP: "ad_skip",
};

// Conversion Events
export const CONVERSION_EVENTS = {
    SIGNUP_START: "signup_start",
    SIGNUP_COMPLETE: "signup_complete",
    SIGNUP_ABANDON: "signup_abandon",
    LOGIN: "login",
    LOGOUT: "logout",
    SUBSCRIPTION_VIEW: "subscription_view",
    SUBSCRIPTION_SELECT: "subscription_select",
    SUBSCRIPTION_PURCHASE: "subscription_purchase",
    SUBSCRIPTION_CANCEL: "subscription_cancel",
    SUBSCRIPTION_CHANGE: "subscription_change",
    PAYMENT_ADD: "payment_add",
    PAYMENT_REMOVE: "payment_remove",
    TRIAL_START: "trial_start",
    TRIAL_CONVERT: "trial_convert",
    DOWNLOAD_START: "download_start",
    DOWNLOAD_COMPLETE: "download_complete",
};

// Error Events
export const ERROR_EVENTS = {
    PLAYBACK_ERROR: "playback_error",
    NETWORK_ERROR: "network_error",
    API_ERROR: "api_error",
    FORM_ERROR: "form_error",
    AUTHENTICATION_ERROR: "authentication_error",
    PAYMENT_ERROR: "payment_error",
    VALIDATION_ERROR: "validation_error",
    COMPONENT_ERROR: "component_error",
    DRM_ERROR: "drm_error",
    INITIALIZATION_ERROR: "initialization_error",
};

// Content Events
export const CONTENT_EVENTS = {
    CONTENT_VIEW: "content_view",
    CONTENT_RATE: "content_rate",
    CONTENT_REVIEW: "content_review",
    CONTENT_SHARE: "content_share",
    WATCHLIST_ADD: "watchlist_add",
    WATCHLIST_REMOVE: "watchlist_remove",
    RECOMMENDATION_CLICK: "recommendation_click",
    CATEGORY_SELECT: "category_select",
    GENRE_SELECT: "genre_select",
    RELATED_CONTENT_CLICK: "related_content_click",
    CONTINUE_WATCHING_CLICK: "continue_watching_click",
};

// Search Events
export const SEARCH_EVENTS = {
    SEARCH_START: "search_start",
    SEARCH_RESULTS_VIEW: "search_results_view",
    SEARCH_FILTER_APPLY: "search_filter_apply",
    SEARCH_RESULT_CLICK: "search_result_click",
    SEARCH_PAGINATION: "search_pagination",
    SEARCH_SUGGESTION_CLICK: "search_suggestion_click",
    SEARCH_ABANDON: "search_abandon",
    SEARCH_NO_RESULTS: "search_no_results",
};

// System Events
export const SYSTEM_EVENTS = {
    APP_INSTALL: "app_install",
    APP_UPDATE: "app_update",
    PERFORMANCE_METRIC: "performance_metric",
    FEATURE_FLAG_EXPOSURE: "feature_flag_exposure",
    EXPERIMENT_EXPOSURE: "experiment_exposure",
    NOTIFICATION_RECEIVE: "notification_receive",
    NOTIFICATION_CLICK: "notification_click",
    NOTIFICATION_DISMISS: "notification_dismiss",
    STORAGE_QUOTA_EXCEEDED: "storage_quota_exceeded",
    CONNECTIVITY_CHANGE: "connectivity_change",
    PWA_INSTALL_PROMPT: "pwa_install_prompt",
};

// Navigation Events
export const NAVIGATION_EVENTS = {
    PAGE_VIEW: "page_view",
    NAVIGATION_CLICK: "navigation_click",
    TAB_CHANGE: "tab_change",
    MENU_OPEN: "menu_open",
    MENU_CLOSE: "menu_close",
    BACK_BUTTON: "back_button",
    EXTERNAL_LINK_CLICK: "external_link_click",
    APP_EXIT: "app_exit",
    APP_BACKGROUND: "app_background",
    APP_FOREGROUND: "app_foreground",
};

// Engagement Events
export const ENGAGEMENT_EVENTS = {
    SESSION_START: "session_start",
    SESSION_END: "session_end",
    USER_IDLE: "user_idle",
    USER_ACTIVE: "user_active",
    DEEP_SCROLL: "deep_scroll", // User scrolled deep into content
    TIME_SPENT: "time_spent", // Periodic tracking of time spent
    FEATURE_USE: "feature_use",
    SOCIAL_SHARE: "social_share",
    FEEDBACK_SUBMIT: "feedback_submit",
    PROFILE_UPDATE: "profile_update",
    PREFERENCE_CHANGE: "preference_change",
    CAROUSEL_NAVIGATION: "carousel_navigation",
    TOOLTIP_VIEW: "tooltip_view",
};

// Event property standardization
export const STANDARD_PROPERTIES = {
    // Common video properties
    VIDEO: {
        VIDEO_ID: "video_id",
        TITLE: "title",
        GENRE: "genre",
        DURATION: "duration",
        POSITION: "position", // Current position in seconds
        PERCENT_COMPLETE: "percent_complete",
        QUALITY_LEVEL: "quality_level",
        IS_TRAILER: "is_trailer",
        CONTENT_TYPE: "content_type", // movie, series, episode
        SERIES_ID: "series_id",
        SEASON_NUMBER: "season_number",
        EPISODE_NUMBER: "episode_number",
        RELEASE_YEAR: "release_year",
        RATING: "rating",
    },

    // User properties
    USER: {
        USER_ID: "user_id",
        ANONYMOUS_ID: "anonymous_id",
        SUBSCRIPTION_TIER: "subscription_tier",
        IS_TRIAL: "is_trial",
        DAYS_ACTIVE: "days_active",
        DEVICE_TYPE: "device_type",
        PROFILE_ID: "profile_id",
    },

    // UI interaction properties
    UI: {
        ELEMENT_ID: "element_id",
        ELEMENT_TYPE: "element_type", // button, link, card, etc.
        ELEMENT_TEXT: "element_text",
        ELEMENT_POSITION: "element_position", // position in list, row, grid
        SCREEN_NAME: "screen_name",
        COMPONENT_NAME: "component_name",
        VIEW_TYPE: "view_type", // list, grid, carousel
        SOURCE: "source", // which part of UI triggered event
    },

    // Error properties
    ERROR: {
        ERROR_CODE: "error_code",
        ERROR_MESSAGE: "error_message",
        ERROR_TYPE: "error_type",
        STACK_TRACE: "stack_trace",
        HTTP_STATUS: "http_status",
        API_ENDPOINT: "api_endpoint",
    },

    // System properties
    SYSTEM: {
        APP_VERSION: "app_version",
        OS_NAME: "os_name",
        OS_VERSION: "os_version",
        BROWSER_NAME: "browser_name",
        BROWSER_VERSION: "browser_version",
        DEVICE_MODEL: "device_model",
        CONNECTION_TYPE: "connection_type",
        SCREEN_RESOLUTION: "screen_resolution",
        VIEWPORT_SIZE: "viewport_size",
        LANGUAGE: "language",
        TIMEZONE: "timezone",
    },

    // Performance properties
    PERFORMANCE: {
        LOAD_TIME: "load_time", // in milliseconds
        RESPONSE_TIME: "response_time", // API response time
        FRAME_RATE: "frame_rate",
        MEMORY_USAGE: "memory_usage",
        BUFFER_COUNT: "buffer_count",
        BUFFER_DURATION: "buffer_duration",
        TIME_TO_INTERACTIVE: "time_to_interactive",
        FIRST_CONTENTFUL_PAINT: "first_contentful_paint",
    },
};

/**
 * Build a standardized event name following convention
 * Format: {category}_{action}
 * Example: playback_start, user_interaction_click
 */
export const buildEventName = (category, action) => {
    return `${category}_${action}`;
};

/**
 * Validate if an event follows the defined taxonomy
 */
export const isValidEvent = (eventName) => {
    // Implement validation logic
    const categories = Object.values(EVENT_CATEGORIES);

    // Check if event starts with a valid category prefix
    return categories.some((category) => eventName.startsWith(`${category}_`));
};

/**
 * Get recommended properties for specific event types
 */
export const getRecommendedProperties = (eventName) => {
    // Return suggested properties based on event name
    if (eventName.startsWith("playback_")) {
        return Object.values(STANDARD_PROPERTIES.VIDEO);
    } else if (eventName.startsWith("error_")) {
        return Object.values(STANDARD_PROPERTIES.ERROR);
    }
    // Add more mappings as needed

    return [];
};

/**
 * Export all events in a flattened format for easy access
 */
export const EVENTS = {
    ...Object.entries(EVENT_CATEGORIES).reduce((acc, [key, category]) => {
        // For each category, create flattened event names
        const categoryEvents = eval(`${key}_EVENTS`);
        if (categoryEvents) {
            Object.entries(categoryEvents).forEach(([eventKey, action]) => {
                acc[`${key}_${eventKey}`] = buildEventName(category, action);
            });
        }
        return acc;
    }, {}),
};

export default {
    EVENT_CATEGORIES,
    USER_INTERACTION_EVENTS,
    PLAYBACK_EVENTS,
    CONVERSION_EVENTS,
    ERROR_EVENTS,
    NAVIGATION_EVENTS,
    SEARCH_EVENTS,
    CONTENT_EVENTS,
    SYSTEM_EVENTS,
    ENGAGEMENT_EVENTS,
    STANDARD_PROPERTIES,
    EVENTS,
    buildEventName,
    isValidEvent,
    getRecommendedProperties,
};
