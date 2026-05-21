---
name: river-local-dev-troubleshooting
description: Use when local River Go dev server, Vite, dependency install, port conflicts, Leaflet map rendering, or build checks are broken.
---

# Local Dev Troubleshooting

Work from the repo root.

## Check Order

1. Confirm context and worktree state.

   ```bash
   pwd
   git status --short
   node --version
   npm --version
   ```

2. Confirm dependencies.

   ```bash
   npm install
   ```

3. Run the build gate.

   ```bash
   npm run build
   ```

4. Start local dev.

   ```bash
   npm run dev -- --host 127.0.0.1
   ```

   Vite will usually use `http://127.0.0.1:5173/`; if that port is busy it will choose another.

5. If ports look stuck, inspect listeners before killing anything.

   ```bash
   lsof -iTCP:5173 -sTCP:LISTEN -n -P
   lsof -iTCP:5174 -sTCP:LISTEN -n -P
   ```

6. If the map is blank, check:

   - browser console errors
   - Leaflet CSS import in `/src/main.tsx`
   - network access to OpenStreetMap tiles
   - whether the map container has non-zero height
   - whether route data exists in `/src/data/wyeRouteTraces.ts`

7. If contribution data looks stale or unexpected, reset localStorage from the app reset button or browser devtools.

## Report

Report:

- command that failed
- dev server URL
- Node/npm versions
- validation result
- any port conflicts
- whether browser localStorage may contain stale demo data
