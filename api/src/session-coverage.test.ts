import { describe, expect, it } from "vitest";
import { computeSessionCoverage } from "./session-coverage.js";

describe("computeSessionCoverage", () => {
  it("reports a gap when nobody has the kit", () => {
    const coverage = computeSessionCoverage([
      { memberId: "a", kit: ["boat pyranha 9r"], skills: [] },
    ]);
    const firstAid = coverage.find((check) => check.key === "first-aid-kit");
    expect(firstAid?.present).toBe(false);
    expect(firstAid?.count).toBe(0);
  });

  it("counts participants whose kit matches a keyword", () => {
    const coverage = computeSessionCoverage([
      { memberId: "a", kit: ["safety first aid kit"], skills: [] },
      { memberId: "b", kit: ["first aid pouch"], skills: [] },
      { memberId: "c", kit: ["throw line 20m"], skills: [] },
    ]);
    expect(
      coverage.find((check) => check.key === "first-aid-kit")?.count,
    ).toBe(2);
    expect(coverage.find((check) => check.key === "throw-line")?.count).toBe(1);
  });

  it("matches whitewater rescue training as a skill", () => {
    const coverage = computeSessionCoverage([
      { memberId: "a", kit: [], skills: ["whitewater safety & rescue (wwsr)"] },
    ]);
    expect(
      coverage.find((check) => check.key === "rescue-training")?.present,
    ).toBe(true);
  });

  it("does not count a kit keyword as a skill or vice versa", () => {
    const coverage = computeSessionCoverage([
      // First aid kit is kit, not training.
      { memberId: "a", kit: ["first aid kit"], skills: [] },
    ]);
    expect(
      coverage.find((check) => check.key === "first-aid-kit")?.present,
    ).toBe(true);
    expect(
      coverage.find((check) => check.key === "first-aid-training")?.present,
    ).toBe(false);
  });

  it("returns a zeroed check per definition for an empty session", () => {
    const coverage = computeSessionCoverage([]);
    expect(coverage.length).toBeGreaterThanOrEqual(5);
    expect(coverage.every((check) => check.count === 0 && !check.present)).toBe(
      true,
    );
  });
});
