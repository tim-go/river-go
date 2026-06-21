import { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

// registerType is "prompt": when a new service worker is waiting we surface a
// toast rather than reloading under the user (mid-paddle-log, mid-contribution).
export function PwaReloadPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  // The "ready to use offline" confirmation is transient — auto-dismiss it so it
  // doesn't linger. The update prompt stays until the user acts on it.
  useEffect(() => {
    if (offlineReady && !needRefresh) {
      const timer = setTimeout(() => setOfflineReady(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [offlineReady, needRefresh, setOfflineReady]);

  if (!offlineReady && !needRefresh) {
    return null;
  }

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  return (
    <div className="pwa-toast" role="alert" aria-live="polite">
      <span className="pwa-toast__message">
        {needRefresh
          ? "A new version of RiverLaunch.app is available."
          : "Ready to use offline."}
      </span>
      <div className="pwa-toast__actions">
        {needRefresh ? (
          <button
            type="button"
            className="primary-action"
            onClick={() => void updateServiceWorker(true)}
          >
            Reload
          </button>
        ) : null}
        <button type="button" className="ghost-button" onClick={close}>
          {needRefresh ? "Later" : "Dismiss"}
        </button>
      </div>
    </div>
  );
}
