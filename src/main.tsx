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
import { DiscoveryProvider } from "./discovery/DiscoveryContext";
import { PwaProvider } from "./pwa/PwaProvider";
import { PwaIosInstallSheet } from "./pwa/PwaIosInstallSheet";
import { PwaOverlays } from "./pwa/PwaOverlays";
import "./styles.css";
import "./pwa/pwa.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DiscoveryProvider>
      <PwaProvider>
        <App />
        <PwaIosInstallSheet />
        <PwaOverlays />
      </PwaProvider>
    </DiscoveryProvider>
  </StrictMode>,
);
