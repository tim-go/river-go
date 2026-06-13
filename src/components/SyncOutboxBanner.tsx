import { AlertTriangle, RefreshCw } from "lucide-react";

function pluralise(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function SyncOutboxBanner({
  queuedOutboxCount,
  failedOutboxCount,
  isDismissed,
  isOnline,
  isSyncingOutbox,
  canSyncOutbox,
  onDismiss,
  onSync,
}: {
  queuedOutboxCount: number;
  failedOutboxCount: number;
  isDismissed: boolean;
  isOnline: boolean;
  isSyncingOutbox: boolean;
  canSyncOutbox: boolean;
  onDismiss: () => void;
  onSync: () => void;
}) {
  if (queuedOutboxCount === 0 || isDismissed) {
    return null;
  }

  const state = failedOutboxCount > 0 ? "failed" : !isOnline ? "offline" : "queued";
  const title =
    state === "failed"
      ? `${pluralise(failedOutboxCount, "change")} need retry`
      : state === "offline"
        ? `${pluralise(queuedOutboxCount, "change")} saved on this device`
        : `${pluralise(queuedOutboxCount, "change")} waiting to sync`;
  const detail =
    state === "failed"
      ? "Some local knowledge did not reach RiverLaunch.app. Retry when you have a stable connection."
      : state === "offline"
        ? "You are offline. These changes will stay local until you reconnect and sync."
        : "Sync now to publish your latest local knowledge to RiverLaunch.app.";

  return (
    <section className={`sync-banner sync-banner--${state}`} role="status">
      <div className="sync-banner__content">
        {state === "failed" ? (
          <AlertTriangle size={20} />
        ) : (
          <RefreshCw size={20} />
        )}
        <div>
          <strong>{title}</strong>
          <span>{detail}</span>
        </div>
      </div>
      <div className="sync-banner__actions">
        <button
          className="primary-action sync-banner__action"
          type="button"
          onClick={onSync}
          disabled={!canSyncOutbox}
        >
          <RefreshCw size={16} />
          {isSyncingOutbox ? "Syncing" : state === "failed" ? "Retry sync" : "Sync now"}
        </button>
        <button
          className="ghost-button sync-banner__action"
          type="button"
          onClick={onDismiss}
        >
          Later
        </button>
      </div>
    </section>
  );
}
