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
import { DiscoveryProvider } from "./discovery/DiscoveryContext";
import { PwaProvider } from "./pwa/PwaProvider";
import { PwaIosInstallSheet } from "./pwa/PwaIosInstallSheet";
import { PwaOverlays } from "./pwa/PwaOverlays";
import "./styles.css";
import "./pwa/pwa.css";
import "./auth/auth-action.css";

// Branded handler for Firebase email links (verify / reset) — a standalone page,
// not the full app shell.
const isAuthActionRoute = window.location.pathname === "/auth/action";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {isAuthActionRoute ? (
      <AuthActionPage />
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
