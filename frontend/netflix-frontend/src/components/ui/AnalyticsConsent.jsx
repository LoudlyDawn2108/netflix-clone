import React, { useState, useEffect } from "react";
import { analytics, PROVIDERS } from "../../services/analytics";

/**
 * Analytics Consent Management Component
 *
 * This component handles user consent for tracking and analytics,
 * providing a UI for users to manage their privacy preferences.
 *
 * Features:
 * - Shows a consent banner on first visit
 * - Provides detailed privacy preference controls
 * - Integrates with the analytics service's consent system
 * - Complies with GDPR, CCPA, and other privacy regulations
 */
const AnalyticsConsent = ({ position = "bottom", showOnMount = true }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [showBanner, setShowBanner] = useState(false);
    const [consentSettings, setConsentSettings] = useState({
        doNotTrack: false,
        anonymizeIp: true,
        providers: {
            [PROVIDERS.GOOGLE_ANALYTICS]: false,
            [PROVIDERS.MIXPANEL]: false,
            [PROVIDERS.CUSTOM]: true,
        },
    });

    // Load consent settings from analytics service on mount
    useEffect(() => {
        if (typeof analytics !== "undefined") {
            // Get current consent settings
            const currentSettings = analytics.userConsent || {};
            setConsentSettings(currentSettings);

            // Show consent banner if no explicit consent has been given
            const hasExplicitConsent = localStorage.getItem(
                "analytics_explicit_consent"
            );
            if (showOnMount && !hasExplicitConsent) {
                setShowBanner(true);
            }
        }
    }, [showOnMount]);

    // Save consent settings to the analytics service
    const saveConsentSettings = () => {
        analytics.updateConsentSettings(consentSettings);
        localStorage.setItem("analytics_explicit_consent", "true");
        setShowBanner(false);

        // Track consent update (only if consent was given)
        if (!consentSettings.doNotTrack) {
            analytics.track("system_privacy_consent_update", {
                doNotTrack: consentSettings.doNotTrack,
                anonymizeIp: consentSettings.anonymizeIp,
                providersEnabled: Object.entries(consentSettings.providers)
                    .filter(([_, enabled]) => enabled)
                    .map(([provider]) => provider),
            });
        }
    };

    // Accept all tracking
    const acceptAll = () => {
        const allEnabled = {
            doNotTrack: false,
            anonymizeIp: false,
            providers: Object.keys(consentSettings.providers).reduce(
                (acc, provider) => {
                    acc[provider] = true;
                    return acc;
                },
                {}
            ),
        };

        setConsentSettings(allEnabled);
        analytics.updateConsentSettings(allEnabled);
        localStorage.setItem("analytics_explicit_consent", "true");
        setShowBanner(false);

        // Track full consent
        analytics.track("system_privacy_consent_granted", {
            consentType: "full",
        });
    };

    // Decline all tracking except essential
    const declineAll = () => {
        const allDisabled = {
            doNotTrack: true,
            anonymizeIp: true,
            providers: Object.keys(consentSettings.providers).reduce(
                (acc, provider) => {
                    // Only allow essential tracking (custom backend in this case)
                    acc[provider] = provider === PROVIDERS.CUSTOM;
                    return acc;
                },
                {}
            ),
        };

        setConsentSettings(allDisabled);
        analytics.updateConsentSettings(allDisabled);
        localStorage.setItem("analytics_explicit_consent", "true");
        setShowBanner(false);
    };

    // Toggle the detailed settings dialog
    const toggleSettings = () => {
        setIsOpen(!isOpen);
    };

    // Handle individual setting changes
    const handleSettingChange = (key, value) => {
        if (key.includes(".")) {
            const [parent, child] = key.split(".");
            setConsentSettings((prev) => ({
                ...prev,
                [parent]: {
                    ...prev[parent],
                    [child]: value,
                },
            }));
        } else {
            setConsentSettings((prev) => ({
                ...prev,
                [key]: value,
            }));
        }
    };

    return (
        <>
            {/* Consent Banner */}
            {showBanner && (
                <div
                    className="fixed z-50 w-full md:max-w-2xl px-4 py-4 bg-gray-900 border border-gray-700 shadow-lg rounded-lg text-white"
                    style={{
                        [position === "bottom" ? "bottom" : "top"]: "1rem",
                        left: "50%",
                        transform: "translateX(-50%)",
                    }}
                >
                    <div className="flex flex-col space-y-4">
                        <div className="flex justify-between items-start">
                            <h3 className="text-lg font-bold">
                                Privacy Preferences
                            </h3>
                            <button
                                onClick={() => setShowBanner(false)}
                                className="text-gray-400 hover:text-white"
                                aria-label="Close privacy banner"
                            >
                                ✕
                            </button>
                        </div>

                        <p className="text-sm text-gray-300">
                            We use cookies and similar technologies to enhance
                            your experience, analyze traffic, and personalize
                            content. By clicking "Accept All", you consent to
                            our use of these technologies. Click "Privacy
                            Settings" to choose which cookies you want to allow,
                            or "Decline All" to use only essential cookies.
                        </p>

                        <div className="text-xs text-gray-400">
                            <a
                                href="/privacy-policy"
                                className="underline hover:text-white"
                            >
                                Privacy Policy
                            </a>
                            {" | "}
                            <a
                                href="/terms"
                                className="underline hover:text-white"
                            >
                                Terms of Service
                            </a>
                        </div>

                        <div className="flex flex-wrap gap-2 justify-end">
                            <button
                                onClick={declineAll}
                                className="px-4 py-2 bg-transparent hover:bg-gray-700 border border-gray-600 rounded text-sm"
                            >
                                Decline All
                            </button>
                            <button
                                onClick={toggleSettings}
                                className="px-4 py-2 bg-transparent hover:bg-gray-700 border border-gray-600 rounded text-sm"
                            >
                                Privacy Settings
                            </button>
                            <button
                                onClick={acceptAll}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm font-medium"
                            >
                                Accept All
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Detailed Settings Modal */}
            {isOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-75 flex items-center justify-center p-4">
                    <div className="bg-gray-900 rounded-lg max-w-md w-full p-6 border border-gray-700">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-white">
                                Privacy Settings
                            </h3>
                            <button
                                onClick={toggleSettings}
                                className="text-gray-400 hover:text-white"
                                aria-label="Close privacy settings"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Essential Tracking */}
                            <div className="pb-4 border-b border-gray-700">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="text-lg font-medium text-white">
                                        Essential
                                    </h4>
                                    <span className="px-2 py-1 bg-gray-700 text-xs rounded text-gray-300">
                                        Always On
                                    </span>
                                </div>
                                <p className="text-sm text-gray-400">
                                    Essential tracking is required for the
                                    service to function properly. This includes
                                    authentication, security, and basic site
                                    functionality.
                                </p>
                            </div>

                            {/* Analytics Tracking */}
                            <div className="pb-4 border-b border-gray-700">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="text-lg font-medium text-white">
                                        Analytics
                                    </h4>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={
                                                !consentSettings.doNotTrack
                                            }
                                            onChange={(e) =>
                                                handleSettingChange(
                                                    "doNotTrack",
                                                    !e.target.checked
                                                )
                                            }
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-gray-300 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                                    </label>
                                </div>
                                <p className="text-sm text-gray-400 mb-3">
                                    Analytics cookies help us understand how
                                    visitors interact with our website. This
                                    information is used to improve the user
                                    experience.
                                </p>

                                {!consentSettings.doNotTrack && (
                                    <div className="space-y-3 pl-4 border-l-2 border-gray-700">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-300">
                                                Google Analytics
                                            </span>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={
                                                        consentSettings
                                                            .providers[
                                                            PROVIDERS
                                                                .GOOGLE_ANALYTICS
                                                        ]
                                                    }
                                                    onChange={(e) =>
                                                        handleSettingChange(
                                                            `providers.${PROVIDERS.GOOGLE_ANALYTICS}`,
                                                            e.target.checked
                                                        )
                                                    }
                                                    className="sr-only peer"
                                                />
                                                <div className="w-9 h-5 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-gray-300 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600"></div>
                                            </label>
                                        </div>

                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-300">
                                                Mixpanel
                                            </span>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={
                                                        consentSettings
                                                            .providers[
                                                            PROVIDERS.MIXPANEL
                                                        ]
                                                    }
                                                    onChange={(e) =>
                                                        handleSettingChange(
                                                            `providers.${PROVIDERS.MIXPANEL}`,
                                                            e.target.checked
                                                        )
                                                    }
                                                    className="sr-only peer"
                                                />
                                                <div className="w-9 h-5 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-gray-300 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600"></div>
                                            </label>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Privacy Options */}
                            <div className="pb-4 border-b border-gray-700">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="text-lg font-medium text-white">
                                        Enhanced Privacy
                                    </h4>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-300">
                                            Anonymize IP Addresses
                                        </span>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={
                                                    consentSettings.anonymizeIp
                                                }
                                                onChange={(e) =>
                                                    handleSettingChange(
                                                        "anonymizeIp",
                                                        e.target.checked
                                                    )
                                                }
                                                className="sr-only peer"
                                            />
                                            <div className="w-9 h-5 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-gray-300 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600"></div>
                                        </label>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    When enabled, we anonymize the last octet of
                                    your IP address to enhance privacy.
                                </p>
                            </div>

                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={toggleSettings}
                                    className="px-4 py-2 bg-transparent hover:bg-gray-700 border border-gray-600 rounded text-sm text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={saveConsentSettings}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm font-medium text-white"
                                >
                                    Save Preferences
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Privacy Settings Toggle Button (always visible) */}
            <button
                onClick={() => {
                    setIsOpen(true);
                    setShowBanner(false);
                }}
                className="fixed bottom-4 left-4 z-40 p-2 bg-gray-800 hover:bg-gray-700 rounded-full shadow-lg border border-gray-700"
                title="Privacy Settings"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-gray-300"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                >
                    <path
                        fillRule="evenodd"
                        d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zm0 16a3 3 0 01-3-3h6a3 3 0 01-3 3z"
                        clipRule="evenodd"
                    />
                </svg>
            </button>
        </>
    );
};

export default AnalyticsConsent;
