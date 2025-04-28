import { Link } from "react-router-dom";
import ResponsiveContainer from "../ui/ResponsiveContainer";
import ResponsiveText from "../ui/ResponsiveText";

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-netflix-black text-gray-400 py-8 mt-auto border-t border-gray-800">
            <ResponsiveContainer>
                {/* Main Footer Content */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-8">
                    {/* Column 1: Company */}
                    <div>
                        <h3 className="text-white font-medium mb-4 text-lg">
                            Company
                        </h3>
                        <ul className="space-y-2">
                            <li>
                                <Link
                                    to="/about"
                                    className="hover:text-white transition-colors"
                                >
                                    About Us
                                </Link>
                            </li>
                            <li>
                                <Link
                                    to="/careers"
                                    className="hover:text-white transition-colors"
                                >
                                    Careers
                                </Link>
                            </li>
                            <li>
                                <Link
                                    to="/contact"
                                    className="hover:text-white transition-colors"
                                >
                                    Contact Us
                                </Link>
                            </li>
                            <li>
                                <Link
                                    to="/blog"
                                    className="hover:text-white transition-colors"
                                >
                                    Blog
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Column 2: Support */}
                    <div>
                        <h3 className="text-white font-medium mb-4 text-lg">
                            Support
                        </h3>
                        <ul className="space-y-2">
                            <li>
                                <Link
                                    to="/help"
                                    className="hover:text-white transition-colors"
                                >
                                    Help Center
                                </Link>
                            </li>
                            <li>
                                <Link
                                    to="/faq"
                                    className="hover:text-white transition-colors"
                                >
                                    FAQ
                                </Link>
                            </li>
                            <li>
                                <Link
                                    to="/devices"
                                    className="hover:text-white transition-colors"
                                >
                                    Supported Devices
                                </Link>
                            </li>
                            <li>
                                <Link
                                    to="/accessibility"
                                    className="hover:text-white transition-colors"
                                >
                                    Accessibility
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Column 3: Legal */}
                    <div>
                        <h3 className="text-white font-medium mb-4 text-lg">
                            Legal
                        </h3>
                        <ul className="space-y-2">
                            <li>
                                <Link
                                    to="/terms"
                                    className="hover:text-white transition-colors"
                                >
                                    Terms of Use
                                </Link>
                            </li>
                            <li>
                                <Link
                                    to="/privacy"
                                    className="hover:text-white transition-colors"
                                >
                                    Privacy Policy
                                </Link>
                            </li>
                            <li>
                                <Link
                                    to="/cookies"
                                    className="hover:text-white transition-colors"
                                >
                                    Cookie Preferences
                                </Link>
                            </li>
                            <li>
                                <Link
                                    to="/legal"
                                    className="hover:text-white transition-colors"
                                >
                                    Legal Notices
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Column 4: Connect */}
                    <div>
                        <h3 className="text-white font-medium mb-4 text-lg">
                            Connect With Us
                        </h3>
                        <div className="flex space-x-4 mb-4">
                            <a
                                href="https://facebook.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Facebook"
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                <svg
                                    className="w-6 h-6"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                    aria-hidden="true"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
                                        clipRule="evenodd"
                                    ></path>
                                </svg>
                            </a>
                            <a
                                href="https://twitter.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Twitter"
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                <svg
                                    className="w-6 h-6"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                    aria-hidden="true"
                                >
                                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"></path>
                                </svg>
                            </a>
                            <a
                                href="https://instagram.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Instagram"
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                <svg
                                    className="w-6 h-6"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                    aria-hidden="true"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"
                                        clipRule="evenodd"
                                    ></path>
                                </svg>
                            </a>
                            <a
                                href="https://youtube.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="YouTube"
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                <svg
                                    className="w-6 h-6"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                    aria-hidden="true"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M19.812 5.418c.861.23 1.538.907 1.768 1.768C21.998 8.746 22 12 22 12s0 3.255-.418 4.814a2.504 2.504 0 0 1-1.768 1.768c-1.56.419-7.814.419-7.814.419s-6.255 0-7.814-.419a2.505 2.505 0 0 1-1.768-1.768C2 15.255 2 12 2 12s0-3.255.417-4.814a2.507 2.507 0 0 1 1.768-1.768C5.744 5 11.998 5 11.998 5s6.255 0 7.814.418ZM15.194 12 10 15V9l5.194 3Z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </a>
                        </div>
                        <div>
                            <p className="mb-2">Download our apps:</p>
                            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                                <a
                                    href="#"
                                    className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded flex items-center justify-center transition-colors"
                                >
                                    <svg
                                        className="w-5 h-5 mr-2"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                    >
                                        <path d="M10.5 1.875a8.125 8.125 0 1 0 0 16.25 8.125 8.125 0 0 0 0-16.25ZM12.982 13.484a.997.997 0 0 1-1.414 0L8.422 10.34a.997.997 0 0 1 0-1.414l3.146-3.146a.997.997 0 1 1 1.414 1.414L10.199 9.64l2.783 2.83a.997.997 0 0 1 0 1.414Z" />
                                    </svg>
                                    iOS App
                                </a>
                                <a
                                    href="#"
                                    className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded flex items-center justify-center transition-colors"
                                >
                                    <svg
                                        className="w-5 h-5 mr-2"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                    >
                                        <path d="M7.946 10c0 .346-.07.678-.196.981l3.4 3.387a1.004 1.004 0 0 1-1.414 1.425L6.344 12.4a2.993 2.993 0 0 1-4.273-3.908 3 3 0 0 1 4.273-1.544l3.392-3.392A.997.997 0 1 1 11.15 4.97l-3.4 3.387c.126.303.196.635.196.98V10Z" />
                                    </svg>
                                    Android App
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Language Selector */}
                <div className="border-t border-gray-800 pt-8 pb-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between">
                        <div className="mb-4 sm:mb-0">
                            <div className="flex items-center">
                                <svg
                                    className="w-5 h-5 mr-2"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 009 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                                <select className="bg-transparent border border-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-gray-500">
                                    <option value="en">English</option>
                                    <option value="es">Español</option>
                                    <option value="fr">Français</option>
                                    <option value="de">Deutsch</option>
                                </select>
                            </div>
                        </div>

                        <ResponsiveText variant="caption" as="p">
                            © {currentYear} StreamFlix. All rights reserved.
                        </ResponsiveText>
                    </div>
                </div>
            </ResponsiveContainer>
        </footer>
    );
}
