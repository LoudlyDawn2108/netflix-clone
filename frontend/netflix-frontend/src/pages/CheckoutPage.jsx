import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSubscription } from "../hooks/useSubscription";
import FormInput from "../components/ui/FormInput";
import FormButton from "../components/ui/FormButton";

export default function CheckoutPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { plans, subscribe, loading, error, processing } = useSubscription();

    // Get planId from query params
    const searchParams = new URLSearchParams(location.search);
    const planId = searchParams.get("planId");

    // Payment form state
    const [formData, setFormData] = useState({
        cardNumber: "",
        cardName: "",
        expiryDate: "",
        cvv: "",
        billingAddress: "",
        city: "",
        zipCode: "",
        country: "US",
    });

    const [formErrors, setFormErrors] = useState({});
    const [selectedPlan, setSelectedPlan] = useState(null);

    // Load selected plan details
    useEffect(() => {
        if (planId && plans.length > 0) {
            const plan = plans.find((p) => p.id === planId);
            if (plan) {
                setSelectedPlan(plan);
            } else {
                // Invalid plan ID, navigate back to plans page
                navigate("/plans");
            }
        }
    }, [planId, plans, navigate]);

    // If no plan is selected, redirect to plans page
    useEffect(() => {
        if (!planId) {
            navigate("/plans");
        }
    }, [planId, navigate]);

    // Handle form input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value,
        });

        // Clear error for this field
        if (formErrors[name]) {
            setFormErrors({
                ...formErrors,
                [name]: null,
            });
        }
    };

    // Validate form
    const validateForm = () => {
        const errors = {};

        // Card number validation (basic)
        if (!formData.cardNumber) {
            errors.cardNumber = "Card number is required";
        } else if (!/^\d{16}$/.test(formData.cardNumber.replace(/\s/g, ""))) {
            errors.cardNumber = "Please enter a valid 16-digit card number";
        }

        // Card name validation
        if (!formData.cardName) {
            errors.cardName = "Cardholder name is required";
        }

        // Expiry date validation
        if (!formData.expiryDate) {
            errors.expiryDate = "Expiry date is required";
        } else if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(formData.expiryDate)) {
            errors.expiryDate = "Please enter a valid expiry date (MM/YY)";
        }

        // CVV validation
        if (!formData.cvv) {
            errors.cvv = "CVV is required";
        } else if (!/^\d{3,4}$/.test(formData.cvv)) {
            errors.cvv = "Please enter a valid CVV";
        }

        // Address validation
        if (!formData.billingAddress) {
            errors.billingAddress = "Billing address is required";
        }

        // City validation
        if (!formData.city) {
            errors.city = "City is required";
        }

        // Zip code validation
        if (!formData.zipCode) {
            errors.zipCode = "ZIP code is required";
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        // Create mock payment method token
        const paymentMethod = {
            token: `pm_${Date.now()}`,
            type: "card",
            card: {
                last4: formData.cardNumber.slice(-4),
                brand: getCardType(formData.cardNumber),
                expMonth: parseInt(formData.expiryDate.split("/")[0], 10),
                expYear: parseInt(`20${formData.expiryDate.split("/")[1]}`, 10),
            },
        };

        // Call the subscribe method from useSubscription hook
        const result = await subscribe(planId, paymentMethod);

        if (result) {
            // Subscription successful, navigate to success page
            navigate("/checkout/success");
        }
    };

    // Helper function to determine card type from number
    const getCardType = (number) => {
        const firstDigit = number.charAt(0);

        if (firstDigit === "4") return "visa";
        if (firstDigit === "5") return "mastercard";
        if (firstDigit === "3") return "amex";
        if (firstDigit === "6") return "discover";

        return "unknown";
    };

    // Format price with currency
    const formatPrice = (price, currency = "USD") => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency,
            minimumFractionDigits: 2,
        }).format(price);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
                    <p className="mt-4">Loading checkout...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white py-12">
            <div className="container mx-auto px-4">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-3xl font-bold mb-8 text-center">
                        Complete Your Subscription
                    </h1>

                    {error && (
                        <div className="bg-red-900/30 border border-red-500 text-red-200 p-4 rounded-lg mb-6">
                            <p>{error}</p>
                        </div>
                    )}

                    <div className="flex flex-col lg:flex-row gap-8">
                        {/* Payment form */}
                        <div className="flex-1">
                            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
                                <h2 className="text-xl font-semibold mb-4">
                                    Payment Details
                                </h2>

                                <form onSubmit={handleSubmit}>
                                    <div className="mb-4">
                                        <FormInput
                                            label="Card Number"
                                            type="text"
                                            name="cardNumber"
                                            value={formData.cardNumber}
                                            onChange={handleInputChange}
                                            error={formErrors.cardNumber}
                                            placeholder="1234 5678 9012 3456"
                                            maxLength={19}
                                        />
                                    </div>

                                    <div className="mb-4">
                                        <FormInput
                                            label="Cardholder Name"
                                            type="text"
                                            name="cardName"
                                            value={formData.cardName}
                                            onChange={handleInputChange}
                                            error={formErrors.cardName}
                                            placeholder="John Doe"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <FormInput
                                            label="Expiry Date"
                                            type="text"
                                            name="expiryDate"
                                            value={formData.expiryDate}
                                            onChange={handleInputChange}
                                            error={formErrors.expiryDate}
                                            placeholder="MM/YY"
                                            maxLength={5}
                                        />

                                        <FormInput
                                            label="CVV"
                                            type="text"
                                            name="cvv"
                                            value={formData.cvv}
                                            onChange={handleInputChange}
                                            error={formErrors.cvv}
                                            placeholder="123"
                                            maxLength={4}
                                        />
                                    </div>

                                    <hr className="border-gray-700 my-6" />

                                    <h3 className="text-lg font-medium mb-4">
                                        Billing Information
                                    </h3>

                                    <div className="mb-4">
                                        <FormInput
                                            label="Billing Address"
                                            type="text"
                                            name="billingAddress"
                                            value={formData.billingAddress}
                                            onChange={handleInputChange}
                                            error={formErrors.billingAddress}
                                            placeholder="123 Main St"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <FormInput
                                            label="City"
                                            type="text"
                                            name="city"
                                            value={formData.city}
                                            onChange={handleInputChange}
                                            error={formErrors.city}
                                            placeholder="New York"
                                        />

                                        <FormInput
                                            label="ZIP Code"
                                            type="text"
                                            name="zipCode"
                                            value={formData.zipCode}
                                            onChange={handleInputChange}
                                            error={formErrors.zipCode}
                                            placeholder="10001"
                                        />
                                    </div>

                                    <div className="mb-6">
                                        <label className="block text-sm font-medium text-gray-300 mb-1">
                                            Country
                                        </label>
                                        <select
                                            name="country"
                                            value={formData.country}
                                            onChange={handleInputChange}
                                            className="w-full py-2 px-3 bg-gray-700 border border-gray-600 rounded-md text-white"
                                        >
                                            <option value="US">
                                                United States
                                            </option>
                                            <option value="CA">Canada</option>
                                            <option value="GB">
                                                United Kingdom
                                            </option>
                                            <option value="AU">
                                                Australia
                                            </option>
                                        </select>
                                    </div>

                                    <FormButton
                                        type="submit"
                                        disabled={processing}
                                        className="w-full"
                                    >
                                        {processing
                                            ? "Processing..."
                                            : "Complete Subscription"}
                                    </FormButton>
                                </form>
                            </div>
                        </div>

                        {/* Order summary */}
                        <div className="lg:w-72">
                            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 sticky top-6">
                                <h2 className="text-xl font-semibold mb-4">
                                    Order Summary
                                </h2>

                                {selectedPlan && (
                                    <>
                                        <div className="mb-4">
                                            <h3 className="font-medium">
                                                {selectedPlan.name} Plan
                                            </h3>
                                            <p className="text-sm text-gray-400">
                                                {selectedPlan.description}
                                            </p>
                                        </div>

                                        <div className="flex justify-between items-center py-3 border-t border-gray-700">
                                            <span className="text-sm">
                                                Monthly fee
                                            </span>
                                            <span className="font-medium">
                                                {formatPrice(
                                                    selectedPlan.price,
                                                    selectedPlan.currency
                                                )}
                                            </span>
                                        </div>

                                        <div className="flex justify-between items-center py-3 border-t border-gray-700">
                                            <span className="text-sm">
                                                Billing cycle
                                            </span>
                                            <span className="text-sm">
                                                Monthly
                                            </span>
                                        </div>

                                        <div className="flex justify-between items-center pt-4 border-t border-gray-700">
                                            <span className="font-semibold">
                                                Total due today
                                            </span>
                                            <span className="font-semibold">
                                                {formatPrice(
                                                    selectedPlan.price,
                                                    selectedPlan.currency
                                                )}
                                            </span>
                                        </div>

                                        <p className="mt-4 text-xs text-gray-400">
                                            Your subscription will automatically
                                            renew each month until you cancel.
                                            You can cancel anytime.
                                        </p>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
