import { describe, expect, it } from "vitest";
import { parseGroupInput } from "./groups.js";

describe("parseGroupInput", () => {
  it("parses a valid group and defaults visibility to private", () => {
    const input = parseGroupInput({
      name: "Tryweryn Tuesdays",
      kind: "club",
      discipline: "whitewater",
    });
    expect(input.name).toBe("Tryweryn Tuesdays");
    expect(input.kind).toBe("club");
    expect(input.discipline).toBe("whitewater");
    expect(input.visibility).toBe("private");
  });

  it("allows a null discipline", () => {
    expect(parseGroupInput({ name: "Weekend crew", kind: "friends" }).discipline).toBe(
      null,
    );
  });

  it("rejects a missing or too-short name", () => {
    expect(() => parseGroupInput({ kind: "club" })).toThrow();
    expect(() => parseGroupInput({ name: "A", kind: "club" })).toThrow();
  });

  it("rejects an invalid kind", () => {
    expect(() => parseGroupInput({ name: "Some club", kind: "nonsense" })).toThrow();
  });

  it("rejects an invalid discipline", () => {
    expect(() =>
      parseGroupInput({ name: "Some club", kind: "club", discipline: "freestyle" }),
    ).toThrow();
  });
});
