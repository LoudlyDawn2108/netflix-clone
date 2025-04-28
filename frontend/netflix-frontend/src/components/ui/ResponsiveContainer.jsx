import React from "react";
import PropTypes from "prop-types";

/**
 * ResponsiveContainer - A container component that handles responsive layouts
 * Provides consistent max-width, padding, and responsive behavior across different screen sizes
 */
export default function ResponsiveContainer({
    children,
    className = "",
    fullWidth = false,
    noPadding = false,
    as: Component = "div",
}) {
    return (
        <Component
            className={`
        mx-auto w-full
        ${fullWidth ? "" : "max-w-8xl"}
        ${noPadding ? "" : "px-4 sm:px-6 lg:px-8"} 
        ${className}
      `}
        >
            {children}
        </Component>
    );
}

ResponsiveContainer.propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
    fullWidth: PropTypes.bool,
    noPadding: PropTypes.bool,
    as: PropTypes.elementType,
};
