import React from "react";

/**
 * ResponsiveGrid - A grid component that adapts to screen sizes
 * Provides a responsive grid layout that changes columns based on viewport width
 *
 * @typedef {Object} GridColumns
 * @property {number} [xs] - Number of columns on extra small screens
 * @property {number} [sm] - Number of columns on small screens
 * @property {number} [md] - Number of columns on medium screens
 * @property {number} [lg] - Number of columns on large screens
 * @property {number} [xl] - Number of columns on extra large screens
 *
 * @param {Object} props - The component props
 * @param {React.ReactNode} [props.children] - The grid items
 * @param {string} [props.className=""] - Additional CSS classes
 * @param {string} [props.gap="gap-4 md:gap-6"] - Gap between grid items
 * @param {GridColumns} [props.cols] - Responsive column configuration
 * @returns {JSX.Element} Responsive grid component
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
