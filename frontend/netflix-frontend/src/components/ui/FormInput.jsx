import React from "react";

export default function FormInput({
    label,
    name,
    type = "text",
    value,
    onChange,
    onBlur,
    error,
    placeholder,
    required = false,
    disabled = false,
    className = "",
}) {
    return (
        <div className="mb-4">
            {label && (
                <label
                    htmlFor={name}
                    className="block text-sm font-medium mb-1"
                >
                    {label}{" "}
                    {required && <span className="text-red-500">*</span>}
                </label>
            )}
            <input
                id={name}
                name={name}
                type={type}
                value={value}
                onChange={onChange}
                onBlur={onBlur}
                placeholder={placeholder}
                disabled={disabled}
                className={`w-full p-3 bg-gray-700 text-white rounded border ${
                    error ? "border-red-500" : "border-gray-600"
                } focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${className}`}
                aria-invalid={!!error}
                aria-describedby={error ? `${name}-error` : undefined}
            />
            {error && (
                <p id={`${name}-error`} className="mt-1 text-sm text-red-500">
                    {error}
                </p>
            )}
        </div>
    );
}
