import React from "react";
import PropTypes from "prop-types";

/**
 * ResponsiveGrid - A grid component that adapts to screen sizes
 * Provides a responsive grid layout that changes columns based on viewport width
 */
export default function ResponsiveGrid({
    children,
    className = "",
    gap = "gap-4 md:gap-6",
    cols = {
        xs: 1,
        sm: 2,
        md: 3,
        lg: 4,
        xl: 5,
    },
}) {
    // Convert cols object to tailwind grid classes
    const gridCols = [
        cols.xs ? `grid-cols-${cols.xs}` : "",
        cols.sm ? `sm:grid-cols-${cols.sm}` : "",
        cols.md ? `md:grid-cols-${cols.md}` : "",
        cols.lg ? `lg:grid-cols-${cols.lg}` : "",
        cols.xl ? `xl:grid-cols-${cols.xl}` : "",
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <div className={`grid ${gridCols} ${gap} ${className}`}>{children}</div>
    );
}

ResponsiveGrid.propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
    gap: PropTypes.string,
    cols: PropTypes.shape({
        xs: PropTypes.number,
        sm: PropTypes.number,
        md: PropTypes.number,
        lg: PropTypes.number,
        xl: PropTypes.number,
    }),
};
