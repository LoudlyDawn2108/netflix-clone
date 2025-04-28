import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signup } from "../../services/auth";
import { useAuth } from "../../context/AuthContext";
import useFormValidation from "../../hooks/useFormValidation";
import FormInput from "../ui/FormInput";
import FormButton from "../ui/FormButton";

const initialFormState = {
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
};

export default function SignupForm() {
    const navigate = useNavigate();
    const { setUser } = useAuth();
    const [submitError, setSubmitError] = useState("");

    // Validation function
    const validateForm = (values) => {
        const errors = {};

        // Username validation
        if (!values.username) {
            errors.username = "Username is required";
        } else if (values.username.length < 3) {
            errors.username = "Username must be at least 3 characters";
        } else if (values.username.length > 50) {
            errors.username = "Username cannot exceed 50 characters";
        }

        // Email validation
        if (!values.email) {
            errors.email = "Email is required";
        } else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.email)) {
            errors.email = "Invalid email address";
        }

        // Password validation
        if (!values.password) {
            errors.password = "Password is required";
        } else if (values.password.length < 6) {
            errors.password = "Password must be at least 6 characters";
        } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(values.password)) {
            errors.password =
                "Password must contain uppercase, lowercase, and number";
        }

        // Confirm password validation
        if (values.confirmPassword !== values.password) {
            errors.confirmPassword = "Passwords do not match";
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
    } = useFormValidation(initialFormState, validateForm);

    // Handle form submission
    const submitForm = async (data) => {
        try {
            setSubmitError("");
            const response = await signup(
                data.username,
                data.email,
                data.password
            );
            setUser(response.user);
            navigate("/");
        } catch (err) {
            setSubmitError(
                err.message || "Failed to sign up. Please try again."
            );
            throw err; // Re-throw to be caught by the form handler
        }
    };

    return (
        <div className="w-full max-w-md mx-auto">
            <div className="bg-gray-800 shadow-lg rounded-lg p-6 md:p-8">
                <h2 className="text-2xl font-bold text-center mb-6">
                    Create Account
                </h2>

                {submitError && (
                    <div className="bg-red-500 bg-opacity-20 border border-red-500 text-red-500 px-4 py-3 rounded mb-4">
                        {submitError}
                    </div>
                )}

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSubmit(submitForm);
                    }}
                >
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
                        label="Email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        onBlur={() => validateField("email")}
                        error={errors.email}
                        required
                    />

                    <FormInput
                        label="Password"
                        name="password"
                        type="password"
                        value={formData.password}
                        onChange={handleChange}
                        onBlur={() => validateField("password")}
                        error={errors.password}
                        required
                    />

                    <FormInput
                        label="Confirm Password"
                        name="confirmPassword"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        onBlur={() => validateField("confirmPassword")}
                        error={errors.confirmPassword}
                        required
                    />

                    <div className="mt-6">
                        <FormButton
                            type="submit"
                            isLoading={isSubmitting}
                            loadingText="Creating account..."
                        >
                            Sign Up
                        </FormButton>
                    </div>

                    <div className="mt-4 text-center text-sm">
                        <span>Already have an account? </span>
                        <a
                            href="/login"
                            className="text-blue-500 hover:text-blue-400 font-medium"
                            onClick={(e) => {
                                e.preventDefault();
                                navigate("/login");
                            }}
                        >
                            Log in
                        </a>
                    </div>
                </form>
            </div>
        </div>
    );
}
