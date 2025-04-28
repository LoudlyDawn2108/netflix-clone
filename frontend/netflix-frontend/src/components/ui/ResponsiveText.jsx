import React from "react";
import PropTypes from "prop-types";

/**
 * ResponsiveText - A component for responsive typography
 * Automatically adjusts font sizes based on screen size
 */
export default function ResponsiveText({
    children,
    className = "",
    variant = "body",
    as: Component = "div",
}) {
    // Define responsive typography classes for different variants
    const typographyClasses = {
        h1: "text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold",
        h2: "text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold",
        h3: "text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold",
        h4: "text-base sm:text-lg md:text-xl font-semibold",
        h5: "text-sm sm:text-base md:text-lg font-semibold",
        subtitle: "text-base sm:text-lg text-gray-300 font-medium",
        body: "text-sm sm:text-base",
        "body-large": "text-base sm:text-lg",
        caption: "text-xs sm:text-sm text-gray-400",
        button: "text-sm sm:text-base font-medium",
    };

    // Get the appropriate typography class based on variant
    const typographyClass =
        typographyClasses[variant] || typographyClasses.body;

    return (
        <Component className={`${typographyClass} ${className}`}>
            {children}
        </Component>
    );
}

ResponsiveText.propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
    variant: PropTypes.oneOf([
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "subtitle",
        "body",
        "body-large",
        "caption",
        "button",
    ]),
    as: PropTypes.elementType,
};
