import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: "prompt",
        includeAssets: [
          "favicon.svg",
          "favicon-32x32.png",
          "apple-touch-icon.png",
        ],
        manifest: {
          name: "RiverLaunch.app",
          short_name: "RiverLaunch",
          description: "Community river intelligence for paddlers",
          start_url: "/?source=pwa",
          scope: "/",
          display: "standalone",
          display_override: ["standalone", "minimal-ui"],
          orientation: "any",
          theme_color: "#060a1a",
          background_color: "#060a1a",
          categories: ["sports", "navigation", "weather"],
          icons: [
            { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
            { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
            {
              src: "/pwa-maskable-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          // P1: precache the app shell + self-hosted fonts + icons. The iOS
          // splash images and content photos are served from Hosting, not the
          // SW. Runtime caching of API GETs / map tiles / remote images is P2
          // (see docs/specs/pwa-installable.md).
          globPatterns: ["**/*.{js,css,html,svg,woff2,png,ico}"],
          // Keep the heavy zxcvbn dictionary out of the precache — it's a
          // separate chunk lazy-loaded only on the online-only sign-up / reset
          // password fields.
          globIgnores: [
            "**/apple-splash-*.png",
            "**/images/**",
            "**/zxcvbn-*.js",
          ],
          navigateFallback: "/index.html",
          navigateFallbackDenylist: [/^\/api\//],
          cleanupOutdatedCaches: true,
        },
        devOptions: { enabled: false },
      }),
    ],
    server: {
      proxy: {
        "/api": {
          target: env.VITE_API_PROXY_TARGET || "http://127.0.0.1:8080",
          changeOrigin: true,
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          // Name the zxcvbn chunk so the PWA precache can exclude it.
          manualChunks(id) {
            if (id.includes("@zxcvbn-ts")) return "zxcvbn";
            return undefined;
          },
        },
      },
    },
  };
});
