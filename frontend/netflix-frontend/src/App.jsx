import { Routes, Route } from "react-router-dom";
import Header from "./components/layouts/Header";
import Footer from "./components/layouts/Footer";
import HomePage from "./pages/HomePage";
import SignupPage from "./pages/SignupPage";
import LoginPage from "./pages/LoginPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import SubscriptionPlansPage from "./pages/SubscriptionPlansPage";
import CheckoutPage from "./pages/CheckoutPage";
import CheckoutSuccessPage from "./pages/CheckoutSuccessPage";
import ResponsiveContainer from "./components/ui/ResponsiveContainer";

function App() {
    return (
        <div className="flex flex-col min-h-screen bg-netflix-black text-white">
            <Header />
            <main className="flex-grow pt-16 md:pt-20">
                {/* Page content with top spacing to account for fixed header */}
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/signup" element={<SignupPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/plans" element={<SubscriptionPlansPage />} />
                    <Route path="/checkout" element={<CheckoutPage />} />
                    <Route
                        path="/checkout/success"
                        element={<CheckoutSuccessPage />}
                    />
                </Routes>
            </main>
            <Footer />
        </div>
    );
}

export default App;
