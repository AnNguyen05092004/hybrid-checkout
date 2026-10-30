import type { TrayBox } from "../../components/TrayViewer";
import { ALERT_LABEL, type TrayAlert } from "../../lib/reconcile";
import { sku } from "../../mocks/catalog";
import type { Checkout } from "./useCheckout";

/**
 * Boxes drawn on the tray. Boxes that need attention (alert, to scan, uncertain) always carry a label;
 * boxes that are fine are "quiet": coloured outline only, label on demand, to keep the image readable.
 */
export function trayBoxes(co: Checkout): TrayBox[] {
  const { phase, mode, result, detections, dismissed, reviews, isAuto } = co;
  if (phase !== "done") return [];
  const boxes: TrayBox[] = [];

  if (mode === "VERIFY") {
    if (!result) return [];
    const alertOf = new Map<string, TrayAlert>();
    result.alerts.forEach((a) => a.detectionIds.forEach((d) => alertOf.set(d, a)));
    for (const d of detections) {
      const name = sku(d.skuId).name;
      const a = alertOf.get(d.id);
      if (a && !dismissed[a.id]) boxes.push({ id: d.id, box: d.box, kind: "alert", label: `! ${ALERT_LABEL[a.type]}: ${name}` });
      else if (result.matched.has(d.id) || a) boxes.push({ id: d.id, box: d.box, kind: "match", label: `✓ ${name}`, quiet: true });
      else if (result.absorbed.has(d.id)) boxes.push({ id: d.id, box: d.box, kind: "uncertain", label: "? Có thể là hàng mới", dashed: true });
      else if (result.uncertain.has(d.id)) boxes.push({ id: d.id, box: d.box, kind: "uncertain", label: `? ${name}`, dashed: true });
    }
    return boxes;
  }

  for (const d of detections) {
    const i = reviews.findIndex((x) => x.det.id === d.id);
    const r = reviews[i];
    if (!r && isAuto(d)) boxes.push({ id: d.id, box: d.box, kind: "auto", label: `✓ ${sku(d.skuId).name}`, quiet: true });
    else if (r && r.resolved !== null) boxes.push({ id: d.id, box: d.box, kind: "match", label: `✓ ${sku(r.resolved).name}`, quiet: true });
    else if (r) boxes.push({ id: d.id, box: d.box, kind: "review", label: `${i + 1}. Cần quét` });
  }
  return boxes;
}
