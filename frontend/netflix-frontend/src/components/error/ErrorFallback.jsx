/**
 * Default fallback UI displayed when an error is caught by an ErrorBoundary
 * @param {Object} props - The component props
 * @param {Error} [props.error] - The error object caught by ErrorBoundary
 * @param {Function} [props.resetErrorBoundary] - Function to reset the error boundary
 * @param {string} [props.title="Something went wrong"] - Title to display
 * @param {string} [props.message="We encountered an error loading this content."] - Message to display
 * @param {string} [props.buttonText="Try again"] - Text for the reset button
 * @param {boolean} [props.showError] - Whether to display the error details
 * @returns {JSX.Element} The fallback UI
 */
const ErrorFallback = ({
    error,
    resetErrorBoundary,
    title = "Something went wrong",
    message = "We encountered an error loading this content.",
    buttonText = "Try again",
    showError = import.meta.env.MODE !== "production",
}) => {
    return (
        <div className="p-6 bg-gray-900 border border-red-800 rounded-md shadow-lg">
            <h2 className="text-xl font-semibold text-red-500 mb-2">{title}</h2>
            <p className="text-gray-300 mb-4">{message}</p>

            {showError && error && (
                <div className="mb-4 p-3 bg-gray-800 rounded border border-gray-700 overflow-auto max-h-40">
                    <p className="text-gray-400 text-sm font-mono">
                        {error.toString()}
                    </p>
                </div>
            )}

            {resetErrorBoundary && (
                <button
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    onClick={resetErrorBoundary}
                >
                    {buttonText}
                </button>
            )}
        </div>
    );
};

export default ErrorFallback;
