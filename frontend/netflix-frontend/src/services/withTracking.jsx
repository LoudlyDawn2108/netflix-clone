import React from "react";
import { analytics } from "./analytics";
import { useLocation } from "react-router-dom";

/**
 * Higher-order component (HOC) for adding analytics tracking to components
 *
 * This HOC wraps a component with tracking functionality, allowing for
 * automated tracking of component lifecycle events, interactions, etc.
 *
 * @param {React.Component} WrappedComponent - The component to wrap
 * @param {Object} options - Configuration options
 * @param {string} options.componentName - Name of the component for tracking
 * @param {boolean} options.trackMount - Whether to track component mount event
 * @param {boolean} options.trackUnmount - Whether to track component unmount event
 * @param {boolean} options.trackProps - Whether to track component prop changes
 * @param {Object} options.data - Additional data to include with all events
 * @param {Array<string>} options.trackedPropNames - Specific props to track changes for
 * @returns {React.Component} - Wrapped component with tracking
 */
const withTracking = (
    WrappedComponent,
    {
        componentName = "",
        trackMount = false,
        trackUnmount = false,
        trackProps = false,
        data = {},
        trackedPropNames = [],
    } = {}
) => {
    // Get actual component name for tracking
    const displayName =
        componentName ||
        WrappedComponent.displayName ||
        WrappedComponent.name ||
        "UnknownComponent";

    // Create a wrapped component with tracking
    const WithTrackingComponent = (props) => {
        const location = useLocation();
        const mountTimeRef = React.useRef(Date.now());
        const prevPropsRef = React.useRef(props);

        // Create tracking functions to pass to the wrapped component
        const trackEvent = (eventName, properties = {}) => {
            analytics.track(eventName, {
                componentName: displayName,
                pathname: location.pathname,
                ...data,
                ...properties,
            });
        };

        const trackClick = (elementName, properties = {}) => {
            analytics.track("ui_interaction_click", {
                componentName: displayName,
                pathname: location.pathname,
                elementName,
                ...data,
                ...properties,
            });
        };

        const trackImpression = (contentId, contentType, properties = {}) => {
            analytics.track("content_impression", {
                componentName: displayName,
                pathname: location.pathname,
                content_id: contentId,
                content_type: contentType,
                ...data,
                ...properties,
            });
        };

        // Track component mount
        React.useEffect(() => {
            if (trackMount) {
                analytics.track("ui_component_mount", {
                    componentName: displayName,
                    pathname: location.pathname,
                    url: window.location.href,
                    ...data,
                });
            }

            // Track component unmount
            return () => {
                if (trackUnmount) {
                    const duration = Date.now() - mountTimeRef.current;
                    analytics.track("ui_component_unmount", {
                        componentName: displayName,
                        pathname: location.pathname,
                        displayDuration: duration,
                        url: window.location.href,
                        ...data,
                    });
                }
            };
        }, []);

        // Track important prop changes
        React.useEffect(() => {
            if (trackProps && trackedPropNames.length > 0) {
                const changedProps = {};
                let hasChanges = false;

                trackedPropNames.forEach((propName) => {
                    if (props[propName] !== prevPropsRef.current[propName]) {
                        changedProps[propName] = {
                            prev: prevPropsRef.current[propName],
                            current: props[propName],
                        };
                        hasChanges = true;
                    }
                });

                if (hasChanges) {
                    analytics.track("ui_component_props_change", {
                        componentName: displayName,
                        pathname: location.pathname,
                        changedProps,
                        ...data,
                    });
                }

                prevPropsRef.current = props;
            }
        }, [props, trackProps]);

        // The tracking object to pass to the wrapped component
        const trackingProps = {
            tracking: {
                trackEvent,
                trackClick,
                trackImpression,
                componentName: displayName,
                // Add other tracking methods as needed
            },
        };

        // Render the wrapped component with tracking props
        return <WrappedComponent {...props} {...trackingProps} />;
    };

    // Update the display name for React DevTools
    WithTrackingComponent.displayName = `withTracking(${displayName})`;

    return WithTrackingComponent;
};

export default withTracking;

/**
 * Example usage:
 *
 * // For function components
 * const MyComponent = ({ tracking, ...props }) => {
 *   const handleClick = () => {
 *     tracking.trackClick('button_click', { buttonId: 'my-button' });
 *     // Do something else...
 *   };
 *
 *   return <button onClick={handleClick}>Click me</button>;
 * };
 *
 * export default withTracking(MyComponent, {
 *   componentName: 'MyComponent',
 *   trackMount: true,
 *   trackUnmount: true,
 *   data: { componentArea: 'header' }
 * });
 *
 * // For class components
 * class MyClassComponent extends React.Component {
 *   handleClick = () => {
 *     this.props.tracking.trackClick('button_click');
 *     // Do something else...
 *   };
 *
 *   render() {
 *     return <button onClick={this.handleClick}>Click me</button>;
 *   }
 * }
 *
 * export default withTracking(MyClassComponent, {
 *   componentName: 'MyClassComponent',
 *   trackMount: true
 * });
 */
