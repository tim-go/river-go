import "leaflet/dist/leaflet.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { DiscoveryProvider } from "./discovery/DiscoveryContext";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DiscoveryProvider>
      <App />
    </DiscoveryProvider>
  </StrictMode>,
);
