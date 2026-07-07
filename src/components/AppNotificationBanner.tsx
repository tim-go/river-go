import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import type { AppNotification } from "../types";

export function AppNotificationBanner({
  notification,
  onDismiss,
}: {
  notification: AppNotification;
  onDismiss: () => void;
}) {
  const Icon =
    notification.tone === "error"
      ? AlertTriangle
      : notification.tone === "info"
        ? Info
        : CheckCircle2;
  return (
    <div
      className={`app-notification app-notification--${notification.tone}`}
      role="status"
    >
      <Icon size={16} />
      <span>{notification.message}</span>
      <button type="button" onClick={onDismiss} aria-label="Dismiss notification">
        <X size={15} />
      </button>
    </div>
  );
}
