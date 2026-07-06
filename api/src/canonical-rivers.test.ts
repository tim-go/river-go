import { describe, expect, it } from "vitest";
import {
  humaniseCandidateType,
  sourceCandidateSummary,
} from "./canonical-rivers";

describe("humaniseCandidateType", () => {
  it("humanises raw candidate types", () => {
    expect(humaniseCandidateType("waterway=dam")).toBe("Dam");
    expect(humaniseCandidateType("waterway=lock_gate")).toBe("Lock gate");
    expect(humaniseCandidateType("whitewater-section")).toBe(
      "Whitewater section",
    );
    expect(humaniseCandidateType("rapids")).toBe("Rapids");
  });
});

describe("sourceCandidateSummary", () => {
  const make = (candidate_type: string, raw_properties: Record<string, unknown>) =>
    // Only the two fields the summary reads are needed here.
    ({ candidate_type, raw_properties }) as never;

  it("builds a natural description with grade", () => {
    expect(sourceCandidateSummary(make("whitewater-section", { rapids: "3" }))).toBe(
      "Grade 3 whitewater section.",
    );
    expect(sourceCandidateSummary(make("waterway=weir", { rapids: "4" }))).toBe(
      "Grade 4 weir.",
    );
  });

  it("builds a description with operator", () => {
    expect(
      sourceCandidateSummary(
        make("waterway=dam", { operator: "Scottish Hydro" }),
      ),
    ).toBe("Dam operated by Scottish Hydro.");
  });

  it("drops non-informative grade tags", () => {
    expect(sourceCandidateSummary(make("rapids", { rapids: "yes" }))).toBe(
      "Rapids.",
    );
  });

  it("handles a bare type", () => {
    expect(sourceCandidateSummary(make("waterway=waterfall", {}))).toBe(
      "Waterfall.",
    );
  });
});
