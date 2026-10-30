import { describe, expect, it } from "vitest";
import { reconcile, type Detection, type ReconcileInput } from "./reconcile";

// Three learned SKU: 1 and 2 are drinks (2 is dearer), 3 is a snack. SKU 9 is new, not learned yet.
const CATEGORY: Record<number, string> = { 1: "drink", 2: "drink", 3: "snack", 9: "snack" };
const PRICE: Record<number, number> = { 1: 10000, 2: 25000, 3: 15000, 9: 20000 };

let n = 0;
const det = (skuId: number, score = 0.9): Detection => ({ id: `d${n++}`, skuId, score, box: [0, 0, 0.1, 0.1] });

function run(scanned: Record<number, number>, detections: Detection[]) {
  const input: ReconcileInput = {
    scanned: new Map(Object.entries(scanned).map(([k, v]) => [Number(k), v])),
    detections,
    isLearned: (id) => id !== 9,
    categoryOf: (id) => CATEGORY[id],
    priceOf: (id) => PRICE[id],
    alertThreshold: () => 0.5,
    lowThreshold: 0.3,
  };
  return reconcile(input);
}

describe("reconcile (UC07)", () => {
  it("raises nothing when the scan list matches the tray", () => {
    const r = run({ 1: 2, 3: 1 }, [det(1), det(1), det(3)]);
    expect(r.alerts).toEqual([]);
    expect(r.matched.size).toBe(3);
  });

  it("flags an item seen on the tray but not scanned as a HIGH alert", () => {
    const r = run({ 1: 1 }, [det(1), det(3)]);
    expect(r.alerts).toHaveLength(1);
    expect(r.alerts[0]).toMatchObject({ type: "MON_CHUA_QUET", severity: "HIGH", seenSku: 3, qty: 1, value: 15000 });
  });

  it("flags a cheaper SKU of the same category scanned for a dearer one as a HIGH swap", () => {
    const r = run({ 1: 1 }, [det(2)]);
    expect(r.alerts).toHaveLength(1);
    expect(r.alerts[0]).toMatchObject({ type: "NGHI_TRAO_MA", severity: "HIGH", seenSku: 2, scannedSku: 1, value: 15000 });
  });

  it("keeps a swap towards a cheaper SKU at MEDIUM", () => {
    const r = run({ 2: 1 }, [det(1)]);
    expect(r.alerts[0]).toMatchObject({ type: "NGHI_TRAO_MA", severity: "MEDIUM", value: 0 });
  });

  it("does not alert when the extra detection is explained by a scanned SKU the model has not learned", () => {
    // The model takes the new snack (9) for the learned snack 3.
    const r = run({ 1: 1, 9: 1 }, [det(1), det(3, 0.55)]);
    expect(r.alerts).toEqual([]);
    expect(r.absorbed.size).toBe(1);
  });

  it("logs a scanned item the camera does not see as LOW only", () => {
    const r = run({ 1: 2 }, [det(1)]);
    expect(r.alerts).toHaveLength(1);
    expect(r.alerts[0]).toMatchObject({ type: "QUET_KHONG_THAY", severity: "LOW", scannedSku: 1, qty: 1 });
  });

  it("ignores detections below the alert threshold but reports them as uncertain", () => {
    const low = det(3, 0.4);
    const r = run({ 1: 1 }, [det(1), low]);
    expect(r.alerts).toEqual([]);
    expect(r.uncertain.has(low.id)).toBe(true);
  });

  it("groups several missed items of one SKU in one alert and sorts HIGH first", () => {
    const r = run({ 1: 2 }, [det(3), det(3), det(1)]);
    expect(r.alerts.map((a) => [a.type, a.qty])).toEqual([["MON_CHUA_QUET", 2], ["QUET_KHONG_THAY", 1]]);
  });
});
