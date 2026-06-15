import { describe, expect, it } from "vitest";
import { evaluateContributorGate } from "./contributorGate";

const qualified = {
  isSignedIn: true,
  emailVerified: true,
  hasPublicName: true,
  hasAcceptedTerms: true,
  requireEmailVerification: true,
};

describe("evaluateContributorGate", () => {
  it("allows a fully-qualified member", () => {
    expect(evaluateContributorGate(qualified)).toBe(true);
  });

  it("blocks when not signed in", () => {
    expect(evaluateContributorGate({ ...qualified, isSignedIn: false })).toBe(
      false,
    );
  });

  it("blocks without a public name", () => {
    expect(
      evaluateContributorGate({ ...qualified, hasPublicName: false }),
    ).toBe(false);
  });

  it("blocks without accepted terms", () => {
    expect(
      evaluateContributorGate({ ...qualified, hasAcceptedTerms: false }),
    ).toBe(false);
  });

  it("requires a verified email when enforcement is on", () => {
    expect(
      evaluateContributorGate({ ...qualified, emailVerified: false }),
    ).toBe(false);
  });

  it("ignores email verification when enforcement is relaxed", () => {
    expect(
      evaluateContributorGate({
        ...qualified,
        requireEmailVerification: false,
        emailVerified: false,
      }),
    ).toBe(true);
  });
});
