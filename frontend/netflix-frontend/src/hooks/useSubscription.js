import { useState, useEffect, useCallback } from "react";
import {
    getPlans,
    getCurrentSubscription,
    createSubscription,
    cancelSubscription,
} from "../services/plans";

/**
 * Custom hook to manage subscription state and operations
 * @returns {Object} Subscription state and operations
 */
export function useSubscription() {
    const [plans, setPlans] = useState([]);
    const [subscription, setSubscription] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [processing, setProcessing] = useState(false);

    // Fetch plans and current subscription
    const fetchSubscriptionData = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            // Fetch both in parallel
            const [plansData, subscriptionData] = await Promise.all([
                getPlans(),
                getCurrentSubscription(),
            ]);

            setPlans(plansData || []);
            setSubscription(subscriptionData);
        } catch (err) {
            console.error("Error loading subscription data:", err);
            setError(err.message || "Failed to load subscription information");
        } finally {
            setLoading(false);
        }
    }, []);

    // Load data on mount
    useEffect(() => {
        fetchSubscriptionData();
    }, [fetchSubscriptionData]);

    // Subscribe to a plan
    const subscribe = useCallback(async (planId, paymentMethod) => {
        if (!planId || !paymentMethod) {
            setError("Plan ID and payment method are required");
            return null;
        }

        setProcessing(true);
        setError(null);

        try {
            const data = await createSubscription({
                planId,
                paymentMethod,
            });

            setSubscription(data);
            return data;
        } catch (err) {
            console.error("Error creating subscription:", err);
            setError(err.message || "Failed to process subscription");
            return null;
        } finally {
            setProcessing(false);
        }
    }, []);

    // Cancel the current subscription
    const cancel = useCallback(async () => {
        if (!subscription?.id) {
            setError("No active subscription to cancel");
            return false;
        }

        setProcessing(true);
        setError(null);

        try {
            const result = await cancelSubscription(subscription.id);

            if (result.success) {
                // Update the local subscription state to reflect cancellation
                setSubscription((prev) =>
                    prev
                        ? {
                              ...prev,
                              cancelAtPeriodEnd: true,
                          }
                        : null
                );
            }

            return result;
        } catch (err) {
            console.error("Error cancelling subscription:", err);
            setError(err.message || "Failed to cancel subscription");
            return false;
        } finally {
            setProcessing(false);
        }
    }, [subscription]);

    // Get the current plan details
    const currentPlan = subscription?.planId
        ? plans.find((plan) => plan.id === subscription.planId)
        : null;

    return {
        plans,
        subscription,
        currentPlan,
        loading,
        error,
        processing,
        subscribe,
        cancel,
        refresh: fetchSubscriptionData,
        isSubscribed: !!subscription && !subscription.cancelAtPeriodEnd,
        isCancelled: !!subscription?.cancelAtPeriodEnd,
    };
}
