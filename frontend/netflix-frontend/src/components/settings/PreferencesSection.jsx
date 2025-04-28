import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import FormInput from "../ui/FormInput";
import FormButton from "../ui/FormButton";

export default function PreferencesSection({ onSuccess }) {
    const { user, setUser } = useAuth();
    const [formState, setFormState] = useState({
        emailNotifications: user?.preferences?.emailNotifications || false,
        pushNotifications: user?.preferences?.pushNotifications || true,
        autoplayTrailers: user?.preferences?.autoplayTrailers || true,
        autoplayNextEpisode: user?.preferences?.autoplayNextEpisode || true,
        darkMode: user?.preferences?.darkMode || true,
        subtitlesEnabled: user?.preferences?.subtitlesEnabled || false,
        defaultLanguage: user?.preferences?.defaultLanguage || "en",
        defaultVideoQuality: user?.preferences?.defaultVideoQuality || "auto",
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Update form state if user changes
        if (user?.preferences) {
            setFormState((prevState) => ({
                ...prevState,
                ...user.preferences,
            }));
        }
    }, [user]);

    const handleCheckboxChange = (e) => {
        const { name, checked } = e.target;
        setFormState((prev) => ({
            ...prev,
            [name]: checked,
        }));
    };

    const handleSelectChange = (e) => {
        const { name, value } = e.target;
        setFormState((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            // Simulate API call
            await new Promise((resolve) => setTimeout(resolve, 800));

            // Update user preferences in context
            setUser((prev) => ({
                ...prev,
                preferences: {
                    ...prev.preferences,
                    ...formState,
                },
            }));

            // Notify parent of success
            if (onSuccess) {
                onSuccess();
            }
        } catch (err) {
            setError("Failed to update preferences. Please try again.");
            console.error("Error updating preferences:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-6">
                Streaming & App Preferences
            </h2>

            {error && (
                <div className="bg-red-900/30 border border-red-500 text-red-200 px-4 py-3 rounded mb-6">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="mb-8">
                    <h3 className="text-lg font-semibold mb-4">
                        Notifications
                    </h3>
                    <div className="space-y-4">
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="emailNotifications"
                                name="emailNotifications"
                                checked={formState.emailNotifications}
                                onChange={handleCheckboxChange}
                                className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500 bg-gray-700 border-gray-500"
                            />
                            <label
                                htmlFor="emailNotifications"
                                className="ml-2"
                            >
                                Email notifications about new content and
                                features
                            </label>
                        </div>

                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="pushNotifications"
                                name="pushNotifications"
                                checked={formState.pushNotifications}
                                onChange={handleCheckboxChange}
                                className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500 bg-gray-700 border-gray-500"
                            />
                            <label htmlFor="pushNotifications" className="ml-2">
                                Push notifications on mobile and desktop
                            </label>
                        </div>
                    </div>
                </div>

                <div className="mb-8">
                    <h3 className="text-lg font-semibold mb-4">
                        Playback Settings
                    </h3>
                    <div className="space-y-4">
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="autoplayTrailers"
                                name="autoplayTrailers"
                                checked={formState.autoplayTrailers}
                                onChange={handleCheckboxChange}
                                className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500 bg-gray-700 border-gray-500"
                            />
                            <label htmlFor="autoplayTrailers" className="ml-2">
                                Autoplay trailers on browse pages
                            </label>
                        </div>

                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="autoplayNextEpisode"
                                name="autoplayNextEpisode"
                                checked={formState.autoplayNextEpisode}
                                onChange={handleCheckboxChange}
                                className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500 bg-gray-700 border-gray-500"
                            />
                            <label
                                htmlFor="autoplayNextEpisode"
                                className="ml-2"
                            >
                                Autoplay next episode in a series
                            </label>
                        </div>

                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="subtitlesEnabled"
                                name="subtitlesEnabled"
                                checked={formState.subtitlesEnabled}
                                onChange={handleCheckboxChange}
                                className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500 bg-gray-700 border-gray-500"
                            />
                            <label htmlFor="subtitlesEnabled" className="ml-2">
                                Enable subtitles by default
                            </label>
                        </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label
                                htmlFor="defaultLanguage"
                                className="block text-sm font-medium mb-1"
                            >
                                Default Audio Language
                            </label>
                            <select
                                id="defaultLanguage"
                                name="defaultLanguage"
                                value={formState.defaultLanguage}
                                onChange={handleSelectChange}
                                className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="en">English</option>
                                <option value="es">Spanish</option>
                                <option value="fr">French</option>
                                <option value="de">German</option>
                                <option value="ja">Japanese</option>
                                <option value="ko">Korean</option>
                                <option value="zh">Chinese</option>
                            </select>
                        </div>

                        <div>
                            <label
                                htmlFor="defaultVideoQuality"
                                className="block text-sm font-medium mb-1"
                            >
                                Default Video Quality
                            </label>
                            <select
                                id="defaultVideoQuality"
                                name="defaultVideoQuality"
                                value={formState.defaultVideoQuality}
                                onChange={handleSelectChange}
                                className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="auto">Auto (Recommended)</option>
                                <option value="low">Low (Save Data)</option>
                                <option value="medium">Medium (720p)</option>
                                <option value="high">High (1080p)</option>
                                <option value="ultra">Ultra HD (4K)</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="mb-8">
                    <h3 className="text-lg font-semibold mb-4">
                        App Interface
                    </h3>
                    <div className="space-y-4">
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="darkMode"
                                name="darkMode"
                                checked={formState.darkMode}
                                onChange={handleCheckboxChange}
                                className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500 bg-gray-700 border-gray-500"
                            />
                            <label htmlFor="darkMode" className="ml-2">
                                Use dark mode
                            </label>
                        </div>
                    </div>
                </div>

                <div className="mt-8">
                    <FormButton
                        type="submit"
                        isLoading={isSubmitting}
                        className="bg-blue-600 hover:bg-blue-700 w-auto px-8"
                    >
                        Save Preferences
                    </FormButton>
                </div>
            </form>
        </div>
    );
}
