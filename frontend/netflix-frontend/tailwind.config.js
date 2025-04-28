/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    theme: {
        extend: {
            colors: {
                "netflix-red": "#E50914",
                "netflix-black": "#141414",
                "netflix-dark-gray": "#181818",
                "netflix-medium-gray": "#2F2F2F",
                "netflix-light-gray": "#808080",
            },
            screens: {
                xs: "480px", // Extra small devices
                sm: "640px", // Small devices like mobile phones
                md: "768px", // Medium devices like tablets
                lg: "1024px", // Large devices like laptops
                xl: "1280px", // Extra large devices
                "2xl": "1536px", // 2x Extra large devices like large desktops
            },
            spacing: {
                18: "4.5rem",
                72: "18rem",
                84: "21rem",
                96: "24rem",
                128: "32rem",
            },
            fontSize: {
                xxs: "0.625rem",
            },
            height: {
                "screen-90": "90vh",
                "screen-80": "80vh",
            },
            maxWidth: {
                "8xl": "88rem",
            },
            boxShadow: {
                netflix:
                    "0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.2)",
                "netflix-hover": "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
            },
        },
    },
    plugins: [
        // Add Tailwind plugins here if needed
    ],
};
