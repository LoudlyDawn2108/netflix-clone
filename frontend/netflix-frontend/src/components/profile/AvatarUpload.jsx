import { useState, useRef } from "react";
import defaultAvatar from "../../assets/images/default-avatar.png";

export default function AvatarUpload({
    currentAvatarUrl = null,
    onAvatarChange = () => {},
    uploading = false,
}) {
    const [preview, setPreview] = useState(currentAvatarUrl);
    const [error, setError] = useState("");
    const fileInputRef = useRef(null);

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Reset previous errors
        setError("");

        // Validate file type
        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/webp",
        ];
        if (!allowedTypes.includes(file.type)) {
            setError(
                "Please select a valid image file (JPEG, PNG, GIF, or WEBP)"
            );
            return;
        }

        // Validate file size (max 2MB)
        const maxSize = 2 * 1024 * 1024; // 2MB in bytes
        if (file.size > maxSize) {
            setError("Image size must be less than 2MB");
            return;
        }

        // Create URL for preview
        const previewUrl = URL.createObjectURL(file);
        setPreview(previewUrl);

        // Call the parent component's handler with the selected file
        onAvatarChange(file);

        // Clean up the URL when component unmounts
        return () => URL.revokeObjectURL(previewUrl);
    };

    const handleButtonClick = () => {
        // Trigger the file input click event
        fileInputRef.current.click();
    };

    return (
        <div className="flex flex-col items-center">
            <div className="mb-6">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-700 border-4 border-gray-800 mx-auto">
                    <img
                        src={preview || defaultAvatar}
                        alt="Avatar preview"
                        className="w-full h-full object-cover"
                    />
                </div>
            </div>

            <div className="flex flex-col items-center">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="image/jpeg, image/png, image/gif, image/webp"
                    className="hidden"
                    disabled={uploading}
                />

                <button
                    type="button"
                    onClick={handleButtonClick}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded flex items-center transition-colors disabled:bg-gray-500"
                    disabled={uploading}
                >
                    {uploading ? (
                        <>
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
                            Uploading...
                        </>
                    ) : (
                        <>
                            <svg
                                className="w-4 h-4 mr-2"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                                ></path>
                            </svg>
                            Choose Image
                        </>
                    )}
                </button>

                {error && (
                    <p className="mt-2 text-red-500 text-sm text-center">
                        {error}
                    </p>
                )}

                <p className="mt-3 text-sm text-gray-400 text-center">
                    Supported formats: JPEG, PNG, GIF, WEBP
                    <br />
                    Maximum size: 2MB
                </p>
            </div>
        </div>
    );
}
