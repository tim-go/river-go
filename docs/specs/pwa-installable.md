# PWA: installable RiverLaunch.app (P1)

RiverLaunch.app is an installable PWA — installs as a standalone app on Android
(Chromium WebAPK) and iOS (Safari "Add to Home Screen"), with a service worker
for instant repeat loads and an offline-capable app shell.

## What shipped (P1)

- **Tooling:** `vite-plugin-pwa` (Workbox `generateSW`), `registerType: "prompt"`.
- **Manifest** (`vite.config.ts`): standalone, Surge-navy theme/background
  (`#060a1a`), name/short_name/description, categories, and 192 / 512 / 512-maskable
  icons.
- **Icons + iOS splash** generated from `assets/icon.svg` (the Waves brand mark on
  the Surge gradient) by `scripts/build/generate-pwa-assets.mjs` → `public/`:
  `pwa-192/512`, `pwa-maskable-512`, `apple-touch-icon`, `favicon` (svg + 32),
  and the **full** apple-touch-startup-image matrix (17 devices × portrait +
  landscape = 34 images).
- **Service worker:** precaches the app shell + self-hosted fonts + icons
  (36 entries). `navigateFallback` to `index.html`, with `/api/**` on the
  denylist so API calls are never served the shell. iOS splash + content photos
  are served by Hosting (not precached).
- **Self-hosted fonts:** `@fontsource/space-grotesk` + `@fontsource/sora`
  (Google Fonts CDN removed from `index.html`) — offline-capable, no render-block.
- **`index.html`:** `theme-color`, `viewport-fit=cover`, the apple standalone
  metas (`apple-mobile-web-app-*`), icon links, and the 34 splash links.
- **Update UX:** `PwaReloadPrompt` shows a "new version — Reload" toast rather
  than reloading mid-session.
- **Install UX:**
  - `PwaProvider` captures `beforeinstallprompt` (Android) and detects iOS / standalone.
  - `PwaInstallBanner` — dismissible bottom banner; returns ~5 days after dismissal.
    Android → native prompt; iOS → instructions sheet.
  - `PwaIosInstallSheet` — Share → Add to Home Screen walk-through (+ "open in
    Safari" note for Chrome/Firefox-on-iOS).
  - `PwaInstallSettingRow` — persistent "Install app" control in More → Settings.
- **Hosting headers** (`firebase.json`, both targets): hashed `/assets/**` +
  `workbox-*.js` immutable; `sw.js` / `manifest.webmanifest` / `index.html`
  `no-cache` so updates propagate.

## Regenerating icons/splash

```bash
npm run pwa:assets   # rasterises assets/icon.svg → public/* via sharp
```

Outputs `assets/apple-splash-links.html` (the `<link>` tags); if the device
matrix changes, paste them into `index.html`. Editing the brand mark only means
re-running the script and rebuilding.

## Outstanding (not in P1)

**P2 — useful offline**
- Runtime caching: API GETs (rivers/sections/levels) `NetworkFirst`; remote
  images (Firebase Storage) `CacheFirst`; map tiles `StaleWhileRevalidate` with a
  capped entry count. Goal: the app opens with last-known data offline.
- Offline state polish (lean on the existing `isOnline` + `SyncOutboxBanner`).

**P3 — engagement**
- Web push (Android; iOS 16.4+ and only once installed), notification badging,
  periodic background refresh (Android only).

**Polish / tech-debt**
- Dynamic `theme-color` per theme (currently static Surge navy; Tide/Daybreak
  keep dark browser chrome).
- Auto-inject the splash `<link>`s into `index.html` from the generator (today
  it's a manual paste).
- Consider scoping the install banner to mobile only (it also appears on
  installable desktop browsers).
- A dedicated extra-padded maskable icon (the full-bleed source crops cleanly
  today, but a purpose-built maskable is safer across launcher shapes).

## Verifying

- **Lighthouse** (Chrome DevTools) → "Installable" + PWA checks pass on `dist`.
- **Android (Chrome):** install prompt / banner → standalone launch with icon,
  name, splash, navy theme.
- **iOS (Safari):** the instructions sheet appears for non-installed Safari
  users; Add to Home Screen → standalone with the icon, title, status bar, and a
  device-correct splash.
- **Offline:** after one visit, the app shell loads with no network (live data
  is P2).
