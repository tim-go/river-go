import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

function gitOutput(args: string, fallback: string): string {
  try {
    return execSync(`git ${args}`, { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return fallback;
  }
}

// Baked into the bundle at build time and shown on the About screen. The sha and
// commit time are per-COMMIT (not per-build), so rebuilding the same commit yields
// an identical bundle — no spurious PWA "update available" prompts on re-deploys.
const pkg = JSON.parse(
  readFileSync(join(process.cwd(), "package.json"), "utf8"),
) as { version: string };
const appVersion = pkg.version;
const appGitSha = process.env.GITHUB_SHA
  ? process.env.GITHUB_SHA.slice(0, 7)
  : gitOutput("rev-parse --short HEAD", "dev");
const appBuiltAt = gitOutput(
  "show -s --format=%cI HEAD",
  new Date().toISOString(),
);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
      __APP_GIT_SHA__: JSON.stringify(appGitSha),
      __APP_BUILT_AT__: JSON.stringify(appBuiltAt),
    },
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
          // Keep online-only, lazy-loaded chunks out of the precache: the heavy
          // zxcvbn dictionary (sign-up / reset password) and the Firebase
          // analytics (consent-gated) and storage (photo upload) SDKs.
          globIgnores: [
            "**/apple-splash-*.png",
            "**/images/**",
            "**/zxcvbn-*.js",
            "**/firebase-analytics-*.js",
            "**/firebase-storage-*.js",
          ],
          navigateFallback: "/index.html",
          // Never serve the SPA shell for /api/* or Firebase's reserved /__/*
          // paths. /__/auth/handler is the OAuth handler the popup/redirect
          // navigates to — if the SW falls back to index.html there, Google
          // sign-in silently bounces home with the app shell instead.
          navigateFallbackDenylist: [/^\/api\//, /^\/__\//],
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
          // Split large, slow-changing vendors into their own chunks. They're
          // cached independently of the app code (which changes every deploy)
          // and download in parallel, so the entry chunk stays small. The
          // zxcvbn chunk is named so the PWA precache can exclude it.
          manualChunks(id) {
            if (id.includes("@zxcvbn-ts")) return "zxcvbn";
            if (!id.includes("node_modules")) return undefined;
            // analytics (consent-gated) and storage (photo upload) are
            // dynamically imported. Give them stable names — they stay lazy
            // (only reachable via import()), but the name lets the PWA precache
            // exclude these online-only chunks, as it does for zxcvbn.
            if (id.includes("firebase/analytics") || id.includes("@firebase/analytics")) {
              return "firebase-analytics";
            }
            if (id.includes("firebase/storage") || id.includes("@firebase/storage")) {
              return "firebase-storage";
            }
            if (id.includes("/firebase/") || id.includes("@firebase/")) {
              return "firebase";
            }
            if (id.includes("/leaflet/")) return "leaflet";
            if (
              id.includes("/react/") ||
              id.includes("/react-dom/") ||
              id.includes("/scheduler/")
            ) {
              return "react";
            }
            return undefined;
          },
        },
      },
    },
  };
});
