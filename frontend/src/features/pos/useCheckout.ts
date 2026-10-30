import { useEffect, useMemo, useState } from "react";
import { useStore } from "../../app/store";
import { reconcile, type Detection, type TrayAlert } from "../../lib/reconcile";
import { sku } from "../../mocks/catalog";
import type { AlertRecord, TxLine } from "../../mocks/seed";
import { TRAYS, detect } from "../../mocks/trays";

export type Mode = "VERIFY" | "FAST";
export type Phase = "idle" | "loading" | "done" | "error";

/** A detection of the fast lane the cashier still has to confirm with a scan. */
export interface Review {
  det: Detection;
  resolved: number | null;
}

export interface Dismissal {
  reason: string;
}

/**
 * State and rules of one checkout at the counter (UC05, UC06, UC07, UC08).
 * The page only renders what this hook returns.
 */
export function useCheckout() {
  const { shift, counters, activeBatch, thresholds, isLearned, skus, user, addTransaction } = useStore();
  const counter = counters.find((c) => c.id === shift?.counterId) ?? counters[0];

  const [mode, setModeState] = useState<Mode>("VERIFY");
  const [trayId, setTrayId] = useState(TRAYS[0].id);
  const [lines, setLines] = useState<TxLine[]>([]);
  const [scanError, setScanError] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [failures, setFailures] = useState(0);
  const [skipped, setSkipped] = useState(false);
  const [dismissed, setDismissed] = useState<Record<string, Dismissal>>({});
  const [raised, setRaised] = useState<Record<string, TrayAlert>>({});
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedReview, setSelectedReview] = useState<string | null>(null);
  const [outsideDone, setOutsideDone] = useState(false);
  const [corrections, setCorrections] = useState(0);

  const tray = TRAYS.find((t) => t.id === trayId)!;
  const detections = useMemo(() => detect(tray, activeBatch), [tray, activeBatch]);
  const th = (skuId: number) => thresholds[sku(skuId).task] ?? thresholds[1];
  const low = thresholds[1].low;
  const isAuto = (d: Detection) => isLearned(d.skuId) && d.score >= th(d.skuId).auto;

  const scanned = useMemo(() => {
    const m = new Map<number, number>();
    lines.forEach((l) => m.set(l.skuId, (m.get(l.skuId) ?? 0) + l.qty));
    return m;
  }, [lines]);

  // In the fast lane, confirmed detections count with the SKU the cashier scanned.
  const reconciled = useMemo(() => (mode === "VERIFY" ? detections : [
    ...detections.filter(isAuto),
    ...reviews.filter((r) => r.resolved !== null && isLearned(r.resolved)).map((r) => ({ ...r.det, skuId: r.resolved!, score: 1 })),
  ]), [mode, detections, reviews, activeBatch, thresholds]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reconciliation is derived: it re-runs on every scan once the tray has been checked.
  const ready = phase === "done" && (mode === "VERIFY" || outsideDone);
  const result = useMemo(() => (!ready ? null : reconcile({
    scanned, detections: reconciled, isLearned,
    categoryOf: (id) => sku(id).category, priceOf: (id) => sku(id).price,
    alertThreshold: (id) => th(id).alert, lowThreshold: low,
  })), [ready, scanned, reconciled]); // eslint-disable-line react-hooks/exhaustive-deps

  // Remember every alert raised during the checkout, so the transaction records how each was closed.
  useEffect(() => {
    if (!result) return;
    const fresh = result.alerts.filter((a) => raised[a.id]?.qty !== a.qty);
    if (fresh.length) setRaised((r) => ({ ...r, ...Object.fromEntries(fresh.map((a) => [a.id, a])) }));
  }, [result]); // eslint-disable-line react-hooks/exhaustive-deps

  const openAlerts = (result?.alerts ?? []).filter((a) => !dismissed[a.id]);
  const blocking = openAlerts.filter((a) => a.severity === "HIGH");
  const pendingReviews = reviews.filter((r) => r.resolved === null);
  const total = lines.reduce((s, l) => s + l.qty * l.price, 0);
  const itemCount = lines.reduce((s, l) => s + l.qty, 0);

  /** Why payment is locked, or "" when the cashier may pay (BR-03). */
  const payBlocker =
    lines.length === 0 ? "Giỏ hàng trống." :
    skipped ? "" :
    phase !== "done" ? (mode === "VERIFY" ? "Bấm Kiểm tra khay trước khi thanh toán." : "Bấm Nhận diện khay trước.") :
    mode === "FAST" && pendingReviews.length ? `Còn ${pendingReviews.length} món cần quét xác nhận.` :
    mode === "FAST" && !outsideDone ? "Xác nhận đã quét hết món ngoài vùng nhận diện." :
    blocking.length ? `Còn ${blocking.length} cảnh báo mức Cao chưa xử lý.` : "";

  /** Current step of the 3-step bar (0, 1 or 2). */
  const step = phase !== "done" && !skipped ? (mode === "VERIFY" && lines.length === 0 ? 0 : mode === "VERIFY" ? 1 : 0)
    : payBlocker ? 1 : 2;

  const addLine = (skuId: number, source: TxLine["source"]) =>
    setLines((ls) => {
      const found = ls.find((l) => l.skuId === skuId && l.source === source);
      if (found) return ls.map((l) => (l === found ? { ...l, qty: l.qty + 1 } : l));
      return [...ls, { skuId, qty: 1, price: sku(skuId).price, source }];
    });

  const scan = (barcode: string) => {
    const s = skus.find((x) => x.barcode === barcode.trim());
    if (!s) return setScanError(`Mã ${barcode} không có trong danh mục.`);
    if (!s.selling) return setScanError(`${s.name} đang ngừng bán.`);
    setScanError("");
    if (mode === "FAST" && phase === "done") {
      const target = reviews.find((r) => r.det.id === selectedReview && r.resolved === null)
        ?? reviews.find((r) => r.resolved === null && r.det.skuId === s.id);
      if (target) {
        if (target.det.skuId !== s.id) setCorrections((c) => c + 1);
        setReviews((rs) => rs.map((r) => (r === target ? { ...r, resolved: s.id } : r)));
        setSelectedReview(null);
      }
    }
    addLine(s.id, "BARCODE");
  };

  const capture = () => {
    setPhase("loading");
    setTimeout(() => {
      if (!counter.cameraOnline) {
        setFailures((f) => f + 1);
        setPhase("error");
        return;
      }
      if (mode === "FAST") {
        const auto = detections.filter(isAuto);
        auto.forEach((d) => addLine(d.skuId, "CAMERA"));
        setReviews(detections.filter((d) => !auto.includes(d) && d.score >= low).map((det) => ({ det, resolved: null })));
      }
      setPhase("done");
    }, 700);
  };

  const reset = () => {
    setLines([]); setPhase("idle"); setFailures(0); setSkipped(false); setDismissed({}); setRaised({});
    setReviews([]); setSelectedReview(null); setOutsideDone(false); setCorrections(0); setScanError("");
  };

  const setMode = (m: Mode) => {
    setModeState(m);
    reset();
  };

  const nextTray = () => {
    const i = TRAYS.findIndex((t) => t.id === trayId);
    setTrayId(TRAYS[(i + 1) % TRAYS.length].id);
  };

  const dismiss = (alertId: string, d: Dismissal) => setDismissed((x) => ({ ...x, [alertId]: d }));
  const removeLine = (line: TxLine) => setLines((ls) => ls.filter((l) => l !== line));

  /** Save the paid transaction and return its id. */
  const pay = (method: "CASH" | "CARD" | "TRANSFER") => {
    const id = `GD${Date.now().toString().slice(-6)}`;
    const alerts: AlertRecord[] = Object.values(raised).map((a) => {
      const d = dismissed[a.id];
      if (a.severity === "LOW") return { ...a, resolution: "TU_DONG", reason: d?.reason };
      if (d) return { ...a, resolution: "BAO_NHAM", reason: d.reason };
      return { ...a, resolution: "DA_QUET_BO_SUNG" };
    });
    addTransaction({
      id, at: new Date().toISOString(), counterId: counter.id, cashier: user!.name, mode, trayId,
      modelVersion: `v${activeBatch}`, lines, alerts, status: "DA_THANH_TOAN", payment: method, total, corrections,
    });
    return id;
  };

  return {
    counter, mode, setMode, tray, trayId, setTrayId, nextTray, detections, lines, scanned, scanError,
    phase, failures, skipped, setSkipped, result, openAlerts, blocking, raised, dismissed, dismiss,
    reviews, pendingReviews, selectedReview, setSelectedReview, outsideDone, setOutsideDone,
    total, itemCount, payBlocker, step, isAuto, isLearned,
    scan, capture, reset, removeLine, pay,
  };
}

export type Checkout = ReturnType<typeof useCheckout>;
