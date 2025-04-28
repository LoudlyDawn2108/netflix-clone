import LoginForm from "../components/auth/LoginForm";

export default function LoginPage() {
    return (
        <div className="min-h-screen flex flex-col bg-gray-900 text-white pt-16 pb-12 px-4">
            <div className="flex-grow flex items-center justify-center py-10">
                <LoginForm />
            </div>
            <footer className="text-center text-gray-400 text-sm">
                <p>
                    © {new Date().getFullYear()} Netflix Clone. All rights
                    reserved.
                </p>
            </footer>
        </div>
    );
}
