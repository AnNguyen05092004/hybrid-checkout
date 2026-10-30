/**
 * Tray reconciliation (UC07, docs/02-use-case-user-stories.md section 5).
 * Compares what was scanned with what the camera saw and returns the alerts. Pure function:
 * the backend will run the same rules, the prototype runs it in the browser.
 */

export type Box = [number, number, number, number]; // x, y, w, h normalised to 0..1

export interface Detection {
  id: string;
  skuId: number;
  score: number;
  box: Box;
}

export type AlertType = "MON_CHUA_QUET" | "NGHI_TRAO_MA" | "QUET_KHONG_THAY";
export type Severity = "HIGH" | "MEDIUM" | "LOW";

export interface TrayAlert {
  id: string;
  type: AlertType;
  severity: Severity;
  /** SKU the camera saw (missing scan, or the real item of a swap). */
  seenSku?: number;
  /** SKU that was scanned (swap, or scanned but not seen). */
  scannedSku?: number;
  qty: number;
  /** Money at risk for the store. */
  value: number;
  detectionIds: string[];
}

export interface ReconcileInput {
  scanned: Map<number, number>;
  detections: Detection[];
  isLearned: (skuId: number) => boolean;
  categoryOf: (skuId: number) => string;
  priceOf: (skuId: number) => number;
  alertThreshold: (skuId: number) => number;
  lowThreshold: number;
}

export interface ReconcileResult {
  alerts: TrayAlert[];
  /** Detections counted and explained by a scan. */
  matched: Set<string>;
  /** Detections absorbed by scanned SKUs the model has not learned yet (no alert). */
  absorbed: Set<string>;
  /** Detections between the low and the alert threshold: drawn as uncertain only. */
  uncertain: Set<string>;
  seen: Map<number, number>;
}

export function reconcile(input: ReconcileInput): ReconcileResult {
  const { scanned, detections, isLearned, categoryOf, priceOf, alertThreshold, lowThreshold } = input;

  // 1. Detections counted as "seen", grouped per SKU, most confident first.
  const bySku = new Map<number, Detection[]>();
  const uncertain = new Set<string>();
  for (const d of detections) {
    if (!isLearned(d.skuId)) continue;
    if (d.score >= alertThreshold(d.skuId)) {
      bySku.set(d.skuId, [...(bySku.get(d.skuId) ?? []), d]);
    } else if (d.score >= lowThreshold) {
      uncertain.add(d.id);
    }
  }
  for (const list of bySku.values()) list.sort((a, b) => b.score - a.score);

  // 2. Difference per learned SKU. The extra detections of a SKU are its least confident ones.
  const excess: { sku: number; det: Detection }[] = [];
  const deficit: { sku: number; qty: number }[] = [];
  const matched = new Set<string>();
  const skus = new Set<number>([...bySku.keys(), ...[...scanned.keys()].filter(isLearned)]);
  for (const sku of skus) {
    const seenList = bySku.get(sku) ?? [];
    const scannedQty = scanned.get(sku) ?? 0;
    seenList.slice(0, scannedQty).forEach((d) => matched.add(d.id));
    seenList.slice(scannedQty).forEach((det) => excess.push({ sku, det }));
    if (scannedQty > seenList.length) deficit.push({ sku, qty: scannedQty - seenList.length });
  }
  excess.sort((a, b) => b.det.score - a.det.score);

  const alerts: TrayAlert[] = [];
  const push = (a: Omit<TrayAlert, "id">) => {
    const same = alerts.find((x) => x.type === a.type && x.seenSku === a.seenSku && x.scannedSku === a.scannedSku);
    if (same) {
      same.qty += a.qty;
      same.value += a.value;
      same.detectionIds.push(...a.detectionIds);
    } else {
      alerts.push({ ...a, id: `${a.type}-${a.seenSku ?? ""}-${a.scannedSku ?? ""}` });
    }
  };

  // 3. Swaps: an extra SKU and a missing SKU of the same category.
  const leftover: typeof excess = [];
  for (const e of excess) {
    const d = deficit.find((x) => x.qty > 0 && categoryOf(x.sku) === categoryOf(e.sku));
    if (!d) {
      leftover.push(e);
      continue;
    }
    d.qty -= 1;
    const diff = priceOf(e.sku) - priceOf(d.sku);
    push({
      type: "NGHI_TRAO_MA", severity: diff > 0 ? "HIGH" : "MEDIUM",
      seenSku: e.sku, scannedSku: d.sku, qty: 1, value: Math.max(diff, 0), detectionIds: [e.det.id],
    });
  }

  // 4. Scanned SKUs the model has not learned explain up to that many extra detections.
  let unlearned = [...scanned].filter(([sku]) => !isLearned(sku)).reduce((s, [, q]) => s + q, 0);
  const absorbed = new Set<string>();
  const byLowScore = [...leftover].sort((a, b) => a.det.score - b.det.score);
  const missing = new Set(leftover.map((e) => e.det.id));
  for (const e of byLowScore) {
    if (unlearned === 0) break;
    absorbed.add(e.det.id);
    missing.delete(e.det.id);
    unlearned -= 1;
  }

  // 5. Remaining extras: items on the tray that were not scanned.
  for (const e of leftover) {
    if (!missing.has(e.det.id)) continue;
    push({ type: "MON_CHUA_QUET", severity: "HIGH", seenSku: e.sku, qty: 1, value: priceOf(e.sku), detectionIds: [e.det.id] });
  }

  // 6. Remaining shortfalls: scanned but not seen (bagged, hidden). Logged only.
  for (const d of deficit) {
    if (d.qty > 0) push({ type: "QUET_KHONG_THAY", severity: "LOW", scannedSku: d.sku, qty: d.qty, value: 0, detectionIds: [] });
  }

  const seen = new Map([...bySku].map(([sku, list]) => [sku, list.length]));
  const order: Record<Severity, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  alerts.sort((a, b) => order[a.severity] - order[b.severity] || b.value - a.value);
  return { alerts, matched, absorbed, uncertain, seen };
}

export const ALERT_LABEL: Record<AlertType, string> = {
  MON_CHUA_QUET: "Món chưa quét",
  NGHI_TRAO_MA: "Nghi tráo mã",
  QUET_KHONG_THAY: "Quét nhưng camera không thấy",
};

export const SEVERITY_LABEL: Record<Severity, string> = { HIGH: "Cao", MEDIUM: "Trung bình", LOW: "Thấp" };
export const SEVERITY_TONE: Record<Severity, string> = { HIGH: "danger", MEDIUM: "warn", LOW: "" };
