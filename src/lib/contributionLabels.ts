import type { ModerationDecision } from "../services/contributionApi";
import type {
  Contribution,
  ContributionSyncStatus,
  MapPoiVerificationStatus,
} from "../types";

export const moderationActions: Array<{
  decision: ModerationDecision;
  label: string;
}> = [
  { decision: "approve", label: "Approve (publish)" },
  { decision: "spam", label: "Remove — Spam" },
  { decision: "inaccurate", label: "Remove — Inaccurate" },
  { decision: "duplicate", label: "Remove — Duplicate" },
  { decision: "inappropriate", label: "Remove — Inappropriate" },
];

export function syncStatusLabel(status?: ContributionSyncStatus) {
  if (!status) {
    return "saved";
  }

  const labels: Record<ContributionSyncStatus, string> = {
    draft: "draft",
    queued: "queued offline",
    syncing: "syncing",
    synced: "synced",
    failed: "sync failed",
  };

  return labels[status];
}

export function contributionStatusLabel(status: Contribution["status"]) {
  const labels: Record<Contribution["status"], string> = {
    pending: "Pending review",
    approved: "Published",
    spam: "Removed — Spam",
    inaccurate: "Removed — Inaccurate",
    duplicate: "Removed — Duplicate",
    inappropriate: "Removed — Inappropriate",
    withdrawn: "Withdrawn",
  };

  return labels[status] ?? status;
}

export function verificationStatusLabel(status: MapPoiVerificationStatus) {
  const labels: Record<MapPoiVerificationStatus, string> = {
    "needs-confirmation": "Needs confirmation",
    confirmed: "Confirmed",
    "needs-correction": "Correction suggested",
    resolved: "Resolved",
  };

  return labels[status] ?? status;
}

export function confirmationSummary(confirmations: number) {
  if (confirmations <= 0) {
    return "Not yet confirmed by other paddlers";
  }

  return `Confirmed by ${confirmations} paddler${confirmations === 1 ? "" : "s"}`;
}
