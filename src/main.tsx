import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/sora/600.css";
import "@fontsource/sora/700.css";
import "@fontsource/sora/800.css";
import "leaflet/dist/leaflet.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AuthActionPage } from "./auth/AuthActionPage";
import { SignupPage } from "./auth/SignupPage";
import { MapFilterPrototype } from "./prototype/MapFilterPrototype";
import { DiscoveryProvider } from "./discovery/DiscoveryContext";
import { PwaProvider } from "./pwa/PwaProvider";
import { PwaIosInstallSheet } from "./pwa/PwaIosInstallSheet";
import { PwaOverlays } from "./pwa/PwaOverlays";
import "./styles.css";
import "./pwa/pwa.css";
import "./auth/auth-action.css";

// Standalone auth pages (not the full app shell): the branded email-link handler
// and the dedicated sign-up page.
const path = window.location.pathname;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
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
  </StrictMode>,
);
