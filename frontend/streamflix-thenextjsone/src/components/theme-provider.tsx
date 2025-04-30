import type React from "react";

export default function ThemeProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="dark:bg-gray-900 bg-white min-h-screen">{children}</div>
    );
}
