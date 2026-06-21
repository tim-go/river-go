import { Download, Waves, X } from "lucide-react";
import { usePwa } from "./PwaProvider";

// Dismissible bottom banner. On Android it triggers the native install prompt;
// on iOS it opens the "Add to Home Screen" instructions sheet.
export function PwaInstallBanner() {
  const { bannerVisible, canInstall, isIos, promptInstall, openIosHelp, dismissBanner } =
    usePwa();

  if (!bannerVisible) {
    return null;
  }

  const onInstall = () => {
    if (canInstall) {
      void promptInstall();
    } else if (isIos) {
      openIosHelp();
    }
  };

  return (
    <div className="pwa-install-banner" role="region" aria-label="Install RiverLaunch.app">
      <span className="pwa-install-banner__mark" aria-hidden="true">
        <Waves size={20} strokeWidth={2.3} />
      </span>
      <div className="pwa-install-banner__text">
        <strong>Install RiverLaunch.app</strong>
        <span>Add it to your home screen for a full-screen, app-like experience.</span>
      </div>
      <button type="button" className="primary-action pwa-install-banner__cta" onClick={onInstall}>
        <Download size={15} />
        {canInstall ? "Install" : "How to"}
      </button>
      <button
        type="button"
        className="pwa-install-banner__close"
        aria-label="Dismiss"
        onClick={dismissBanner}
      >
        <X size={16} />
      </button>
    </div>
  );
}
