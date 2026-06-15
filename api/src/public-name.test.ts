import { describe, expect, it } from "vitest";
import { defaultPublicName, normalisePublicName } from "./public-name.js";

describe("normalisePublicName", () => {
  it("accepts an ordinary name and collapses whitespace", () => {
    expect(normalisePublicName("  Tryweryn   Tom ")).toBe("Tryweryn Tom");
  });

  it("rejects too-short names", () => {
    expect(() => normalisePublicName("A")).toThrow();
  });

  it("rejects contact details and links", () => {
    expect(() => normalisePublicName("me@example.com")).toThrow();
    expect(() => normalisePublicName("see www.example.com")).toThrow();
  });

  it("rejects names implying staff/organisation status", () => {
    expect(() => normalisePublicName("RiverLaunch member 6678")).toThrow();
    expect(() => normalisePublicName("admin")).toThrow();
  });
});

describe("defaultPublicName", () => {
  it("uses a clean display name when it is valid", () => {
    expect(defaultPublicName("Jo Paddler")).toBe("Jo Paddler");
  });

  it("invariant: a generated default always passes its own validator", () => {
    // Regression: the old fallback "RiverLaunch member N" was rejected by
    // normalisePublicName (the brand word is blocked), trapping members on the
    // default name. The generated default must always be acceptable.
    for (let i = 0; i < 50; i += 1) {
      const generated = defaultPublicName("");
      expect(() => normalisePublicName(generated)).not.toThrow();
    }
  });
});
