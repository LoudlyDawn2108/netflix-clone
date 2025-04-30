import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getCurrentUser, logout } from "../lib/auth-service";
import { Button } from "../components/ui/button";
import type { User } from "../lib/auth-service";

export default function ProfilePage() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Get current user from session storage
        const currentUser = getCurrentUser();
        setUser(currentUser);
        setLoading(false);
    }, []);

    const handleLogout = async () => {
        await logout();
        window.location.href = "/login";
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex justify-center items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-black flex flex-col justify-center items-center p-4">
                <h2 className="text-xl font-bold mb-4">
                    You need to be logged in to view this page
                </h2>
                <Link to="/login">
                    <Button className="bg-red-600 hover:bg-red-700">
                        Sign In
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-20 pb-16">
            <div className="container mx-auto p-4 md:p-6 max-w-4xl">
                <h1 className="text-3xl font-bold mb-6">Account</h1>

                <div className="bg-zinc-900 rounded-md p-6 mb-6">
                    <div className="flex items-center gap-4 mb-6">
                        <img
                            src={user.avatar}
                            alt={user.name}
                            className="w-16 h-16 rounded-md"
                        />
                        <div>
                            <h2 className="text-xl font-bold">{user.name}</h2>
                            <p className="text-gray-400">{user.email}</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center pb-4 border-b border-zinc-800">
                            <div>
                                <h3 className="font-medium">Membership</h3>
                                <p className="text-sm text-gray-400">
                                    Premium Plan
                                </p>
                            </div>
                            <Button variant="outline" size="sm">
                                Manage
                            </Button>
                        </div>

                        <div className="flex justify-between items-center pb-4 border-b border-zinc-800">
                            <div>
                                <h3 className="font-medium">Password</h3>
                                <p className="text-sm text-gray-400">
                                    ********
                                </p>
                            </div>
                            <Button variant="outline" size="sm">
                                Change
                            </Button>
                        </div>

                        <div className="flex justify-between items-center pb-4 border-b border-zinc-800">
                            <div>
                                <h3 className="font-medium">Payment Method</h3>
                                <p className="text-sm text-gray-400">
                                    Visa ending in 1234
                                </p>
                            </div>
                            <Button variant="outline" size="sm">
                                Update
                            </Button>
                        </div>

                        <div className="flex justify-between items-center pb-4">
                            <div>
                                <h3 className="font-medium">
                                    Email Notifications
                                </h3>
                                <p className="text-sm text-gray-400">Enabled</p>
                            </div>
                            <Button variant="outline" size="sm">
                                Manage
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="bg-zinc-900 rounded-md p-6 mb-6">
                    <h2 className="text-xl font-bold mb-4">Viewing Activity</h2>
                    <div className="space-y-2">
                        <Button
                            variant="outline"
                            className="w-full justify-start text-left"
                        >
                            Watch History
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full justify-start text-left"
                        >
                            Ratings
                        </Button>
                    </div>
                </div>

                <Button
                    className="bg-red-600 hover:bg-red-700"
                    onClick={handleLogout}
                >
                    Sign Out
                </Button>
            </div>
        </div>
    );
}
