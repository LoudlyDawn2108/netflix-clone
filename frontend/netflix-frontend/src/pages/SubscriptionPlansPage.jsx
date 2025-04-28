import { useState, useEffect } from "react";
import { getPlans, getCurrentSubscription } from "../services/plans";
import { useNavigate } from "react-router-dom";

export default function SubscriptionPlansPage() {
    const [plans, setPlans] = useState([]);
    const [currentSubscription, setCurrentSubscription] = useState(null);
    const [selectedPlanId, setSelectedPlanId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    // Fetch plans and current subscription
    useEffect(() => {
        async function fetchPlansAndSubscription() {
            setLoading(true);
            setError(null);

            try {
                // Fetch both in parallel
                const [plansData, subscriptionData] = await Promise.all([
                    getPlans(),
                    getCurrentSubscription(),
                ]);

                setPlans(plansData || []);
                setCurrentSubscription(subscriptionData);

                // If user has a subscription, pre-select that plan
                if (subscriptionData?.planId) {
                    setSelectedPlanId(subscriptionData.planId);
                } else if (plansData?.length) {
                    // Otherwise select the popular plan or the first one
                    const popularPlan = plansData.find((plan) => plan.popular);
                    setSelectedPlanId(popularPlan?.id || plansData[0]?.id);
                }
            } catch (err) {
                console.error("Error loading subscription data:", err);
                setError(
                    err.message || "Failed to load subscription information"
                );
            } finally {
                setLoading(false);
            }
        }

        fetchPlansAndSubscription();
    }, []);

    // Handle plan selection
    const handleSelectPlan = (planId) => {
        setSelectedPlanId(planId);
    };

    // Handle continue to checkout
    const handleContinue = () => {
        if (selectedPlanId) {
            navigate(`/checkout?planId=${selectedPlanId}`);
        }
    };

    // Format price with currency
    const formatPrice = (price, currency = "USD") => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency,
            minimumFractionDigits: 2,
        }).format(price);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
                    <p className="mt-4">Loading subscription plans...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
                <div className="bg-red-900/30 border border-red-500 text-red-200 p-6 rounded-lg max-w-lg text-center">
                    <h2 className="text-xl font-bold mb-2">Error</h2>
                    <p>{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white pt-8 pb-16">
            <div className="container mx-auto px-4">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-3xl font-bold text-center mb-3">
                        Choose Your Plan
                    </h1>

                    {currentSubscription && (
                        <div className="bg-blue-900/30 border border-blue-600 rounded-lg p-4 mb-8">
                            <h2 className="font-semibold mb-1">
                                Current Subscription
                            </h2>
                            <p>
                                You're currently subscribed to the{" "}
                                {plans.find(
                                    (p) => p.id === currentSubscription.planId
                                )?.name || "Unknown"}{" "}
                                plan.
                                {currentSubscription.cancelAtPeriodEnd
                                    ? " Your subscription will end on " +
                                      new Date(
                                          currentSubscription.currentPeriodEnd
                                      ).toLocaleDateString() +
                                      "."
                                    : " Your next billing date is " +
                                      new Date(
                                          currentSubscription.currentPeriodEnd
                                      ).toLocaleDateString() +
                                      "."}
                            </p>

                            {!currentSubscription.cancelAtPeriodEnd && (
                                <div className="mt-3">
                                    <p className="text-sm text-gray-300 mb-1">
                                        Selecting a new plan will change your
                                        subscription at the end of your current
                                        billing period.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="mb-8">
                        <ul className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {plans.map((plan) => (
                                <li key={plan.id} className="relative">
                                    <input
                                        type="radio"
                                        id={`plan-${plan.id}`}
                                        name="subscription-plan"
                                        className="sr-only"
                                        checked={selectedPlanId === plan.id}
                                        onChange={() =>
                                            handleSelectPlan(plan.id)
                                        }
                                    />
                                    <label
                                        htmlFor={`plan-${plan.id}`}
                                        className={`block h-full p-6 border rounded-lg cursor-pointer transition-colors ${
                                            selectedPlanId === plan.id
                                                ? "bg-red-900/20 border-red-600"
                                                : "bg-gray-800/50 border-gray-700 hover:bg-gray-800"
                                        }`}
                                    >
                                        {plan.popular && (
                                            <span className="absolute top-0 right-0 transform translate-x-2 -translate-y-2 bg-red-600 text-white text-xs px-2 py-1 rounded-full">
                                                Popular
                                            </span>
                                        )}
                                        <h3 className="text-xl font-bold mb-2">
                                            {plan.name}
                                        </h3>
                                        <div className="text-2xl font-semibold mb-3">
                                            {formatPrice(
                                                plan.price,
                                                plan.currency
                                            )}{" "}
                                            <span className="text-gray-400 text-sm font-normal">
                                                /month
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-300 mb-4">
                                            {plan.description}
                                        </p>

                                        <ul className="text-sm space-y-2">
                                            {plan.features.map(
                                                (feature, index) => (
                                                    <li
                                                        key={index}
                                                        className="flex"
                                                    >
                                                        <svg
                                                            className="w-4 h-4 text-green-400 mr-2 flex-shrink-0 mt-0.5"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M5 13l4 4L19 7"
                                                            />
                                                        </svg>
                                                        <span>{feature}</span>
                                                    </li>
                                                )
                                            )}
                                        </ul>
                                    </label>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Comparison table for larger screens */}
                    <div className="hidden lg:block mb-8">
                        <h2 className="text-xl font-semibold mb-4">
                            Plan Comparison
                        </h2>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-700">
                                        <th className="py-3 text-left">
                                            Feature
                                        </th>
                                        {plans.map((plan) => (
                                            <th
                                                key={plan.id}
                                                className="py-3 text-center"
                                            >
                                                {plan.name}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="border-b border-gray-800">
                                        <td className="py-3">Monthly price</td>
                                        {plans.map((plan) => (
                                            <td
                                                key={plan.id}
                                                className="py-3 text-center"
                                            >
                                                {formatPrice(
                                                    plan.price,
                                                    plan.currency
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                    <tr className="border-b border-gray-800">
                                        <td className="py-3">Video quality</td>
                                        {plans.map((plan) => (
                                            <td
                                                key={plan.id}
                                                className="py-3 text-center"
                                            >
                                                {plan.videoQuality}
                                            </td>
                                        ))}
                                    </tr>
                                    <tr className="border-b border-gray-800">
                                        <td className="py-3">Resolution</td>
                                        {plans.map((plan) => (
                                            <td
                                                key={plan.id}
                                                className="py-3 text-center"
                                            >
                                                {plan.resolution}
                                            </td>
                                        ))}
                                    </tr>
                                    <tr className="border-b border-gray-800">
                                        <td className="py-3">
                                            Devices at once
                                        </td>
                                        {plans.map((plan) => (
                                            <td
                                                key={plan.id}
                                                className="py-3 text-center"
                                            >
                                                {plan.maxDevices}
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td className="py-3">
                                            Download on devices
                                        </td>
                                        {plans.map((plan) => (
                                            <td
                                                key={plan.id}
                                                className="py-3 text-center"
                                            >
                                                {plan.downloadDevices}
                                            </td>
                                        ))}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="text-center">
                        <button
                            onClick={handleContinue}
                            disabled={!selectedPlanId}
                            className={`px-8 py-3 text-lg rounded font-medium ${
                                selectedPlanId
                                    ? "bg-red-600 hover:bg-red-700"
                                    : "bg-gray-700 cursor-not-allowed"
                            }`}
                        >
                            {currentSubscription
                                ? "Change Plan"
                                : "Continue to Payment"}
                        </button>

                        <p className="mt-4 text-sm text-gray-400">
                            You can change your plan or cancel anytime.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
