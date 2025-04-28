import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../../services/auth";
import { useAuth } from "../../context/AuthContext";
import useFormValidation from "../../hooks/useFormValidation";
import FormInput from "../ui/FormInput";
import FormButton from "../ui/FormButton";

const initialFormState = {
    email: "",
    password: "",
};

export default function LoginForm() {
    const navigate = useNavigate();
    const { setUser } = useAuth();
    const [submitError, setSubmitError] = useState("");

    // Validation function
    const validateForm = (values) => {
        const errors = {};

        // Email validation
        if (!values.email) {
            errors.email = "Email is required";
        } else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.email)) {
            errors.email = "Invalid email address";
        }

        // Password validation
        if (!values.password) {
            errors.password = "Password is required";
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
            const response = await login(data.email, data.password);
            setUser(response.user);
            navigate("/");
        } catch (err) {
            setSubmitError(err.message || "Invalid email or password");
            throw err; // Re-throw to be caught by the form handler
        }
    };

    return (
        <div className="w-full max-w-md mx-auto">
            <div className="bg-gray-800 shadow-lg rounded-lg p-6 md:p-8">
                <h2 className="text-2xl font-bold text-center mb-6">Sign In</h2>

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

                    <div className="flex justify-end mb-4">
                        <button
                            type="button"
                            className="text-sm text-blue-500 hover:text-blue-400"
                            onClick={() => navigate("/forgot-password")}
                        >
                            Forgot password?
                        </button>
                    </div>

                    <div className="mt-2">
                        <FormButton
                            type="submit"
                            isLoading={isSubmitting}
                            loadingText="Signing in..."
                        >
                            Sign In
                        </FormButton>
                    </div>

                    <div className="mt-6 text-center text-sm">
                        <span>New to Netflix? </span>
                        <a
                            href="/signup"
                            className="text-blue-500 hover:text-blue-400 font-medium"
                            onClick={(e) => {
                                e.preventDefault();
                                navigate("/signup");
                            }}
                        >
                            Sign up now
                        </a>
                    </div>
                </form>
            </div>
        </div>
    );
}
