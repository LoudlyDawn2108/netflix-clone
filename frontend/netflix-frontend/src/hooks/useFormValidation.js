import { useState, useCallback } from "react";

export default function useFormValidation(initialState, validateFn) {
    const [formData, setFormData] = useState(initialState);
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isValid, setIsValid] = useState(false);

    // Handle input changes
    const handleChange = useCallback((e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    }, []);

    // Validate a single field
    const validateField = useCallback(
        (name) => {
            const fieldErrors = validateFn({ [name]: formData[name] });
            setErrors((prev) => ({ ...prev, ...fieldErrors }));
            return !fieldErrors[name];
        },
        [formData, validateFn]
    );

    // Validate the entire form
    const validateForm = useCallback(() => {
        const formErrors = validateFn(formData);
        setErrors(formErrors);
        setIsValid(Object.keys(formErrors).length === 0);
        return Object.keys(formErrors).length === 0;
    }, [formData, validateFn]);

    // Handle form submission
    const handleSubmit = useCallback(
        async (submitFn) => {
            setIsSubmitting(true);
            setErrors({});

            const isFormValid = validateForm();

            if (isFormValid) {
                try {
                    await submitFn(formData);
                    return true;
                } catch (error) {
                    setErrors({ form: error.message || "An error occurred" });
                    return false;
                } finally {
                    setIsSubmitting(false);
                }
            } else {
                setIsSubmitting(false);
                return false;
            }
        },
        [formData, validateForm]
    );

    return {
        formData,
        setFormData,
        errors,
        setErrors,
        isSubmitting,
        isValid,
        handleChange,
        validateField,
        validateForm,
        handleSubmit,
    };
}
