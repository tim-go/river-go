import { describe, expect, it } from "vitest";
import { messageTone, profileMessageToneClass } from "./messageTone";

describe("messageTone", () => {
  it("treats completed actions as success", () => {
    for (const msg of [
      "Promoted Test Section to a section.",
      "Updated River Wye.",
      "Photo deleted.",
      "Point deleted.",
      "Member access updated.",
      "River levels refreshed: 12 readings fetched, 4 inserted.",
    ]) {
      expect(messageTone(msg)).toBe("success");
    }
  });

  it("keeps failures red (never green)", () => {
    for (const msg of [
      "Could not promote this suggestion.",
      "Could not delete this point.",
      "Failed to load moderation queue.",
      "Admin access is required.",
      "Unable to reach the server.",
    ]) {
      expect(messageTone(msg)).toBe("error");
      expect(profileMessageToneClass(msg)).toBe("");
    }
  });

  it("does not paint a failed delete/reject green", () => {
    // 'delete'/'reject' are success words, but the failure phrasing must win.
    expect(messageTone("Could not delete this photo.")).toBe("error");
    expect(messageTone("Unable to reject this suggestion.")).toBe("error");
  });

  it("returns neutral for empty or ambiguous text", () => {
    expect(messageTone("")).toBe("neutral");
    expect(messageTone("Loading…")).toBe("neutral");
  });

  it("only adds the success class for successes", () => {
    expect(profileMessageToneClass("Promoted Test Section to a section.")).toBe(
      " profile-message--success",
    );
    expect(profileMessageToneClass("Loading…")).toBe("");
  });
});
