import { Check, Plus, Share, X } from "lucide-react";
import { usePwa } from "./PwaProvider";

// iOS has no install prompt — installation is a manual Safari gesture, so we
// walk the user through it.
export function PwaIosInstallSheet() {
  const { iosHelpOpen, closeIosHelp } = usePwa();

  if (!iosHelpOpen) {
    return null;
  }

  return (
    <div className="pwa-ios-backdrop" onClick={closeIosHelp}>
      <div
        className="pwa-ios-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Add RiverLaunch.app to your Home Screen"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="pwa-ios-sheet__close"
          aria-label="Close"
          onClick={closeIosHelp}
        >
          <X size={18} />
        </button>
        <h2>Add to your Home Screen</h2>
        <p>RiverLaunch.app installs straight from Safari — no App Store needed.</p>
        <ol className="pwa-ios-steps">
          <li>
            <span className="pwa-ios-steps__icon">
              <Share size={18} />
            </span>
            <span>
              Tap the <strong>Share</strong> button in Safari's toolbar.
            </span>
          </li>
          <li>
            <span className="pwa-ios-steps__icon">
              <Plus size={18} />
            </span>
            <span>
              Choose <strong>Add to Home Screen</strong>.
            </span>
          </li>
          <li>
            <span className="pwa-ios-steps__icon">
              <Check size={18} />
            </span>
            <span>
              Tap <strong>Add</strong>, then open RiverLaunch from your home
              screen.
            </span>
          </li>
        </ol>
        <p className="pwa-ios-note">
          Using Chrome or Firefox? Open this page in <strong>Safari</strong>{" "}
          first — only Safari can add to the Home Screen on iOS.
        </p>
      </div>
    </div>
  );
}
