import { describe, expect, it } from "vitest";
import { meaningfulRiverWords, riverMarkerInitial } from "./riverName";

describe("riverMarkerInitial", () => {
  it("skips the Welsh 'Afon' prefix", () => {
    expect(riverMarkerInitial("Afon Colwyn")).toBe("C");
  });
  it("skips the English 'River' prefix", () => {
    expect(riverMarkerInitial("River Wye")).toBe("W");
  });
  it("skips 'Nant'", () => {
    expect(riverMarkerInitial("Nant Gwynant")).toBe("G");
  });
  it("skips a multi-word 'Water of' prefix", () => {
    expect(riverMarkerInitial("Water of Nevis")).toBe("N");
  });
  it("handles the 'Yr Afon' double prefix", () => {
    expect(riverMarkerInitial("Yr Afon Glaslyn")).toBe("G");
  });
  it("keeps a plain name", () => {
    expect(riverMarkerInitial("Dee")).toBe("D");
  });
  it("keeps the name when it is only a generic word", () => {
    expect(riverMarkerInitial("Afon")).toBe("A");
  });
  it("falls back to R for an empty name", () => {
    expect(riverMarkerInitial("")).toBe("R");
  });
});

describe("meaningfulRiverWords", () => {
  it("strips a leading generic word", () => {
    expect(meaningfulRiverWords("Afon Colwyn")).toEqual(["Colwyn"]);
  });
  it("preserves a multi-word meaningful name", () => {
    expect(meaningfulRiverWords("River Severn Loop")).toEqual([
      "Severn",
      "Loop",
    ]);
  });
});
