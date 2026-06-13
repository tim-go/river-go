import type { ModerationDecision } from "../services/contributionApi";
import type { Contribution, ContributionSyncStatus } from "../types";

export const moderationActions: Array<{
  decision: ModerationDecision;
  label: string;
}> = [
  { decision: "approve", label: "Publish as reported" },
  { decision: "confirm", label: "Confirm" },
  { decision: "request-confirmation", label: "Needs confirmation" },
  { decision: "challenge", label: "Challenge" },
  { decision: "hide", label: "Hide" },
  { decision: "reject", label: "Reject" },
  { decision: "resolve", label: "Resolve" },
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
    active: "active",
    reported: "reported",
    pending: "pending review",
    "needs-confirmation": "needs confirmation",
    confirmed: "confirmed",
    challenged: "challenged",
    hidden: "hidden",
    rejected: "rejected",
    resolved: "resolved",
  };

  return labels[status] ?? status;
}
