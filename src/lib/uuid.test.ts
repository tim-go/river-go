import { afterEach, describe, expect, it, vi } from "vitest";
import { generateUuid } from "./uuid";

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("generateUuid", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns a valid RFC 4122 v4 UUID", () => {
    expect(generateUuid()).toMatch(UUID_V4);
  });

  it("returns unique values", () => {
    const ids = new Set(Array.from({ length: 1000 }, () => generateUuid()));
    expect(ids.size).toBe(1000);
  });

  it("falls back to getRandomValues when randomUUID is unavailable", () => {
    // Reproduces an insecure context (e.g. http://<LAN-ip>) where
    // crypto.randomUUID is undefined but getRandomValues still works.
    vi.stubGlobal("crypto", {
      getRandomValues:
        globalThis.crypto.getRandomValues.bind(globalThis.crypto),
    });
    expect(generateUuid()).toMatch(UUID_V4);
  });
});
