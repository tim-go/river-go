import { describe, expect, it } from "vitest";
import { evaluatePassword, validatePasswordConfirmation } from "./passwordPolicy";

describe("evaluatePassword", () => {
  it("requires a password", () => {
    const status = evaluatePassword("", 0);
    expect(status.valid).toBe(false);
    expect(status.strengthLabel).toBe("empty");
    expect(status.message).toMatch(/required/i);
  });

  it("rejects a short password even at the top score", () => {
    const status = evaluatePassword("Ab3$xy", 4);
    expect(status.lengthOk).toBe(false);
    expect(status.valid).toBe(false);
    expect(status.message).toMatch(/at least 12/i);
  });

  it("rejects a long but guessable password (low score)", () => {
    const status = evaluatePassword("passwordpassword", 1);
    expect(status.lengthOk).toBe(true);
    expect(status.scoreOk).toBe(false);
    expect(status.valid).toBe(false);
    expect(status.message).toMatch(/predictable|words/i);
  });

  it("treats score 2 as 'okay' but not yet valid", () => {
    const status = evaluatePassword("abcdefghijkl", 2);
    expect(status.lengthOk).toBe(true);
    expect(status.strengthLabel).toBe("okay");
    expect(status.valid).toBe(false);
  });

  it("accepts a long, strong password", () => {
    const status = evaluatePassword("correct horse battery", 4);
    expect(status.valid).toBe(true);
    expect(status.strengthLabel).toBe("strong");
    expect(status.message).toBeNull();
  });

  it("rejects leading/trailing whitespace", () => {
    const status = evaluatePassword(" twelvecharacters ", 4);
    expect(status.noOuterWhitespace).toBe(false);
    expect(status.valid).toBe(false);
  });
});

describe("validatePasswordConfirmation", () => {
  it("requires a confirmation", () => {
    expect(validatePasswordConfirmation("abc", "")).toMatch(/confirm/i);
  });

  it("flags a mismatch", () => {
    expect(validatePasswordConfirmation("abc", "abd")).toMatch(/match/i);
  });

  it("passes when equal", () => {
    expect(validatePasswordConfirmation("abc", "abc")).toBeNull();
  });
});
