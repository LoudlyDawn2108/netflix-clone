import { cn } from "../../lib/utils";

interface LoadingSkeletonProps {
    className?: string;
    count?: number;
    type?: "row" | "card" | "text" | "hero";
}

export default function LoadingSkeleton({
    className,
    count = 6,
    type = "card",
}: LoadingSkeletonProps) {
    if (type === "hero") {
        return (
            <div
                className={cn(
                    "w-full h-[56.25vw] max-h-[80vh] min-h-[500px] bg-gray-900 animate-pulse",
                    className
                )}
            />
        );
    }

    if (type === "row") {
        return (
            <div className={cn("space-y-3", className)}>
                <div className="h-8 w-1/4 bg-gray-800 rounded animate-pulse" />
                <div className="flex space-x-4 overflow-hidden">
                    {Array(count)
                        .fill(0)
                        .map((_, i) => (
                            <div
                                key={i}
                                className="flex-none w-[200px] h-[150px] bg-gray-800 rounded animate-pulse"
                            />
                        ))}
                </div>
            </div>
        );
    }

    if (type === "text") {
        return (
            <div className={cn("space-y-2", className)}>
                {Array(count)
                    .fill(0)
                    .map((_, i) => (
                        <div
                            key={i}
                            className="h-4 bg-gray-800 rounded animate-pulse"
                            style={{ width: `${Math.random() * 50 + 50}%` }}
                        />
                    ))}
            </div>
        );
    }

    // Default card skeleton
    return (
        <div
            className={cn(
                "w-[200px] h-[150px] bg-gray-800 rounded animate-pulse",
                className
            )}
        />
    );
}
