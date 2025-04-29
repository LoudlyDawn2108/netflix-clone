import React from "react";

/**
 * ResponsiveContainer - A container component that handles responsive layouts
 * Provides consistent max-width, padding, and responsive behavior across different screen sizes
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - The content to be rendered inside the container
 * @param {string} [props.className=""] - Additional CSS classes to apply to the container
 * @param {boolean} [props.fullWidth=false] - If true, container takes full width without max-width constraint
 * @param {boolean} [props.noPadding=false] - If true, container will not have default padding
 * @param {React.ElementType} [props.as="div"] - HTML element or component to render as container
 * @returns {JSX.Element} Responsive container component
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
