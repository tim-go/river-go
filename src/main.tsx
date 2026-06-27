import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/sora/600.css";
import "@fontsource/sora/700.css";
import "@fontsource/sora/800.css";
import "leaflet/dist/leaflet.css";
import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { DiscoveryProvider } from "./discovery/DiscoveryContext";
import { PwaProvider } from "./pwa/PwaProvider";
import { PwaIosInstallSheet } from "./pwa/PwaIosInstallSheet";
import { PwaOverlays } from "./pwa/PwaOverlays";
import "./styles.css";
import "./pwa/pwa.css";
import "./auth/auth-action.css";

// Each route is loaded on demand so the entry stays a thin router: the main app
// (with the map/Leaflet) isn't downloaded when landing on /signup, and the
// standalone auth pages and the dev-only filter prototype aren't downloaded on
// the main route. React.lazy needs a default export, so adapt the named ones.
const App = lazy(() => import("./App"));
const AuthActionPage = lazy(() =>
  import("./auth/AuthActionPage").then((m) => ({ default: m.AuthActionPage })),
);
const SignupPage = lazy(() =>
  import("./auth/SignupPage").then((m) => ({ default: m.SignupPage })),
);
const MapFilterPrototype = lazy(() =>
  import("./prototype/MapFilterPrototype").then((m) => ({
    default: m.MapFilterPrototype,
  })),
);

const path = window.location.pathname;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Suspense fallback={null}>
      {path === "/auth/action" ? (
        <AuthActionPage />
      ) : path === "/signup" ? (
        <SignupPage />
      ) : path === "/prototype/filters" ? (
        <MapFilterPrototype />
      ) : (
        <DiscoveryProvider>
          <PwaProvider>
            <App />
            <PwaIosInstallSheet />
            <PwaOverlays />
          </PwaProvider>
        </DiscoveryProvider>
      )}
    </Suspense>
  </StrictMode>,
);
