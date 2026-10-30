import type { Box } from "./reconcile";

/** Intersection over union of two boxes (x, y, w, h). */
export function iou(a: Box, b: Box): number {
  const w = Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0]);
  const h = Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]);
  if (w <= 0 || h <= 0) return 0;
  const inter = w * h;
  return inter / (a[2] * a[3] + b[2] * b[3] - inter);
}
