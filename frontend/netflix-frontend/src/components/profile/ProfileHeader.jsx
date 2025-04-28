import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import defaultAvatar from "../../assets/images/default-avatar.png";

export default function ProfileHeader({ onEditClick }) {
    const { user } = useAuth();
    const [imageError, setImageError] = useState(false);

    const handleImageError = () => {
        setImageError(true);
    };

    const avatarUrl =
        user?.avatarUrl && !imageError ? user.avatarUrl : defaultAvatar;

    return (
        <div className="flex flex-col md:flex-row items-center gap-6 py-8">
            <div className="relative">
                {/* Avatar image */}
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden bg-gray-700 border-4 border-gray-800">
                    <img
                        src={avatarUrl}
                        alt="User avatar"
                        className="w-full h-full object-cover"
                        onError={handleImageError}
                    />
                </div>

                {/* Edit button */}
                {onEditClick && (
                    <button
                        onClick={onEditClick}
                        className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 shadow-md transition-colors"
                        aria-label="Edit profile picture"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                            />
                        </svg>
                    </button>
                )}
            </div>

            <div className="text-center md:text-left">
                <h1 className="text-2xl md:text-3xl font-bold">
                    {user?.name || user?.username || "Guest User"}
                </h1>
                <p className="text-gray-400">
                    Member since {formatDate(user?.createdAt) || "Unknown"}
                </p>
                {user?.email && (
                    <p className="text-gray-300 mt-1">{user.email}</p>
                )}
            </div>
        </div>
    );
}

// Helper function to format date
function formatDate(dateString) {
    if (!dateString) return null;

    try {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat("en-US", {
            year: "numeric",
            month: "long",
        }).format(date);
    } catch (e) {
        console.error("Error formatting date:", e);
        return null;
    }
}
