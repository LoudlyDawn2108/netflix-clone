import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { readFileSync } from "fs";
import { resolve } from "path";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
    // Load environment variables based on mode
    const env = loadEnv(mode, process.cwd(), "");

    // Get package version from package.json
    const packageJson = JSON.parse(
        readFileSync(resolve(__dirname, "package.json"), "utf-8")
    );
    const version = packageJson.version;

    // Generate release name for Sentry
    const sentryRelease = `netflix-frontend@${version}`;

    return {
        plugins: [react(), tailwindcss()],
        define: {
            // Make version and release info available in app
            __APP_VERSION__: JSON.stringify(version),
            __APP_RELEASE__: JSON.stringify(sentryRelease),
            __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
        },
        build: {
            sourcemap: true, // Generate source maps for Sentry
            rollupOptions: {
                output: {
                    // Add unique hashes to filenames to ensure proper caching
                    entryFileNames: "assets/[name].[hash].js",
                    chunkFileNames: "assets/[name].[hash].js",
                    assetFileNames: "assets/[name].[hash].[ext]",
                },
            },
        },
        server: {
            port: 3000,
            open: true,
        },
    };
});
