import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import AvatarUpload from "../components/profile/AvatarUpload";
import PreferencesSection from "../components/settings/PreferencesSection";
import PasswordResetForm from "../components/settings/PasswordResetForm";

export default function SettingsPage() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState("preferences");
    const [showAvatarModal, setShowAvatarModal] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [updateSuccess, setUpdateSuccess] = useState({
        preferences: false,
        password: false,
        avatar: false,
    });

    // Handle tab switching
    const handleTabChange = (tab) => {
        setActiveTab(tab);
    };

    // Handle avatar upload
    const handleAvatarChange = async (file) => {
        if (!file) return;

        try {
            setIsUploading(true);

            // Simulate API call for avatar upload
            await new Promise((resolve) => setTimeout(resolve, 1500));

            // Close modal and reset states after "upload"
            setIsUploading(false);
            setShowAvatarModal(false);
            setUpdateSuccess((prev) => ({ ...prev, avatar: true }));

            // Hide success message after 3 seconds
            setTimeout(() => {
                setUpdateSuccess((prev) => ({ ...prev, avatar: false }));
            }, 3000);
        } catch (error) {
            setIsUploading(false);
            console.error("Error uploading avatar:", error);
        }
    };

    // Handle preferences update success
    const handlePreferencesSuccess = () => {
        setUpdateSuccess((prev) => ({ ...prev, preferences: true }));

        // Hide success message after 3 seconds
        setTimeout(() => {
            setUpdateSuccess((prev) => ({ ...prev, preferences: false }));
        }, 3000);
    };

    // Handle password reset success
    const handlePasswordSuccess = () => {
        setUpdateSuccess((prev) => ({ ...prev, password: true }));

        // Hide success message after 3 seconds
        setTimeout(() => {
            setUpdateSuccess((prev) => ({ ...prev, password: false }));
        }, 3000);
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold mb-8">Account Settings</h1>

                {/* Success notifications */}
                <div className="mb-6">
                    {updateSuccess.preferences && (
                        <div className="bg-green-900/30 border border-green-500 text-green-200 px-4 py-3 rounded mb-3 flex items-center justify-between">
                            <span>
                                Your preferences have been updated successfully!
                            </span>
                            <button
                                onClick={() =>
                                    setUpdateSuccess((prev) => ({
                                        ...prev,
                                        preferences: false,
                                    }))
                                }
                                className="text-green-200 hover:text-white"
                            >
                                <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    xmlns="http://www.w3.org/2000/svg"
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
                    )}

                    {updateSuccess.password && (
                        <div className="bg-green-900/30 border border-green-500 text-green-200 px-4 py-3 rounded mb-3 flex items-center justify-between">
                            <span>
                                Your password has been updated successfully!
                            </span>
                            <button
                                onClick={() =>
                                    setUpdateSuccess((prev) => ({
                                        ...prev,
                                        password: false,
                                    }))
                                }
                                className="text-green-200 hover:text-white"
                            >
                                <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    xmlns="http://www.w3.org/2000/svg"
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
                    )}

                    {updateSuccess.avatar && (
                        <div className="bg-green-900/30 border border-green-500 text-green-200 px-4 py-3 rounded mb-3 flex items-center justify-between">
                            <span>
                                Your profile picture has been updated
                                successfully!
                            </span>
                            <button
                                onClick={() =>
                                    setUpdateSuccess((prev) => ({
                                        ...prev,
                                        avatar: false,
                                    }))
                                }
                                className="text-green-200 hover:text-white"
                            >
                                <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    xmlns="http://www.w3.org/2000/svg"
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
                    )}
                </div>

                <div className="flex flex-col md:flex-row gap-8">
                    {/* Left column: Profile avatar and sidebar navigation */}
                    <div className="md:w-64 flex-shrink-0">
                        <div className="bg-gray-800 rounded-lg p-6 mb-6 text-center">
                            <div className="relative mb-4 mx-auto w-32 h-32">
                                <img
                                    src={
                                        user?.avatarUrl ||
                                        "/src/assets/images/default-avatar.png"
                                    }
                                    alt="User avatar"
                                    className="w-32 h-32 rounded-full object-cover border-4 border-gray-700"
                                />
                                <button
                                    onClick={() => setShowAvatarModal(true)}
                                    className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full"
                                    aria-label="Change avatar"
                                >
                                    <svg
                                        className="w-4 h-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                        />
                                    </svg>
                                </button>
                            </div>
                            <h3 className="text-lg font-semibold">
                                {user?.name || "User Name"}
                            </h3>
                            <p className="text-sm text-gray-400">
                                {user?.email || "user@example.com"}
                            </p>
                        </div>

                        {/* Navigation tabs */}
                        <div className="bg-gray-800 rounded-lg overflow-hidden">
                            <button
                                className={`w-full text-left px-6 py-4 border-l-4 ${activeTab === "preferences" ? "border-red-600 bg-gray-700" : "border-transparent hover:bg-gray-700/50"}`}
                                onClick={() => handleTabChange("preferences")}
                            >
                                <div className="flex items-center">
                                    <svg
                                        className="w-5 h-5 mr-3"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                                        />
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                        />
                                    </svg>
                                    <span>Preferences</span>
                                </div>
                            </button>
                            <button
                                className={`w-full text-left px-6 py-4 border-l-4 ${activeTab === "security" ? "border-red-600 bg-gray-700" : "border-transparent hover:bg-gray-700/50"}`}
                                onClick={() => handleTabChange("security")}
                            >
                                <div className="flex items-center">
                                    <svg
                                        className="w-5 h-5 mr-3"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                        />
                                    </svg>
                                    <span>Security</span>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Right column: Settings content based on active tab */}
                    <div className="flex-1">
                        {activeTab === "preferences" && (
                            <PreferencesSection
                                onSuccess={handlePreferencesSuccess}
                            />
                        )}

                        {activeTab === "security" && (
                            <PasswordResetForm
                                onSuccess={handlePasswordSuccess}
                            />
                        )}
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
            </div>
        </div>
    );
}
