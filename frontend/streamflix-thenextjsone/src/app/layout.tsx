import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ThemeProvider from "@/components/theme-provider";
import Navigation from "@/components/navigation";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "StreamFlix - Cloud Native Video Streaming",
    description: "Enterprise-grade video streaming platform",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body
                className={`${inter.className} bg-black text-white antialiased`}
            >
                <ThemeProvider attribute="class" defaultTheme="dark">
                    <Navigation />
                    <main>{children}</main>
                </ThemeProvider>
            </body>
        </html>
    );
}
