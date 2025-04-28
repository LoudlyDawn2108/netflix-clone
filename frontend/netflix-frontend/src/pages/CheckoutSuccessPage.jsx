import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useSubscription } from "../hooks/useSubscription";

export default function CheckoutSuccessPage() {
    const navigate = useNavigate();
    const { currentSubscription, loading } = useSubscription();

    // Redirect to plans if there's no active subscription
    useEffect(() => {
        if (!loading && !currentSubscription) {
            navigate("/plans");
        }
    }, [loading, currentSubscription, navigate]);

    return (
        <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
            <div className="container mx-auto px-4 py-16 text-center">
                <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-6">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-10 w-10 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                        />
                    </svg>
                </div>

                <h1 className="text-4xl font-bold mb-4">
                    Subscription Confirmed!
                </h1>

                {currentSubscription && (
                    <div className="mb-6">
                        <p className="text-xl mb-2">
                            You're now subscribed to our{" "}
                            {currentSubscription.planName} plan.
                        </p>
                        <p className="text-gray-400">
                            Your subscription will renew automatically on{" "}
                            {new Date(
                                currentSubscription.nextBillingDate
                            ).toLocaleDateString()}
                            .
                        </p>
                    </div>
                )}

                <p className="mb-8">
                    Thank you for choosing our streaming service. You now have
                    access to thousands of movies and TV shows!
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                        to="/"
                        className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md transition-colors"
                    >
                        Start Watching
                    </Link>

                    <Link
                        to="/profile"
                        className="px-6 py-3 bg-gray-700 hover:bg-gray-800 text-white font-medium rounded-md transition-colors"
                    >
                        Manage Subscription
                    </Link>
                </div>
            </div>
        </div>
    );
}
