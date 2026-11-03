/**
 * Model versions, one checkpoint per import batch. All metrics are ILLUSTRATIVE values for the prototype.
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
  forgetting: number; // mean AP50 drop on earlier batches, points
  gpuHours: number;
  missRecall: number;
  falseAlarm: number;
  swapRecall: number;
}

const base = { backbone: "Detector" };

export const MODEL_VERSIONS: ModelVersion[] = [
  { ...base, id: "v1", name: "v1 — Khai trương", batch: 1, skuCount: 100, checkpoint: "checkpoints/batch_1.pth", createdAt: "2026-10-23T21:10:00+07:00", cacc: 81.5, ap50: 95.2, forgetting: 0, gpuHours: 8.0, missRecall: 95.1, falseAlarm: 5.8, swapRecall: 71.0 },
  { ...base, id: "v2", name: "v2 — Đợt nhập 2", batch: 2, skuCount: 125, checkpoint: "checkpoints/batch_2.pth", createdAt: "2026-10-24T09:40:00+07:00", cacc: 77.0, ap50: 95.0, forgetting: 0.6, gpuHours: 3.0, missRecall: 94.6, falseAlarm: 6.4, swapRecall: 69.5 },
  { ...base, id: "v3", name: "v3 — Đợt nhập 3", batch: 3, skuCount: 150, checkpoint: "checkpoints/batch_3.pth", createdAt: "2026-10-25T02:15:00+07:00", cacc: 72.5, ap50: 94.7, forgetting: 0.9, gpuHours: 3.1, missRecall: 93.8, falseAlarm: 7.1, swapRecall: 68.2 },
  { ...base, id: "v4", name: "v4 — Đợt nhập 4", batch: 4, skuCount: 175, checkpoint: "checkpoints/batch_4.pth", createdAt: "2026-10-26T11:30:00+07:00", cacc: 67.0, ap50: 94.8, forgetting: 1.2, gpuHours: 3.2, missRecall: 93.0, falseAlarm: 7.9, swapRecall: 66.4 },
  { ...base, id: "v5", name: "v5 — Đợt nhập 5", batch: 5, skuCount: 200, checkpoint: "checkpoints/batch_5.pth", createdAt: "", cacc: 61.5, ap50: 94.6, forgetting: 1.4, gpuHours: 3.3, missRecall: 92.4, falseAlarm: 8.6, swapRecall: 65.1 },
];

/** Gate conditions of BR-09 (docs/02-use-case-user-stories.md). */
export const GATE = { maxAp50Drop: 1, maxForgetting: 5, minMissRecall: 90, maxFalseAlarm: 10 };

/** Most confused SKU pairs (illustrative), as model labels -> SKU ids. */
export const CONFUSED_PAIRS = [
  { from: 41, to: 59, count: 19 },
  { from: 84, to: 85, count: 9 },
  { from: 80, to: 81, count: 7 },
  { from: 73, to: 72, count: 5 },
].map((p) => ({ from: SKU_BY_LABEL.get(p.from)!.id, to: SKU_BY_LABEL.get(p.to)!.id, count: p.count }));
