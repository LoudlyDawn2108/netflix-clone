import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navigation from "./components/navigation";
import HomePage from "./pages/HomePage";
import SearchPage from "./pages/SearchPage";
import WatchPage from "./pages/WatchPage";
import ProfilePage from "./pages/ProfilePage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";

function App() {
    return (
        <Router>
            <div className="bg-black text-white min-h-screen">
                <Routes>
                    {/* Authentication routes without navigation */}
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/signup" element={<SignupPage />} />

                    {/* Routes with navigation */}
                    <Route
                        path="/"
                        element={
                            <>
                                <Navigation />
                                <HomePage />
                            </>
                        }
                    />
                    <Route
                        path="/search"
                        element={
                            <>
                                <Navigation />
                                <SearchPage />
                            </>
                        }
                    />
                    <Route
                        path="/watch/:id"
                        element={
                            <>
                                <Navigation />
                                <WatchPage />
                            </>
                        }
                    />
                    <Route
                        path="/profile"
                        element={
                            <>
                                <Navigation />
                                <ProfilePage />
                            </>
                        }
                    />

                    {/* Catch all route */}
                    <Route path="*" element={<NotFound />} />
                </Routes>
            </div>
        </Router>
    );
}

// Simple 404 component
function NotFound() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
            <h1 className="text-4xl font-bold mb-4">404</h1>
            <p className="text-xl mb-8">Page not found</p>
            <a
                href="/"
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
                Go Home
            </a>
        </div>
    );
}

export default App;
