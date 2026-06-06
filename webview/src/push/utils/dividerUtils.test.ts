import { describe, expect, it } from "vitest";
import { computePaneWidths, DIVIDER_DEFAULTS } from "./dividerUtils";

describe("computePaneWidths", () => {
  it("should return correct widths for a normal drag position", () => {
    const result = computePaneWidths(600, 240, 150, 150);
    expect(result.leftWidth).toBe(240);
    expect(result.rightWidth).toBe(360);
  });

  it("should enforce left + right = containerWidth (conservation)", () => {
    const result = computePaneWidths(800, 400, 150, 150);
    expect(result.leftWidth + result.rightWidth).toBe(800);
  });

  it("should clamp left width to minLeft when dragX is too small", () => {
    const result = computePaneWidths(600, 50, 150, 150);
    expect(result.leftWidth).toBe(150);
    expect(result.rightWidth).toBe(450);
  });

  it("should clamp left width to containerWidth - minRight when dragX is too large", () => {
    const result = computePaneWidths(600, 500, 150, 150);
    expect(result.leftWidth).toBe(450);
    expect(result.rightWidth).toBe(150);
  });

  it("should handle dragX at exactly minLeft boundary", () => {
    const result = computePaneWidths(600, 150, 150, 150);
    expect(result.leftWidth).toBe(150);
    expect(result.rightWidth).toBe(450);
  });

  it("should handle dragX at exactly maxLeft boundary", () => {
    const result = computePaneWidths(600, 450, 150, 150);
    expect(result.leftWidth).toBe(450);
    expect(result.rightWidth).toBe(150);
  });

  it("should handle negative dragX by clamping to minLeft", () => {
    const result = computePaneWidths(600, -100, 150, 150);
    expect(result.leftWidth).toBe(150);
    expect(result.rightWidth).toBe(450);
  });

  it("should handle dragX exceeding containerWidth by clamping to maxLeft", () => {
    const result = computePaneWidths(600, 1000, 150, 150);
    expect(result.leftWidth).toBe(450);
    expect(result.rightWidth).toBe(150);
  });

  it("should handle containerWidth exactly at 300 (minimum for both panes)", () => {
    const result = computePaneWidths(300, 150, 150, 150);
    expect(result.leftWidth).toBe(150);
    expect(result.rightWidth).toBe(150);
  });
});

describe("DIVIDER_DEFAULTS", () => {
  it("should have expected default values", () => {
    expect(DIVIDER_DEFAULTS.defaultPercent).toBe(40);
    expect(DIVIDER_DEFAULTS.minLeftPx).toBe(150);
    expect(DIVIDER_DEFAULTS.minRightPx).toBe(150);
    expect(DIVIDER_DEFAULTS.hitAreaPx).toBe(4);
  });
});
