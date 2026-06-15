import { describe, expect, it } from "vitest";
import {
  confirmationSummary,
  verificationStatusLabel,
} from "./contributionLabels";

describe("confirmationSummary", () => {
  it("handles the zero state", () => {
    expect(confirmationSummary(0)).toBe("Not yet confirmed by other paddlers");
  });

  it("uses the singular for one confirmation", () => {
    expect(confirmationSummary(1)).toBe("Confirmed by 1 paddler");
  });

  it("uses the plural for many", () => {
    expect(confirmationSummary(4)).toBe("Confirmed by 4 paddlers");
  });
});

describe("verificationStatusLabel", () => {
  it("maps enum values to friendly labels", () => {
    expect(verificationStatusLabel("needs-confirmation")).toBe(
      "Needs confirmation",
    );
    expect(verificationStatusLabel("confirmed")).toBe("Confirmed");
  });
});
