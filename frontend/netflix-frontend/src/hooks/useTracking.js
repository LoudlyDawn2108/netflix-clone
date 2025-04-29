import { useCallback, useEffect, useRef } from "react";
import { trackEvent } from "../services/analytics";
import userSessionManager from "../services/analytics/userSessionManager";

/**
 * Custom hook for component-level analytics tracking
 *
 * @param {string} componentName - The name of the component using this hook
 * @param {object} options - Configuration options
 * @param {boolean} options.trackMount - Track when component mounts
 * @param {boolean} options.trackUnmount - Track when component unmounts
 * @param {object} options.defaultProperties - Default properties to include with all events
 * @param {function} options.getAdditionalProperties - Function to get dynamic properties at track time
 * @returns {object} Tracking methods
 */
const useTracking = (
    componentName,
    {
        trackMount = false,
        trackUnmount = false,
        defaultProperties = {},
        getAdditionalProperties = () => ({}),
    } = {}
) => {
    // Keep track of the component name and options
    const trackingContext = useRef({
        componentName,
        defaultProperties,
        getAdditionalProperties,
    });

    // Update ref if props change
    useEffect(() => {
        trackingContext.current = {
            componentName,
            defaultProperties,
            getAdditionalProperties,
        };
    }, [componentName, defaultProperties, getAdditionalProperties]);

    // Track component mount
    useEffect(() => {
        // Ensure session manager is initialized
        if (!userSessionManager.initialized) {
            userSessionManager.init();
        }

        if (trackMount) {
            const additionalProps =
                typeof trackingContext.current.getAdditionalProperties ===
                "function"
                    ? trackingContext.current.getAdditionalProperties()
                    : {};

            trackEvent("component_mounted", {
                component_name: trackingContext.current.componentName,
                ...trackingContext.current.defaultProperties,
                ...additionalProps,
            });
        }

        // Track component unmount
        return () => {
            if (trackUnmount) {
                const additionalProps =
                    typeof trackingContext.current.getAdditionalProperties ===
                    "function"
                        ? trackingContext.current.getAdditionalProperties()
                        : {};

                trackEvent("component_unmounted", {
                    component_name: trackingContext.current.componentName,
                    ...trackingContext.current.defaultProperties,
                    ...additionalProps,
                });
            }
        };
    }, [trackMount, trackUnmount]);

    /**
     * Track a custom event with the component context
     *
     * @param {string} eventName - Name of the event to track
     * @param {object} eventProperties - Additional properties for this event
     */
    const track = useCallback((eventName, eventProperties = {}) => {
        const { componentName, defaultProperties, getAdditionalProperties } =
            trackingContext.current;

        const dynamicProps =
            typeof getAdditionalProperties === "function"
                ? getAdditionalProperties()
                : {};

        trackEvent(eventName, {
            component_name: componentName,
            ...defaultProperties,
            ...dynamicProps,
            ...eventProperties,
        });
    }, []);

    /**
     * Track when a user interaction occurs (click, input, etc)
     *
     * @param {string} interactionType - Type of interaction (click, change, etc)
     * @param {string} elementName - Name/identifier of the element interacted with
     * @param {object} properties - Additional properties
     */
    const trackInteraction = useCallback(
        (interactionType, elementName, properties = {}) => {
            track("user_interaction", {
                interaction_type: interactionType,
                element_name: elementName,
                ...properties,
            });
        },
        [track]
    );

    /**
     * Track impression when content becomes visible
     * Useful with Intersection Observer API
     *
     * @param {string} contentType - Type of content viewed (video, card, banner, etc)
     * @param {string} contentId - ID of the content viewed
     * @param {object} properties - Additional properties
     */
    const trackImpression = useCallback(
        (contentType, contentId, properties = {}) => {
            track("content_impression", {
                content_type: contentType,
                content_id: contentId,
                ...properties,
            });
        },
        [track]
    );

    /**
     * Track when an error occurs
     *
     * @param {Error|string} error - The error object or message
     * @param {object} properties - Additional properties
     */
    const trackError = useCallback(
        (error, properties = {}) => {
            track("error_occurred", {
                error_message:
                    error instanceof Error ? error.message : String(error),
                error_stack: error instanceof Error ? error.stack : undefined,
                ...properties,
            });
        },
        [track]
    );

    /**
     * Track a video-related event
     *
     * @param {string} action - The video action (play, pause, seek, etc)
     * @param {string} videoId - ID of the video
     * @param {object} properties - Additional video properties
     */
    const trackVideoEvent = useCallback(
        (action, videoId, properties = {}) => {
            track("video_event", {
                video_action: action,
                video_id: videoId,
                ...properties,
            });
        },
        [track]
    );

    /**
     * Track a form interaction
     *
     * @param {string} action - Form action (submit, validation, etc)
     * @param {string} formName - Name of the form
     * @param {object} properties - Additional form properties
     */
    const trackFormEvent = useCallback(
        (action, formName, properties = {}) => {
            track("form_event", {
                form_action: action,
                form_name: formName,
                ...properties,
            });
        },
        [track]
    );

    /**
     * Set user properties for segmentation
     *
     * @param {object} properties - User properties to set
     */
    const setUserProperties = useCallback((properties = {}) => {
        userSessionManager.updateUserTraits(properties);
    }, []);

    return {
        track,
        trackInteraction,
        trackImpression,
        trackError,
        trackVideoEvent,
        trackFormEvent,
        setUserProperties,
    };
};

export default useTracking;
