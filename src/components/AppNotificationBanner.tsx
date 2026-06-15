import { CheckCircle2, X } from "lucide-react";
import type { AppNotification } from "../types";

export function AppNotificationBanner({
  notification,
  onDismiss,
}: {
  notification: AppNotification;
  onDismiss: () => void;
}) {
  return (
    <div
      className={`app-notification app-notification--${notification.tone}`}
      role="status"
    >
      <CheckCircle2 size={16} />
      <span>{notification.message}</span>
      <button type="button" onClick={onDismiss} aria-label="Dismiss notification">
        <X size={15} />
      </button>
    </div>
  );
}
