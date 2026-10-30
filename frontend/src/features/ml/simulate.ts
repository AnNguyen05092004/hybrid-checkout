/**
 * Reconciliation simulation (goals G1, G2, G4 of docs/01-phan-tich-de-bai.md): on each tray, a clean
 * scan must raise no high alert, and removing any one item from the scan list must raise one.
 * In the prototype it runs on the sample trays with the simulated detector; later it runs on the
 * RPC test images with the real model predictions.
 */
import { reconcile } from "../../lib/reconcile";
import { sku } from "../../mocks/catalog";
import { TRAYS, detect } from "../../mocks/trays";

export interface SimResult {
  trays: number;
  missRecall: number;
  falseAlarm: number;
  autoShare: number;
}

export function simulate(activeBatch: number, alert: number, auto: number, low: number): SimResult {
  const trays = TRAYS.filter((t) => t.objects.every((o) => o.skuTask <= activeBatch));
  let cleanAlarms = 0, misses = 0, caught = 0, dets = 0, autos = 0;
  const run = (scanned: Map<number, number>, detections: ReturnType<typeof detect>) =>
    reconcile({
      scanned, detections, isLearned: (id) => sku(id).task <= activeBatch,
      categoryOf: (id) => sku(id).category, priceOf: (id) => sku(id).price,
      alertThreshold: () => alert, lowThreshold: low,
    }).alerts.some((a) => a.severity === "HIGH");

  for (const t of trays) {
    const detections = detect(t, activeBatch);
    dets += detections.length;
    autos += detections.filter((d) => d.score >= auto).length;
    const full = new Map<number, number>();
    t.objects.forEach((o) => full.set(o.rpcId, (full.get(o.rpcId) ?? 0) + 1));
    if (run(full, detections)) cleanAlarms++;
    for (const [id] of full) {
      const missing = new Map(full);
      missing.set(id, missing.get(id)! - 1);
      misses++;
      if (run(missing, detections)) caught++;
    }
  }
  return {
    trays: trays.length,
    missRecall: misses ? (caught / misses) * 100 : 0,
    falseAlarm: trays.length ? (cleanAlarms / trays.length) * 100 : 0,
    autoShare: dets ? (autos / dets) * 100 : 0,
  };
}
