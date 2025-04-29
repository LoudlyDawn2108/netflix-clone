import React, { createContext, useState, useEffect, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { analytics } from "../services/analytics";
import {
    login,
    signup,
    logout,
    verifyToken,
    refreshToken,
} from "../services/auth";

// Create context
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();

    // Check for existing token on mount
    useEffect(() => {
        const checkAuth = async () => {
            try {
                setIsLoading(true);
                const token = localStorage.getItem("auth_token");
                if (token) {
                    // Verify token validity
                    const userData = await verifyToken(token);
                    if (userData) {
                        setUser(userData);

                        // Track authenticated user in analytics
                        analytics.setUserId(userData.id, {
                            email: userData.email,
                            username: userData.username,
                            accountCreated: userData.createdAt,
                            subscription: userData.subscription,
                        });
                    } else {
                        // Token invalid, attempt to refresh
                        const newToken = await refreshToken();
                        if (newToken) {
                            const refreshedUserData =
                                await verifyToken(newToken);
                            setUser(refreshedUserData);

                            // Track refreshed user in analytics
                            analytics.setUserId(refreshedUserData.id, {
                                email: refreshedUserData.email,
                                username: refreshedUserData.username,
                                accountCreated: refreshedUserData.createdAt,
                                subscription: refreshedUserData.subscription,
                            });
                        }
                    }
                }
            } catch (err) {
                console.error("Auth verification failed", err);
                setError(err.message || "Authentication failed");
                localStorage.removeItem("auth_token");
            } finally {
                setIsLoading(false);
            }
        };

        checkAuth();
    }, []);

    // Handle login
    const handleLogin = async (email, password) => {
        try {
            setIsLoading(true);
            const { user: userData, token } = await login(email, password);
            localStorage.setItem("auth_token", token);
            setUser(userData);

            // Track successful login in analytics
            analytics.trackLogin(
                userData.id,
                {
                    email: userData.email,
                    username: userData.username,
                    lastLogin: new Date().toISOString(),
                },
                {
                    method: "email",
                }
            );

            // Redirect after login
            const redirectUrl = location.state?.from?.pathname || "/";
            navigate(redirectUrl, { replace: true });
            return userData;
        } catch (err) {
            setError(err.message || "Login failed");

            // Track failed login attempt
            analytics.track("error_authentication_error", {
                error_type: "login_failed",
                error_message: err.message || "Invalid credentials",
            });

            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    // Handle signup
    const handleSignup = async (username, email, password) => {
        try {
            setIsLoading(true);
            const { user: userData, token } = await signup(
                username,
                email,
                password
            );
            localStorage.setItem("auth_token", token);
            setUser(userData);

            // Track successful signup in analytics
            analytics.trackSignup(
                userData.id,
                {
                    email: userData.email,
                    username: userData.username,
                    accountCreated: new Date().toISOString(),
                },
                {
                    method: "email",
                }
            );

            // Redirect after signup
            navigate("/", { replace: true });
            return userData;
        } catch (err) {
            setError(err.message || "Signup failed");

            // Track failed signup attempt
            analytics.track("error_authentication_error", {
                error_type: "signup_failed",
                error_message: err.message || "Signup failed",
            });

            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    // Handle logout
    const handleLogout = async () => {
        try {
            await logout();

            // Track logout in analytics before clearing user ID
            if (user) {
                analytics.track("conversion_logout", {
                    userId: user.id,
                });
            }

            // Clear user data in analytics
            analytics.clearUserId();

            localStorage.removeItem("auth_token");
            setUser(null);
            navigate("/login", { replace: true });
        } catch (err) {
            setError(err.message || "Logout failed");
        }
    };

    // Update user profile
    const updateUserProfile = (updatedUser) => {
        setUser((prevUser) => {
            const newUser = { ...prevUser, ...updatedUser };

            // Update user traits in analytics
            if (newUser.id) {
                analytics.setUserTraits({
                    email: newUser.email,
                    username: newUser.username,
                    profileUpdated: new Date().toISOString(),
                    ...updatedUser, // Include any other updated fields
                });

                // Track profile update event
                analytics.track("engagement_profile_update", {
                    updatedFields: Object.keys(updatedUser),
                });
            }

            return newUser;
        });
    };

    // Context value
    const contextValue = {
        user,
        isAuthenticated: !!user,
        isLoading,
        error,
        login: handleLogin,
        signup: handleSignup,
        logout: handleLogout,
        updateUserProfile,
        clearError: () => setError(null),
    };

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};

// Custom hook for easy access to auth context
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};

export default AuthContext;
