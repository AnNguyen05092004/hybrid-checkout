import { describe, expect, it } from "vitest";
import { iou } from "./box";

describe("iou", () => {
  it("is 1 for the same box and 0 for disjoint boxes", () => {
    expect(iou([0.1, 0.1, 0.2, 0.2], [0.1, 0.1, 0.2, 0.2])).toBeCloseTo(1);
    expect(iou([0, 0, 0.1, 0.1], [0.5, 0.5, 0.1, 0.1])).toBe(0);
  });

  it("is overlap area over union area", () => {
    // Two 0.2 x 0.2 boxes shifted by half a width: overlap 0.02, union 0.06.
    expect(iou([0, 0, 0.2, 0.2], [0.1, 0, 0.2, 0.2])).toBeCloseTo(1 / 3);
  });
});
