// Status panels (`.profile-message`) render red by default — which is wrong for
// the many messages that report a completed action ("Promoted …", "Saved …").
// These panels reuse one string state for both outcomes, so classify at render
// time: failures (which consistently read "Could not …", "Failed …", etc.) keep
// the red base; a clearly-completed action gets the green success modifier;
// anything ambiguous stays red (safe — never paint a real error green).
export type MessageTone = "success" | "error" | "neutral";

const MESSAGE_FAILURE_PATTERN =
  /\b(could ?n[o']?t|cannot|can'?t|fail(ed|ure)?|unable|error|invalid|not allowed|denied|is required|are required|must\b|already\b|went wrong|try again|not found|no .*(found|match)|too (large|big|many|long)|unsupported|problem|permission|forbidden)\b/;

const MESSAGE_SUCCESS_PATTERN =
  /\b(promoted|published|approved|rejected|hidden|unhidden|restored|updated|saved|added|created|sent|deleted|removed|confirmed|refreshed|synced|uploaded|marked|reverted|granted|revoked|enabled|disabled|resolved|cleared|done|success(fully)?)\b/;

export function messageTone(message: string): MessageTone {
  const text = message.trim().toLowerCase();
  if (!text) return "neutral";
  if (MESSAGE_FAILURE_PATTERN.test(text)) return "error";
  if (MESSAGE_SUCCESS_PATTERN.test(text)) return "success";
  return "neutral";
}

// Class suffix appended to a base `.profile-message`: green on success, else the
// red base (errors and ambiguous messages are unchanged from today).
export function profileMessageToneClass(message: string): string {
  return messageTone(message) === "success"
    ? " profile-message--success"
    : "";
}
