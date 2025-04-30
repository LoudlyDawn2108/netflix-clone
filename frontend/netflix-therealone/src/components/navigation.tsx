import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { cn } from "../lib/utils";

export default function Navigation() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);

    // Add scroll event listener when component mounts
    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 0) {
                setIsScrolled(true);
            } else {
                setIsScrolled(false);
            }
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <header
            className={cn(
                "fixed top-0 z-50 w-full transition-colors duration-300",
                isScrolled ? "bg-zinc-900" : "bg-transparent"
            )}
        >
            <nav className="px-4 md:px-8 py-4 flex items-center justify-between">
                {/* Logo */}
                <Link to="/" className="text-red-600 font-bold text-2xl">
                    NETFLIX
                </Link>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center space-x-4">
                    <NavLink to="/">Home</NavLink>
                    <NavLink to="/tv-shows">TV Shows</NavLink>
                    <NavLink to="/movies">Movies</NavLink>
                    <NavLink to="/new">New & Popular</NavLink>
                    <NavLink to="/my-list">My List</NavLink>
                </div>

                {/* Right Side Menu */}
                <div className="flex items-center space-x-4">
                    {/* Search */}
                    <button className="text-white">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-5 w-5"
                        >
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                    </button>

                    {/* Profile */}
                    <div className="relative">
                        <img
                            src="https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png"
                            alt="Profile"
                            className="w-8 h-8 rounded"
                        />
                    </div>

                    {/* Mobile Menu Toggle */}
                    <button
                        className="md:hidden text-white"
                        onClick={() => setShowMobileMenu(!showMobileMenu)}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-6 w-6"
                        >
                            {showMobileMenu ? (
                                <>
                                    {" "}
                                    {/* X icon */}
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </>
                            ) : (
                                <>
                                    {" "}
                                    {/* Menu icon */}
                                    <line x1="4" y1="12" x2="20" y2="12"></line>
                                    <line x1="4" y1="6" x2="20" y2="6"></line>
                                    <line x1="4" y1="18" x2="20" y2="18"></line>
                                </>
                            )}
                        </svg>
                    </button>
                </div>
            </nav>

            {/* Mobile Menu */}
            {showMobileMenu && (
                <div className="md:hidden bg-zinc-900 py-4">
                    <div className="flex flex-col px-4 space-y-3">
                        <NavLink
                            to="/"
                            onClick={() => setShowMobileMenu(false)}
                        >
                            Home
                        </NavLink>
                        <NavLink
                            to="/tv-shows"
                            onClick={() => setShowMobileMenu(false)}
                        >
                            TV Shows
                        </NavLink>
                        <NavLink
                            to="/movies"
                            onClick={() => setShowMobileMenu(false)}
                        >
                            Movies
                        </NavLink>
                        <NavLink
                            to="/new"
                            onClick={() => setShowMobileMenu(false)}
                        >
                            New & Popular
                        </NavLink>
                        <NavLink
                            to="/my-list"
                            onClick={() => setShowMobileMenu(false)}
                        >
                            My List
                        </NavLink>
                    </div>
                </div>
            )}
        </header>
    );
}

function NavLink({
    to,
    children,
    onClick,
}: {
    to: string;
    children: React.ReactNode;
    onClick?: () => void;
}) {
    return (
        <Link
            to={to}
            className="text-gray-300 hover:text-white transition-colors"
            onClick={onClick}
        >
            {children}
        </Link>
    );
}
