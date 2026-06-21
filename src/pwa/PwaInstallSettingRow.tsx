import { Check, Download } from "lucide-react";
import { usePwa } from "./PwaProvider";

// Persistent "Install app" control for the More → Settings panel (always
// available, unlike the dismissible banner).
export function PwaInstallSettingRow() {
  const { isStandalone, canInstall, isIos, promptInstall, openIosHelp } = usePwa();

  return (
    <div className="pwa-setting">
      <div className="pwa-setting__text">
        <strong>Install app</strong>
        <span>
          {isStandalone
            ? "Installed — running as an app."
            : "Add RiverLaunch.app to your home screen."}
        </span>
      </div>
      {isStandalone ? (
        <span className="status-chip pwa-setting__chip">
          <Check size={14} /> Installed
        </span>
      ) : canInstall ? (
        <button
          type="button"
          className="primary-action"
          onClick={() => void promptInstall()}
        >
          <Download size={15} /> Install
        </button>
      ) : isIos ? (
        <button type="button" className="ghost-button" onClick={openIosHelp}>
          How to install
        </button>
      ) : (
        <span className="pwa-setting__hint">Open in Chrome or Safari to install.</span>
      )}
    </div>
  );
}
