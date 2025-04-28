import { useState, useEffect, useRef } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { logout } from "../../services/auth";
import ResponsiveContainer from "../ui/ResponsiveContainer";

export default function Header() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);
    const { user, setUser } = useAuth();
    const location = useLocation();
    const searchInputRef = useRef(null);
    const mobileMenuRef = useRef(null);

    // Close mobile menu when route changes
    useEffect(() => {
        setIsMenuOpen(false);
    }, [location]);

    // Check if page is scrolled for transparent/solid header effect
    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 20) {
                setIsScrolled(true);
            } else {
                setIsScrolled(false);
            }
        };

        window.addEventListener("scroll", handleScroll);
        return () => {
            window.removeEventListener("scroll", handleScroll);
        };
    }, []);

    // Focus search input when expanded
    useEffect(() => {
        if (isSearchExpanded && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isSearchExpanded]);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                isMenuOpen &&
                mobileMenuRef.current &&
                !mobileMenuRef.current.contains(event.target)
            ) {
                setIsMenuOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isMenuOpen]);

    // Close menu on escape key
    useEffect(() => {
        const handleEscKey = (event) => {
            if (event.key === "Escape") {
                if (isMenuOpen) setIsMenuOpen(false);
                if (isSearchExpanded) setIsSearchExpanded(false);
            }
        };

        document.addEventListener("keydown", handleEscKey);
        return () => {
            document.removeEventListener("keydown", handleEscKey);
        };
    }, [isMenuOpen, isSearchExpanded]);

    // Handle logout
    async function handleLogout() {
        await logout();
        setUser(null);
    }

    // Style for active navigation links
    const activeLinkClass = "border-b-2 border-netflix-red font-medium";

    // Base styles for navigation links
    const linkBaseClass =
        "py-2 px-3 text-gray-300 hover:text-white transition-colors";

    return (
        <header
            className={`fixed top-0 w-full z-50 transition-all duration-300 ${
                isScrolled
                    ? "bg-netflix-black shadow-lg"
                    : "bg-gradient-to-b from-netflix-black/80 to-transparent"
            }`}
            role="banner"
        >
            <ResponsiveContainer>
                <div className="flex items-center justify-between h-16 md:h-20">
                    {/* Logo */}
                    <Link
                        to="/"
                        className="flex items-center shrink-0"
                        aria-label="Streamflix Home"
                    >
                        <span className="text-netflix-red text-2xl md:text-3xl font-bold tracking-tighter">
                            STREAMFLIX
                        </span>
                    </Link>

                    {/* Main Navigation - Desktop */}
                    <nav
                        className="hidden md:flex items-center space-x-1 mx-4"
                        role="navigation"
                        aria-label="Main Navigation"
                    >
                        <NavLink
                            to="/"
                            end
                            className={({ isActive }) =>
                                `${linkBaseClass} ${isActive ? activeLinkClass : ""}`
                            }
                        >
                            Home
                        </NavLink>
                        <NavLink
                            to="/browse"
                            className={({ isActive }) =>
                                `${linkBaseClass} ${isActive ? activeLinkClass : ""}`
                            }
                        >
                            Browse
                        </NavLink>
                        {user && (
                            <>
                                <NavLink
                                    to="/watchlist"
                                    className={({ isActive }) =>
                                        `${linkBaseClass} ${isActive ? activeLinkClass : ""}`
                                    }
                                >
                                    My List
                                </NavLink>
                                <NavLink
                                    to="/plans"
                                    className={({ isActive }) =>
                                        `${linkBaseClass} ${isActive ? activeLinkClass : ""}`
                                    }
                                >
                                    Plans
                                </NavLink>
                            </>
                        )}
                    </nav>

                    {/* Right Section - Search, User Menu, etc. */}
                    <div className="flex items-center">
                        {/* Search Bar - All Screens */}
                        <div
                            className={`relative transition-all duration-300 ${isSearchExpanded ? "w-32 sm:w-40 md:w-64" : "w-8"}`}
                            role="search"
                        >
                            <input
                                type="text"
                                placeholder="Search..."
                                ref={searchInputRef}
                                className={`bg-gray-800/80 border border-gray-700 text-sm rounded-full py-1 pl-8 pr-3 w-full transition-all duration-300 focus:outline-none focus:ring-1 focus:ring-netflix-red ${
                                    isSearchExpanded
                                        ? "opacity-100"
                                        : "opacity-0"
                                }`}
                                aria-label="Search for movies and shows"
                                aria-expanded={isSearchExpanded}
                                onBlur={() => {
                                    if (!searchInputRef.current?.value) {
                                        setIsSearchExpanded(false);
                                    }
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Escape") {
                                        setIsSearchExpanded(false);
                                        searchInputRef.current.blur();
                                    }
                                }}
                            />
                            <button
                                className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                                onClick={() =>
                                    setIsSearchExpanded(!isSearchExpanded)
                                }
                                aria-label={
                                    isSearchExpanded
                                        ? "Close search"
                                        : "Open search"
                                }
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    aria-hidden="true"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                    />
                                </svg>
                            </button>
                        </div>

                        {/* User Actions */}
                        <div className="flex items-center ml-4">
                            {user ? (
                                <>
                                    {/* User Menu - Desktop */}
                                    <div className="hidden md:flex items-center space-x-4">
                                        <Link
                                            to="/profile"
                                            className="flex items-center"
                                            aria-label="Your profile"
                                        >
                                            <img
                                                src={
                                                    user.avatarUrl ||
                                                    "/src/assets/images/default-avatar.png"
                                                }
                                                alt={`${user.username || "User"} avatar`}
                                                className="w-8 h-8 rounded-full border border-gray-700"
                                            />
                                            <span className="ml-2 text-sm text-gray-300 hidden lg:inline">
                                                {user.username || "Profile"}
                                            </span>
                                        </Link>
                                        <Link
                                            to="/settings"
                                            className="text-gray-400 hover:text-white"
                                            aria-label="Settings"
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                className="h-5 w-5"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                                aria-hidden="true"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                                                />
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                                />
                                            </svg>
                                        </Link>
                                        <button
                                            onClick={handleLogout}
                                            className="text-gray-400 hover:text-white"
                                            aria-label="Logout"
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                className="h-5 w-5"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                                aria-hidden="true"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                                                />
                                            </svg>
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* Auth Buttons - Desktop */}
                                    <div className="hidden md:flex items-center space-x-4">
                                        <Link
                                            to="/login"
                                            className="py-1 px-4 text-white hover:bg-gray-700 rounded-md transition-colors"
                                        >
                                            Log In
                                        </Link>
                                        <Link
                                            to="/signup"
                                            className="py-1 px-4 bg-netflix-red text-white hover:bg-red-700 rounded-md transition-colors"
                                        >
                                            Sign Up
                                        </Link>
                                    </div>
                                </>
                            )}

                            {/* Mobile Menu Toggle Button */}
                            <button
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="ml-4 p-1 text-gray-400 hover:text-white rounded-full focus:outline-none focus:ring-2 focus:ring-netflix-red md:hidden"
                                aria-label={
                                    isMenuOpen ? "Close menu" : "Open menu"
                                }
                                aria-expanded={isMenuOpen}
                                aria-controls="mobile-menu"
                            >
                                {isMenuOpen ? (
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-6 w-6"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        aria-hidden="true"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M6 18L18 6M6 6l12 12"
                                        />
                                    </svg>
                                ) : (
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-6 w-6"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        aria-hidden="true"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M4 6h16M4 12h16m-7 6h7"
                                        />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </ResponsiveContainer>

            {/* Mobile Menu */}
            {isMenuOpen && (
                <div
                    className="md:hidden bg-gray-900 border-t border-gray-800 py-2"
                    id="mobile-menu"
                    role="navigation"
                    aria-label="Mobile navigation"
                    ref={mobileMenuRef}
                >
                    <ResponsiveContainer>
                        <nav className="flex flex-col space-y-3 py-3">
                            <NavLink
                                to="/"
                                end
                                className={({ isActive }) =>
                                    `px-2 py-2 rounded ${isActive ? "bg-gray-800 text-white" : "text-gray-300"}`
                                }
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Home
                            </NavLink>
                            <NavLink
                                to="/browse"
                                className={({ isActive }) =>
                                    `px-2 py-2 rounded ${isActive ? "bg-gray-800 text-white" : "text-gray-300"}`
                                }
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Browse
                            </NavLink>

                            {user ? (
                                <>
                                    <NavLink
                                        to="/watchlist"
                                        className={({ isActive }) =>
                                            `px-2 py-2 rounded ${isActive ? "bg-gray-800 text-white" : "text-gray-300"}`
                                        }
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        My List
                                    </NavLink>
                                    <NavLink
                                        to="/plans"
                                        className={({ isActive }) =>
                                            `px-2 py-2 rounded ${isActive ? "bg-gray-800 text-white" : "text-gray-300"}`
                                        }
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        Plans
                                    </NavLink>
                                    <NavLink
                                        to="/profile"
                                        className={({ isActive }) =>
                                            `px-2 py-2 rounded ${isActive ? "bg-gray-800 text-white" : "text-gray-300"}`
                                        }
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        Profile
                                    </NavLink>
                                    <NavLink
                                        to="/settings"
                                        className={({ isActive }) =>
                                            `px-2 py-2 rounded ${isActive ? "bg-gray-800 text-white" : "text-gray-300"}`
                                        }
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        Settings
                                    </NavLink>
                                    <button
                                        onClick={() => {
                                            handleLogout();
                                            setIsMenuOpen(false);
                                        }}
                                        className="px-2 py-2 text-left text-gray-300 hover:bg-gray-800 hover:text-white rounded"
                                    >
                                        Logout
                                    </button>
                                </>
                            ) : (
                                <>
                                    <NavLink
                                        to="/login"
                                        className={({ isActive }) =>
                                            `px-2 py-2 rounded ${isActive ? "bg-gray-800 text-white" : "text-gray-300"}`
                                        }
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        Login
                                    </NavLink>
                                    <NavLink
                                        to="/signup"
                                        className={({ isActive }) =>
                                            `px-2 py-2 rounded ${isActive ? "bg-netflix-red text-white" : "bg-gray-800 text-white"}`
                                        }
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        Sign Up
                                    </NavLink>
                                </>
                            )}
                        </nav>
                    </ResponsiveContainer>
                </div>
            )}
        </header>
    );
}
