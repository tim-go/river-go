import { describe, expect, it } from "vitest";
import { parseSessionInput } from "./group-sessions.js";

describe("parseSessionInput", () => {
  it("parses a valid session", () => {
    const input = parseSessionInput({
      groupId: "group-1",
      title: "Saturday Dee",
      meetingPoint: "Llangollen car park",
    });
    expect(input.groupId).toBe("group-1");
    expect(input.title).toBe("Saturday Dee");
    expect(input.meetingPoint).toBe("Llangollen car park");
    expect(input.scheduledFor).toBe(null);
  });

  it("requires a group and a title", () => {
    expect(() => parseSessionInput({ title: "Solo run" })).toThrow();
    expect(() => parseSessionInput({ groupId: "group-1" })).toThrow();
  });

  it("rejects an invalid date", () => {
    expect(() =>
      parseSessionInput({
        groupId: "group-1",
        title: "Trip",
        scheduledFor: "not-a-date",
      }),
    ).toThrow();
  });

  it("normalises a valid date to ISO", () => {
    const input = parseSessionInput({
      groupId: "group-1",
      title: "Trip",
      scheduledFor: "2026-07-01T12:00:00Z",
    });
    expect(input.scheduledFor).toBe("2026-07-01T12:00:00.000Z");
  });
});
