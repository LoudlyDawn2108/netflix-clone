import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSubscription } from "../hooks/useSubscription";
import ProfileHeader from "../components/profile/ProfileHeader";
import ProfileForm from "../components/profile/ProfileForm";
import AvatarUpload from "../components/profile/AvatarUpload";

export default function ProfilePage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const {
        subscription,
        currentPlan,
        loading: subscriptionLoading,
        error: subscriptionError,
        processing: subscriptionProcessing,
        cancel,
        refresh: refreshSubscription,
    } = useSubscription();
    const [showAvatarModal, setShowAvatarModal] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelSuccess, setCancelSuccess] = useState(false);
    const [cancelError, setCancelError] = useState(null);

    // Handle opening the avatar upload modal
    const handleEditAvatarClick = () => {
        setShowAvatarModal(true);
    };

    // Handle avatar file selection
    const handleAvatarChange = async (file) => {
        if (!file) return;

        try {
            setIsUploading(true);

            // Simulate API call for avatar upload
            await new Promise((resolve) => setTimeout(resolve, 1500));

            // Close modal and reset states after "upload"
            setIsUploading(false);
            setShowAvatarModal(false);

            // Show success message (could use a toast notification here)
            console.log("Avatar updated successfully");
        } catch (error) {
            setIsUploading(false);
            console.error("Error uploading avatar:", error);
        }
    };

    // Handle profile update success
    const handleProfileUpdateSuccess = (updatedUser) => {
        console.log("Profile updated successfully:", updatedUser);
        // Could add additional logic here if needed
    };

    // Handle cancel subscription
    const handleCancelSubscription = async () => {
        setCancelError(null);

        try {
            const result = await cancel();

            if (result && result.success) {
                setCancelSuccess(true);
                // Refresh subscription data
                refreshSubscription();
            } else {
                setCancelError(
                    "Failed to cancel subscription. Please try again."
                );
            }
        } catch (error) {
            console.error("Error cancelling subscription:", error);
            setCancelError(error.message || "An unexpected error occurred");
        }
    };

    // Format date to readable format
    const formatDate = (dateString) => {
        if (!dateString) return "";
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    // Format price with currency
    const formatPrice = (price, currency = "USD") => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency,
            minimumFractionDigits: 2,
        }).format(price);
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <div className="container mx-auto px-4 py-8">
                {/* Profile header with user info and avatar */}
                <ProfileHeader onEditClick={handleEditAvatarClick} />

                {/* Main content area */}
                <div className="mt-6 max-w-4xl mx-auto">
                    <ProfileForm onUpdateSuccess={handleProfileUpdateSuccess} />

                    {/* Membership & Subscription info card */}
                    <div className="mt-8 bg-gray-800 rounded-lg shadow p-6">
                        <h2 className="text-xl font-bold mb-4">
                            Membership & Billing
                        </h2>

                        {subscriptionError && (
                            <div className="bg-red-900/30 border border-red-500 text-red-200 p-4 rounded-lg mb-6">
                                <p>{subscriptionError}</p>
                                <button
                                    onClick={refreshSubscription}
                                    className="text-sm text-red-300 hover:text-red-100 underline mt-1"
                                >
                                    Retry
                                </button>
                            </div>
                        )}

                        <div className="border-b border-gray-700 pb-4">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="font-medium">
                                        {user?.email || "user@example.com"}
                                    </p>
                                    <p className="text-sm text-gray-400">
                                        Password: ********
                                    </p>
                                </div>
                                <button className="text-sm text-blue-400 hover:underline">
                                    Change email
                                </button>
                            </div>
                        </div>

                        {subscriptionLoading ? (
                            <div className="py-6 flex justify-center">
                                <div className="inline-flex items-center">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                    <span>Loading subscription details...</span>
                                </div>
                            </div>
                        ) : subscription ? (
                            <>
                                <div className="border-b border-gray-700 py-4">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="font-medium">
                                                {currentPlan?.name ||
                                                    "Standard"}{" "}
                                                Plan
                                            </p>
                                            <p className="text-sm text-gray-400">
                                                {currentPlan?.resolution ||
                                                    "HD"}{" "}
                                                •{" "}
                                                {currentPlan?.price &&
                                                    formatPrice(
                                                        currentPlan.price,
                                                        currentPlan.currency
                                                    )}
                                            </p>
                                        </div>
                                        <Link
                                            to="/plans"
                                            className="text-sm text-blue-400 hover:underline"
                                        >
                                            Change plan
                                        </Link>
                                    </div>
                                </div>

                                <div className="border-b border-gray-700 py-4">
                                    <div>
                                        <p className="font-medium">
                                            Billing Details
                                        </p>
                                        {subscription.paymentMethod && (
                                            <p className="text-sm text-gray-400 mt-1">
                                                <span className="capitalize">
                                                    {
                                                        subscription
                                                            .paymentMethod.brand
                                                    }
                                                </span>{" "}
                                                ••••{" "}
                                                {
                                                    subscription.paymentMethod
                                                        .last4
                                                }
                                                &nbsp;(expires{" "}
                                                {
                                                    subscription.paymentMethod
                                                        .expiryMonth
                                                }
                                                /
                                                {
                                                    subscription.paymentMethod
                                                        .expiryYear
                                                }
                                                )
                                            </p>
                                        )}
                                        <p className="text-sm text-gray-400 mt-1">
                                            Next billing date:{" "}
                                            {formatDate(
                                                subscription.currentPeriodEnd
                                            )}
                                        </p>
                                        {subscription.cancelAtPeriodEnd && (
                                            <p className="text-sm text-yellow-400 mt-2">
                                                Your subscription will end on{" "}
                                                {formatDate(
                                                    subscription.currentPeriodEnd
                                                )}
                                                . You can resubscribe anytime.
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-4">
                                    {subscription.cancelAtPeriodEnd ? (
                                        <button
                                            onClick={() => navigate("/plans")}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium"
                                        >
                                            Renew Subscription
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() =>
                                                setShowCancelModal(true)
                                            }
                                            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded font-medium"
                                            disabled={subscriptionProcessing}
                                        >
                                            {subscriptionProcessing
                                                ? "Processing..."
                                                : "Cancel Membership"}
                                        </button>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="py-6 text-center">
                                <p className="text-lg mb-4">
                                    You don't have an active subscription.
                                </p>
                                <button
                                    onClick={() => navigate("/plans")}
                                    className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded font-medium"
                                >
                                    Choose a Plan
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Avatar upload modal */}
            {showAvatarModal && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-lg max-w-md w-full p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">
                                Update Profile Picture
                            </h2>
                            <button
                                onClick={() => setShowAvatarModal(false)}
                                className="text-gray-400 hover:text-white"
                                disabled={isUploading}
                            >
                                <svg
                                    className="w-6 h-6"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>

                        <AvatarUpload
                            currentAvatarUrl={user?.avatarUrl}
                            onAvatarChange={handleAvatarChange}
                            uploading={isUploading}
                        />

                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => setShowAvatarModal(false)}
                                className="px-4 py-2 text-gray-300 hover:text-white mr-2"
                                disabled={isUploading}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cancel subscription confirmation modal */}
            {showCancelModal && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-lg max-w-md w-full p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">
                                {cancelSuccess
                                    ? "Subscription Cancelled"
                                    : "Cancel Your Subscription?"}
                            </h2>
                            <button
                                onClick={() => {
                                    setShowCancelModal(false);
                                    setCancelSuccess(false);
                                    setCancelError(null);
                                }}
                                className="text-gray-400 hover:text-white"
                                disabled={subscriptionProcessing}
                            >
                                <svg
                                    className="w-6 h-6"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>

                        {cancelSuccess ? (
                            <div className="text-center py-4">
                                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg
                                        className="w-8 h-8 text-white"
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
                                <p className="mb-6">
                                    Your subscription has been cancelled. You
                                    will have access until the end of your
                                    billing period on{" "}
                                    {formatDate(subscription?.currentPeriodEnd)}
                                    .
                                </p>
                                <button
                                    onClick={() => {
                                        setShowCancelModal(false);
                                        setCancelSuccess(false);
                                    }}
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium"
                                >
                                    Close
                                </button>
                            </div>
                        ) : (
                            <>
                                {cancelError && (
                                    <div className="bg-red-900/30 border border-red-500 text-red-200 p-3 rounded-lg mb-4">
                                        <p>{cancelError}</p>
                                    </div>
                                )}

                                <p className="mb-6">
                                    If you cancel your subscription:
                                </p>

                                <ul className="mb-6 list-disc pl-5 space-y-2 text-gray-300">
                                    <li>
                                        Your subscription will remain active
                                        until the end of your current billing
                                        period (
                                        {formatDate(
                                            subscription?.currentPeriodEnd
                                        )}
                                        )
                                    </li>
                                    <li>
                                        You won't be charged again after this
                                        period
                                    </li>
                                    <li>You can resubscribe at any time</li>
                                </ul>

                                <p className="mb-6">
                                    Are you sure you want to cancel?
                                </p>

                                <div className="flex justify-end space-x-3">
                                    <button
                                        onClick={() =>
                                            setShowCancelModal(false)
                                        }
                                        className="px-4 py-2 text-gray-300 hover:text-white border border-gray-600 rounded"
                                        disabled={subscriptionProcessing}
                                    >
                                        Keep Subscription
                                    </button>
                                    <button
                                        onClick={handleCancelSubscription}
                                        className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded font-medium"
                                        disabled={subscriptionProcessing}
                                    >
                                        {subscriptionProcessing ? (
                                            <span className="flex items-center">
                                                <svg
                                                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <circle
                                                        className="opacity-25"
                                                        cx="12"
                                                        cy="12"
                                                        r="10"
                                                        stroke="currentColor"
                                                        strokeWidth="4"
                                                    ></circle>
                                                    <path
                                                        className="opacity-75"
                                                        fill="currentColor"
                                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                    ></path>
                                                </svg>
                                                Processing
                                            </span>
                                        ) : (
                                            "Yes, Cancel"
                                        )}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
