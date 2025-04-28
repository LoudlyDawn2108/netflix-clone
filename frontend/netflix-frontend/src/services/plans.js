import api from "./api";

// Flag for using mock data during development
const USE_MOCK_DATA = true;

/**
 * Get available subscription plans
 * @returns {Promise<Array>} List of available plans
 */
export async function getPlans() {
    if (USE_MOCK_DATA) {
        return generateMockPlans();
    }

    return api("/plans");
}

/**
 * Create a new subscription for the current user
 * @param {Object} data - Subscription data
 * @param {string} data.planId - ID of the selected plan
 * @param {Object} data.paymentMethod - Payment method details
 * @returns {Promise<Object>} Subscription details
 */
export async function createSubscription(data) {
    if (USE_MOCK_DATA) {
        return mockCreateSubscription(data);
    }

    return api("/subscriptions", {
        method: "POST",
        body: data,
    });
}

/**
 * Cancel an active subscription
 * @param {string} subscriptionId - ID of subscription to cancel
 * @returns {Promise<Object>} Cancellation confirmation
 */
export async function cancelSubscription(subscriptionId) {
    if (USE_MOCK_DATA) {
        return mockCancelSubscription(subscriptionId);
    }

    return api(`/subscriptions/${subscriptionId}/cancel`, {
        method: "POST",
    });
}

/**
 * Get current user's active subscription
 * @returns {Promise<Object|null>} Current subscription or null if no active subscription
 */
export async function getCurrentSubscription() {
    if (USE_MOCK_DATA) {
        return mockGetCurrentSubscription();
    }

    return api("/subscriptions/me");
}

// Mock data generators
function generateMockPlans() {
    const plans = [
        {
            id: "plan-basic",
            name: "Basic",
            description:
                "Good video quality in SD (480p). Watch on any phone, tablet, computer or TV.",
            price: 8.99,
            currency: "USD",
            features: [
                "Watch on 1 device at a time",
                "Unlimited movies and TV shows",
                "Download on 1 device",
                "Standard Definition (SD)",
            ],
            videoQuality: "SD",
            resolution: "480p",
            maxDevices: 1,
            downloadDevices: 1,
            popular: false,
        },
        {
            id: "plan-standard",
            name: "Standard",
            description:
                "Great video quality in Full HD (1080p). Watch on any phone, tablet, computer or TV.",
            price: 13.99,
            currency: "USD",
            features: [
                "Watch on 2 devices at a time",
                "Unlimited movies and TV shows",
                "Download on 2 devices",
                "Full High Definition (FHD)",
            ],
            videoQuality: "FHD",
            resolution: "1080p",
            maxDevices: 2,
            downloadDevices: 2,
            popular: true,
        },
        {
            id: "plan-premium",
            name: "Premium",
            description:
                "Our best video quality in Ultra HD (4K) and HDR. Watch on any phone, tablet, computer or TV.",
            price: 17.99,
            currency: "USD",
            features: [
                "Watch on 4 devices at a time",
                "Unlimited movies and TV shows",
                "Download on 6 devices",
                "Ultra High Definition (UHD) & HDR",
            ],
            videoQuality: "UHD",
            resolution: "4K + HDR",
            maxDevices: 4,
            downloadDevices: 6,
            popular: false,
        },
    ];

    return Promise.resolve(plans);
}

function mockCreateSubscription(data) {
    // Simulate some API validation
    if (!data.planId) {
        return Promise.reject(new Error("Plan ID is required"));
    }

    if (!data.paymentMethod || !data.paymentMethod.token) {
        return Promise.reject(new Error("Payment method is required"));
    }

    // Create mock subscription object
    const subscription = {
        id: `sub-${Date.now()}`,
        status: "active",
        planId: data.planId,
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString(), // 30 days later
        cancelAtPeriodEnd: false,
        createdAt: new Date().toISOString(),
        paymentMethod: {
            last4: "1234", // Mock last 4 digits
            brand: "visa",
            expiryMonth: 12,
            expiryYear: 2025,
        },
    };

    // Add simulated network delay
    return new Promise((resolve) => {
        setTimeout(() => resolve(subscription), 800);
    });
}

function mockCancelSubscription() {
    // Add simulated network delay
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                success: true,
                cancelledAt: new Date().toISOString(),
                effectiveAt: new Date(
                    Date.now() + 30 * 24 * 60 * 60 * 1000
                ).toISOString(),
                message:
                    "Your subscription has been cancelled and will end at the end of the current billing period.",
            });
        }, 600);
    });
}

function mockGetCurrentSubscription() {
    // Randomly determine if user has an active subscription (70% chance)
    const hasSubscription = Math.random() < 0.7;

    if (!hasSubscription) {
        return Promise.resolve(null);
    }

    // Random plan selection
    const plans = ["plan-basic", "plan-standard", "plan-premium"];
    const planId = plans[Math.floor(Math.random() * plans.length)];

    // Create mock subscription
    const subscription = {
        id: `sub-${Date.now()}`,
        status: "active",
        planId,
        currentPeriodStart: new Date(
            Date.now() - 15 * 24 * 60 * 60 * 1000
        ).toISOString(), // 15 days ago
        currentPeriodEnd: new Date(
            Date.now() + 15 * 24 * 60 * 60 * 1000
        ).toISOString(), // 15 days later
        cancelAtPeriodEnd: Math.random() < 0.2, // 20% chance subscription is already cancelled
        createdAt: new Date(
            Date.now() - 90 * 24 * 60 * 60 * 1000
        ).toISOString(), // 90 days ago
        paymentMethod: {
            last4: "5678",
            brand: Math.random() < 0.7 ? "visa" : "mastercard",
            expiryMonth: 10,
            expiryYear: 2024,
        },
    };

    return Promise.resolve(subscription);
}
