import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import useFormValidation from "../../hooks/useFormValidation";
import FormInput from "../ui/FormInput";
import FormButton from "../ui/FormButton";

export default function PasswordResetForm({ onSuccess }) {
    const { user } = useAuth();
    const [submitError, setSubmitError] = useState("");

    // Initial form data
    const initialForm = {
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    };

    // Define validation rules
    const validateForm = (values) => {
        const errors = {};

        // Current password validation
        if (!values.currentPassword) {
            errors.currentPassword = "Current password is required";
        }

        // New password validation
        if (!values.newPassword) {
            errors.newPassword = "New password is required";
        } else if (values.newPassword.length < 8) {
            errors.newPassword = "Password must be at least 8 characters";
        } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(values.newPassword)) {
            errors.newPassword =
                "Password must contain uppercase, lowercase, and a number";
        }

        // Confirm password validation
        if (!values.confirmPassword) {
            errors.confirmPassword = "Please confirm your new password";
        } else if (values.confirmPassword !== values.newPassword) {
            errors.confirmPassword = "Passwords don't match";
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
        resetForm,
    } = useFormValidation(initialForm, validateForm);

    // Handle form submission
    const submitForm = async (data) => {
        try {
            setSubmitError("");

            // Simulate API call
            await new Promise((resolve) => setTimeout(resolve, 1000));

            // Reset form after successful submission
            resetForm();

            // Call the success callback
            if (onSuccess) {
                onSuccess();
            }
        } catch (err) {
            setSubmitError(
                err.message || "Failed to update password. Please try again."
            );
            throw err;
        }
    };

    return (
        <div className="bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-6">Change Password</h2>

            {/* Error message */}
            {submitError && (
                <div className="mb-6 bg-red-900/30 border border-red-500 text-red-200 px-4 py-3 rounded">
                    {submitError}
                </div>
            )}

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    handleSubmit(submitForm);
                }}
            >
                <div className="space-y-4">
                    <FormInput
                        label="Current Password"
                        type="password"
                        name="currentPassword"
                        value={formData.currentPassword}
                        onChange={handleChange}
                        onBlur={() => validateField("currentPassword")}
                        error={errors.currentPassword}
                        required
                    />

                    <FormInput
                        label="New Password"
                        type="password"
                        name="newPassword"
                        value={formData.newPassword}
                        onChange={handleChange}
                        onBlur={() => validateField("newPassword")}
                        error={errors.newPassword}
                        required
                    />

                    <FormInput
                        label="Confirm New Password"
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        onBlur={() => validateField("confirmPassword")}
                        error={errors.confirmPassword}
                        required
                    />
                </div>

                <div className="mt-8">
                    <FormButton
                        type="submit"
                        isLoading={isSubmitting}
                        className="bg-blue-600 hover:bg-blue-700 w-auto px-8"
                    >
                        Update Password
                    </FormButton>
                </div>

                <div className="mt-4">
                    <button
                        type="button"
                        className="text-blue-400 hover:text-blue-300 hover:underline text-sm"
                    >
                        Forgot your password?
                    </button>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-700">
                    <h3 className="text-lg font-medium mb-4">
                        Security Recommendations
                    </h3>
                    <ul className="list-disc pl-5 space-y-2 text-sm text-gray-300">
                        <li>
                            Use a password that's at least 8 characters long
                        </li>
                        <li>
                            Include uppercase and lowercase letters, numbers,
                            and symbols
                        </li>
                        <li>Don't reuse passwords from other websites</li>
                        <li>
                            Enable two-factor authentication for additional
                            security
                        </li>
                    </ul>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-700">
                    <h3 className="text-lg font-medium mb-4">
                        Two-Factor Authentication
                    </h3>
                    <p className="mb-4 text-gray-300">
                        Add an extra layer of security by enabling two-factor
                        authentication. Once enabled, you'll need to enter a
                        code from your phone when logging in.
                    </p>
                    <button
                        type="button"
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-medium"
                    >
                        Enable Two-Factor Authentication
                    </button>
                </div>
            </form>
        </div>
    );
}
