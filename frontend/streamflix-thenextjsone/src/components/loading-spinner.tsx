interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg"
}

export default function LoadingSpinner({ size = "md" }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-6 h-6 border-2",
    md: "w-10 h-10 border-3",
    lg: "w-16 h-16 border-4",
  }

  return (
    <div className="flex justify-center items-center py-8">
      <div className={`${sizeClasses[size]} border-red-600 border-t-transparent rounded-full animate-spin`}></div>
    </div>
  )
}
