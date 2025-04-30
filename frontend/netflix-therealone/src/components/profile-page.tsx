import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface ProfileData {
    name: string;
    email: string;
    plan: string;
    nextBillingDate: string;
    avatarUrl: string;
}

export default function ProfilePage() {
    const [isEditing, setIsEditing] = useState(false);

    // Mock profile data - in a real app this would come from an API
    const [profileData, setProfileData] = useState<ProfileData>({
        name: "John Doe",
        email: "john.doe@example.com",
        plan: "Premium",
        nextBillingDate: "May 15, 2025",
        avatarUrl:
            "https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png",
    });

    const [formData, setFormData] = useState<ProfileData>(profileData);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // In a real app, we would send the updated profile to an API
        setProfileData(formData);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setFormData(profileData);
        setIsEditing(false);
    };

    return (
        <div className="min-h-screen pt-24 pb-16 px-4 md:px-8">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-3xl font-bold mb-8">Account</h1>

                <div className="bg-zinc-900 rounded-lg overflow-hidden">
                    {/* Profile Header */}
                    <div className="p-6 md:p-8 border-b border-zinc-800 flex items-center justify-between">
                        <div className="flex items-center">
                            <img
                                src={profileData.avatarUrl}
                                alt="Profile Avatar"
                                className="w-20 h-20 rounded-md mr-6"
                            />
                            <div>
                                <h2 className="text-2xl font-medium">
                                    {profileData.name}
                                </h2>
                                <p className="text-gray-400">
                                    {profileData.email}
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            className="bg-transparent border-white text-white hover:bg-zinc-800"
                            onClick={() => setIsEditing(!isEditing)}
                        >
                            {isEditing ? "Cancel" : "Edit Profile"}
                        </Button>
                    </div>

                    {/* Profile Information */}
                    <div className="p-6 md:p-8">
                        {isEditing ? (
                            <form onSubmit={handleSubmit}>
                                <div className="space-y-6">
                                    <div>
                                        <label
                                            className="block text-sm font-medium mb-2"
                                            htmlFor="name"
                                        >
                                            Name
                                        </label>
                                        <Input
                                            id="name"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            className="bg-zinc-800 border-zinc-700"
                                        />
                                    </div>

                                    <div>
                                        <label
                                            className="block text-sm font-medium mb-2"
                                            htmlFor="email"
                                        >
                                            Email
                                        </label>
                                        <Input
                                            id="email"
                                            name="email"
                                            type="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            className="bg-zinc-800 border-zinc-700"
                                        />
                                    </div>

                                    <div className="pt-4 flex justify-end gap-4">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="bg-transparent border-zinc-600"
                                            onClick={handleCancel}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="submit"
                                            className="bg-red-600 hover:bg-red-700"
                                        >
                                            Save Changes
                                        </Button>
                                    </div>
                                </div>
                            </form>
                        ) : (
                            <div className="space-y-8">
                                <div>
                                    <h3 className="text-lg font-medium mb-4">
                                        Subscription Details
                                    </h3>
                                    <div className="bg-zinc-800 p-4 rounded-md">
                                        <div className="flex justify-between items-center mb-3">
                                            <div>
                                                <p className="font-medium">
                                                    {profileData.plan} Plan
                                                </p>
                                                <p className="text-sm text-gray-400">
                                                    Ultra HD + Watch on 4
                                                    devices at the same time
                                                </p>
                                            </div>
                                            <Link to="/plans">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="bg-transparent border-zinc-600"
                                                >
                                                    Change Plan
                                                </Button>
                                            </Link>
                                        </div>
                                        <div className="text-sm text-gray-400">
                                            <p>
                                                Next billing date:{" "}
                                                {profileData.nextBillingDate}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-lg font-medium mb-4">
                                        Billing History
                                    </h3>
                                    <div className="bg-zinc-800 p-4 rounded-md">
                                        <div className="space-y-3">
                                            <div className="flex justify-between">
                                                <div>
                                                    <p className="font-medium">
                                                        April 15, 2025
                                                    </p>
                                                    <p className="text-sm text-gray-400">
                                                        Premium Plan - Monthly
                                                    </p>
                                                </div>
                                                <p>$19.99</p>
                                            </div>
                                            <div className="flex justify-between">
                                                <div>
                                                    <p className="font-medium">
                                                        March 15, 2025
                                                    </p>
                                                    <p className="text-sm text-gray-400">
                                                        Premium Plan - Monthly
                                                    </p>
                                                </div>
                                                <p>$19.99</p>
                                            </div>
                                            <div className="flex justify-between">
                                                <div>
                                                    <p className="font-medium">
                                                        February 15, 2025
                                                    </p>
                                                    <p className="text-sm text-gray-400">
                                                        Premium Plan - Monthly
                                                    </p>
                                                </div>
                                                <p>$19.99</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-lg font-medium mb-4">
                                        Security
                                    </h3>
                                    <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
                                        <Button
                                            variant="outline"
                                            className="bg-transparent border-zinc-600 text-left justify-start"
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                className="h-5 w-5 mr-2"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            >
                                                <rect
                                                    x="3"
                                                    y="11"
                                                    width="18"
                                                    height="11"
                                                    rx="2"
                                                    ry="2"
                                                ></rect>
                                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                            </svg>
                                            Change Password
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="bg-transparent border-zinc-600 text-left justify-start"
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                className="h-5 w-5 mr-2"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            >
                                                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                                            </svg>
                                            Manage Devices
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="bg-transparent border-zinc-600 text-left justify-start"
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                className="h-5 w-5 mr-2"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            >
                                                <path d="M18 15v3H6v3"></path>
                                                <path d="M6 9v-3h12V3"></path>
                                                <path d="M12 22v-8"></path>
                                                <path d="M12 11V3"></path>
                                            </svg>
                                            Sign out of all devices
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
