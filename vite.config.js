import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

const SPA_PAGES = new Set([
    "/admin", "/admin/dashboard", "/admin/tutors", "/admin/jobs", "/admin/tutor-list", "/admin/jobs/confirmed",
]);

export default defineConfig({
    root: "src",
    plugins: [react()],

    server: {
        port: 5174,
        strictPort: true,
        open: "/admin",
        proxy: {
            "^/admin(/|$)": {
                target: "http://localhost:3000",
                changeOrigin: true,
                bypass: (req) => {
                    const pathOnly = req.url.split("?")[0];
                    if (req.method === "GET" && SPA_PAGES.has(pathOnly)) return "/index.html";
                },
            },
            "/apply": {
                target: "http://localhost:3000",
                changeOrigin: true,
                bypass: (req) => {
                    // Only the POST goes to Express; the GET page is the SPA
                    if (req.method !== "POST") return "/index.html";
                },
            },
        },
    },

    build: {
        outDir: resolve(__dirname, "../Teletutors-backend/server/public"),
        emptyOutDir: false,
    },
});