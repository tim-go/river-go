import { PwaInstallBanner } from "./PwaInstallBanner";
import { PwaReloadPrompt } from "./PwaReloadPrompt";

// Single bottom-anchored stack so the update toast and the install banner never
// overlap — whichever are visible flow in a column above the (mobile) nav.
export function PwaOverlays() {
  return (
    <div className="pwa-overlay-stack">
      <PwaReloadPrompt />
      <PwaInstallBanner />
    </div>
  );
}
