import { describe, expect, it } from "vitest";
import {
  CONTRIBUTOR_TERMS_VERSION,
  hasAcceptedCurrentContributorTerms,
} from "./contributorTerms";

describe("hasAcceptedCurrentContributorTerms", () => {
  it("accepts the current terms version", () => {
    expect(hasAcceptedCurrentContributorTerms(CONTRIBUTOR_TERMS_VERSION)).toBe(
      true,
    );
  });

  it("rejects a stale version (a terms bump re-prompts)", () => {
    expect(hasAcceptedCurrentContributorTerms("1999-01-01")).toBe(false);
  });

  it("rejects never-accepted (null/undefined)", () => {
    expect(hasAcceptedCurrentContributorTerms(null)).toBe(false);
    expect(hasAcceptedCurrentContributorTerms(undefined)).toBe(false);
  });
});
