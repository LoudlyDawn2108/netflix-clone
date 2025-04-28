import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import useFormValidation from "../../hooks/useFormValidation";
import FormInput from "../ui/FormInput";
import FormButton from "../ui/FormButton";

export default function ProfileForm({ onUpdateSuccess }) {
    const { user, setUser } = useAuth();
    const [submitError, setSubmitError] = useState("");
    const [updateSuccess, setUpdateSuccess] = useState(false);

    // Initial form data from user context
    const initialForm = {
        username: user?.username || "",
        name: user?.name || "",
        email: user?.email || "",
        phone: user?.phone || "",
        preferences: {
            emailNotifications: user?.preferences?.emailNotifications || false,
            darkMode: user?.preferences?.darkMode || true,
            autoplayTrailers: user?.preferences?.autoplayTrailers || true,
        },
    };

    // Define validation rules
    const validateForm = (values) => {
        const errors = {};

        // Username validation
        if (!values.username?.trim()) {
            errors.username = "Username is required";
        } else if (values.username.length < 3) {
            errors.username = "Username must be at least 3 characters";
        }

        // Name validation (optional)
        if (values.name && values.name.length > 50) {
            errors.name = "Name cannot exceed 50 characters";
        }

        // Email validation
        if (!values.email?.trim()) {
            errors.email = "Email is required";
        } else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.email)) {
            errors.email = "Invalid email format";
        }

        // Phone validation (optional)
        if (values.phone && !/^\+?[\d\s()-]{7,20}$/.test(values.phone)) {
            errors.phone = "Invalid phone number format";
        }

        return errors;
    };

    const {
        formData,
        errors,
        isSubmitting,
        handleChange,
        validateField,
        handleSubmit,
    } = useFormValidation(initialForm, validateForm);

    // Handle preference checkboxes
    const handlePreferenceChange = (e) => {
        const { name, checked } = e.target;
        const updatedFormData = {
            ...formData,
            preferences: {
                ...formData.preferences,
                [name]: checked,
            },
        };
        // Update form state
        formData.preferences[name] = checked;
    };

    // Handle form submission
    const submitForm = async (data) => {
        try {
            setSubmitError("");
            setUpdateSuccess(false);

            // Call API to update user profile
            // Simulating API call for now
            await new Promise((resolve) => setTimeout(resolve, 800));

            // Update user context with new data
            const updatedUser = {
                ...user,
                ...data,
            };
            setUser(updatedUser);

            // Show success message
            setUpdateSuccess(true);

            // Callback to parent component if provided
            if (onUpdateSuccess) {
                onUpdateSuccess(updatedUser);
            }

            // Hide success message after 3 seconds
            setTimeout(() => setUpdateSuccess(false), 3000);

            return updatedUser;
        } catch (err) {
            setSubmitError(err.message || "Failed to update profile");
            throw err;
        }
    };

    return (
        <div className="bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-6">Edit Profile</h2>

            {/* Success message */}
            {updateSuccess && (
                <div className="mb-6 bg-green-900/30 border border-green-500 text-green-200 px-4 py-3 rounded">
                    Profile updated successfully!
                </div>
            )}

            {/* Error message */}
            {submitError && (
                <div className="mb-6 bg-red-900/30 border border-red-500 text-red-200 px-4 py-3 rounded">
                    {submitError}
                </div>
            )}

            {/* Profile form */}
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    handleSubmit(submitForm);
                }}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormInput
                        label="Username"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        onBlur={() => validateField("username")}
                        error={errors.username}
                        required
                    />

                    <FormInput
                        label="Full Name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        onBlur={() => validateField("name")}
                        error={errors.name}
                        placeholder="Your display name"
                    />

                    <FormInput
                        label="Email"
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        onBlur={() => validateField("email")}
                        error={errors.email}
                        required
                    />

                    <FormInput
                        label="Phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        onBlur={() => validateField("phone")}
                        error={errors.phone}
                        placeholder="Optional contact number"
                    />
                </div>

                {/* Preferences section */}
                <div className="mt-8">
                    <h3 className="text-lg font-semibold mb-4">Preferences</h3>

                    <div className="space-y-3">
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="emailNotifications"
                                name="emailNotifications"
                                checked={
                                    formData.preferences.emailNotifications
                                }
                                onChange={handlePreferenceChange}
                                className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500 bg-gray-700 border-gray-500"
                            />
                            <label
                                htmlFor="emailNotifications"
                                className="ml-2"
                            >
                                Receive email notifications
                            </label>
                        </div>

                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="darkMode"
                                name="darkMode"
                                checked={formData.preferences.darkMode}
                                onChange={handlePreferenceChange}
                                className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500 bg-gray-700 border-gray-500"
                            />
                            <label htmlFor="darkMode" className="ml-2">
                                Use dark mode
                            </label>
                        </div>

                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="autoplayTrailers"
                                name="autoplayTrailers"
                                checked={formData.preferences.autoplayTrailers}
                                onChange={handlePreferenceChange}
                                className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500 bg-gray-700 border-gray-500"
                            />
                            <label htmlFor="autoplayTrailers" className="ml-2">
                                Autoplay trailers
                            </label>
                        </div>
                    </div>
                </div>

                {/* Submit button */}
                <div className="mt-8">
                    <FormButton
                        type="submit"
                        isLoading={isSubmitting}
                        loadingText="Saving changes..."
                        className="md:w-auto md:px-8"
                    >
                        Save Changes
                    </FormButton>
                </div>
            </form>
        </div>
    );
}
