import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

describe("testing infrastructure", () => {
  it("vitest runs correctly", () => {
    expect(1 + 1).toBe(2);
  });

  it("fast-check runs correctly", () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer(), (a, b) => {
        expect(a + b).toBe(b + a);
      }),
    );
  });
});
