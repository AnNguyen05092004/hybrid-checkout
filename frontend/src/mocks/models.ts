/**
 * Model versions. cAcc / AP50 on val and GPU hours are real evaluation results of the recognition model
 * (one checkpoint per import batch). Reconciliation metrics
 * (missed-item recall, false alarms, swap detection) are ILLUSTRATIVE until the simulation is run.
 */
import { SKU_BY_LABEL } from "./catalog";

export interface ModelVersion {
  id: string;
  name: string;
  batch: number; // last import batch learned
  skuCount: number;
  backbone: string;
  checkpoint: string;
  createdAt: string;
  cacc: number; // cAcc on val, %
  ap50: number; // AP50 on val, %
  forgetting: number; // mean AP50 drop on earlier batches, points (measured: about 0)
  gpuHours: number;
  // Illustrative reconciliation metrics
  missRecall: number;
  falseAlarm: number;
  swapRecall: number;
}

const base = { backbone: "ConvNeXt-V2-Base + PDP", forgetting: 0 };

export const MODEL_VERSIONS: ModelVersion[] = [
  { ...base, id: "v1", name: "v1 — Khai trương", batch: 1, skuCount: 100, checkpoint: "checkpoints/batch_1.pth", createdAt: "2026-10-23T21:10:00+07:00", cacc: 79.38, ap50: 93.38, gpuHours: 11.0, missRecall: 95.1, falseAlarm: 5.8, swapRecall: 71.0 },
  { ...base, id: "v2", name: "v2 — Đợt nhập 2", batch: 2, skuCount: 125, checkpoint: "checkpoints/batch_2.pth", createdAt: "2026-10-24T09:40:00+07:00", cacc: 73.64, ap50: 94.44, gpuHours: 5.36, missRecall: 94.6, falseAlarm: 6.4, swapRecall: 69.5 },
  { ...base, id: "v3", name: "v3 — Đợt nhập 3", batch: 3, skuCount: 150, checkpoint: "checkpoints/batch_3.pth", createdAt: "2026-10-25T02:15:00+07:00", cacc: 65.04, ap50: 94.85, gpuHours: 5.23, missRecall: 93.8, falseAlarm: 7.1, swapRecall: 68.2 },
  { ...base, id: "v4", name: "v4 — Đợt nhập 4", batch: 4, skuCount: 175, checkpoint: "checkpoints/batch_4.pth", createdAt: "2026-10-26T11:30:00+07:00", cacc: 56.33, ap50: 94.59, gpuHours: 5.18, missRecall: 93.0, falseAlarm: 7.9, swapRecall: 66.4 },
  { ...base, id: "v5", name: "v5 — Đợt nhập 5", batch: 5, skuCount: 200, checkpoint: "checkpoints/batch_5.pth", createdAt: "", cacc: 43.68, ap50: 94.95, gpuHours: 5.9, missRecall: 92.4, falseAlarm: 8.6, swapRecall: 65.1 },
];

/** Gate conditions of BR-09 (docs/02-use-case-user-stories.md). */
export const GATE = { maxAp50Drop: 1, maxForgetting: 5, minMissRecall: 90, maxFalseAlarm: 10 };

/** Most confused SKU pairs on val, as model labels -> SKU ids. */
export const CONFUSED_PAIRS = [
  { from: 41, to: 59, count: 19 },
  { from: 84, to: 85, count: 9 },
  { from: 80, to: 81, count: 7 },
  { from: 73, to: 72, count: 5 },
].map((p) => ({ from: SKU_BY_LABEL.get(p.from)!.id, to: SKU_BY_LABEL.get(p.to)!.id, count: p.count }));
