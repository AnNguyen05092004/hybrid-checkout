import { useRef, useState, type KeyboardEvent } from "react";
import { Camera, Loader2, ScanBarcode, ScanLine, Tags, XCircle } from "lucide-react";
import { useStore } from "../../app/store";
import { TrayViewer } from "../../components/TrayViewer";
import { money } from "../../lib/format";
import { ALERT_LABEL, type TrayAlert } from "../../lib/reconcile";
import { sku } from "../../mocks/catalog";
import type { TxLine } from "../../mocks/seed";
import { AlertList } from "./components/AlertList";
import { CartPanel } from "./components/CartPanel";
import { DeviceSimulator } from "./components/DeviceSimulator";
import { ReviewList } from "./components/ReviewList";
import { StepBar } from "./components/StepBar";
import { ManagerPinDialog } from "./ManagerPinDialog";
import { PaymentDialog } from "./PaymentDialog";
import { trayBoxes } from "./trayBoxes";
import { useCheckout, type Mode } from "./useCheckout";

interface PinRequest {
  title: string;
  summary: string;
  reasons: string[];
  run: (reason: string, manager: string) => void;
}

const MODE_HINT: Record<Mode, string> = {
  VERIFY: "Quét mã từng món, camera kiểm tra khay trước khi thanh toán",
  FAST: "Camera nhận diện cả khay, chỉ quét món không chắc",
};

/** P02 / P03 — counter screen: layout and dialogs. Checkout rules live in useCheckout. */
export function PosPage() {
  const { log, toast } = useStore();
  const co = useCheckout();
  const [code, setCode] = useState("");
  const [focusAlert, setFocusAlert] = useState<string | null>(null);
  const [allLabels, setAllLabels] = useState(false);
  const [pin, setPin] = useState<PinRequest | null>(null);
  const [paying, setPaying] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const focusInput = () => setTimeout(() => inputRef.current?.focus(), 0);

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || !code.trim()) return;
    co.scan(code);
    setCode("");
  };

  const newCheckout = () => {
    co.reset();
    setCode("");
    setFocusAlert(null);
    setPaying(false);
    focusInput();
  };

  const askManagerForAlert = (a: TrayAlert) => setPin({
    title: "Xác nhận báo nhầm",
    summary: `${ALERT_LABEL[a.type]}: ${sku((a.seenSku ?? a.scannedSku)!).name} × ${a.qty}`,
    reasons: ["Báo nhầm — model nhầm SKU", "Báo nhầm — món khách mang theo, không mua", "Báo nhầm — vật không phải hàng hóa"],
    run: (reason, manager) => { co.dismiss(a.id, { reason, manager }); log("CONFIRM_FALSE_ALARM", co.counter.name, `${manager}: ${reason}`); },
  });

  const askRemoveLine = (l: TxLine) => setPin({
    title: "Xóa dòng",
    summary: `${sku(l.skuId).name} × ${l.qty} (${money(l.qty * l.price)})`,
    reasons: ["Khách không lấy nữa", "Quét nhầm mã", "Quét trùng"],
    run: (reason, manager) => { co.removeLine(l); log("DELETE_LINE", co.counter.name, `${manager}: ${sku(l.skuId).name} — ${reason}`); },
  });

  const askCancel = () => setPin({
    title: "Hủy giao dịch",
    summary: `${co.itemCount} món, ${money(co.total)}`,
    reasons: ["Khách đổi ý", "Thao tác nhầm"],
    run: (reason, manager) => { log("CANCEL_TX", co.counter.name, `${manager}: ${reason}`); toast("Đã hủy giao dịch."); newCheckout(); },
  });

  const askSkip = () => setPin({
    title: "Bỏ qua kiểm tra khay",
    summary: `Camera ${co.counter.camera} không phản hồi sau ${co.failures} lần thử. Giao dịch sẽ ghi "không kiểm tra".`,
    reasons: ["Camera lỗi, khách đang chờ"],
    run: (reason, manager) => { co.setSkipped(true); log("SKIP_CHECK", co.counter.name, `${manager}: ${reason}`); },
  });

  const focus = focusAlert ? co.result?.alerts.find((a) => a.id === focusAlert)?.detectionIds
    : co.selectedReview ? [co.selectedReview] : undefined;

  return (
    <div className="pos-main">
      <div className="pos-left">
        <div className="row wrap">
          <div className="seg" role="tablist" aria-label="Chế độ quầy">
            {(["VERIFY", "FAST"] as Mode[]).map((m) => (
              <button key={m} role="tab" aria-selected={co.mode === m} className={co.mode === m ? "on" : ""}
                disabled={co.lines.length > 0 && co.mode !== m} title={co.lines.length > 0 ? "Chỉ đổi chế độ khi giỏ trống" : undefined}
                onClick={() => { co.setMode(m); setFocusAlert(null); }}>
                {m === "VERIFY" ? "Kiểm tra chéo" : "Làn nhanh"}
              </button>
            ))}
          </div>
          <span className="small muted">{MODE_HINT[co.mode]}</span>
        </div>
        <StepBar mode={co.mode} step={co.step} />

        <div className="tray-wrap">
          {co.phase === "done" && (
            <div className="tray-tools">
              <button className="btn sm" onClick={() => setAllLabels(!allLabels)} aria-pressed={allLabels}>
                <Tags size={14} /> {allLabels ? "Ẩn tên món khớp" : "Hiện tên mọi món"}
              </button>
            </div>
          )}
          <TrayViewer
            src={co.phase === "done" ? co.tray.file : undefined}
            boxes={trayBoxes(co)}
            showLabels={allLabels ? "all" : "important"}
            focus={focus}
            selected={co.selectedReview}
            onSelect={co.mode === "FAST"
              ? (id) => { co.setSelectedReview(id); focusInput(); }
              : (id) => setFocusAlert(co.result?.alerts.find((x) => x.detectionIds.includes(id))?.id ?? null)}
            placeholder={
              co.phase === "loading" ? <span className="row"><Loader2 className="spin" /> Đang chụp và nhận diện…</span> :
              co.phase === "error" ? <span className="col" style={{ alignItems: "center", color: "#fecaca" }}><XCircle size={36} />Không lấy được ảnh từ camera ({co.failures} lần)</span> :
              <span className="col" style={{ alignItems: "center", gap: 6 }}><Camera size={36} />
                {co.mode === "VERIFY" ? "Quét mã xong, bấm Kiểm tra khay" : "Khách đặt cả khay, bấm Nhận diện khay"}</span>
            }
          />
        </div>

        <div className="row">
          <button className="btn primary lg" style={{ flex: 1 }} onClick={() => { setFocusAlert(null); co.capture(); focusInput(); }}
            disabled={co.phase === "loading" || (co.mode === "VERIFY" ? co.lines.length === 0 : co.phase === "done")}>
            <ScanLine size={20} />
            {co.mode === "FAST" ? "Nhận diện khay" : co.phase === "done" ? "Kiểm tra lại khay" : "Kiểm tra khay"}
          </button>
          {co.phase === "error" && co.failures >= 2 && !co.skipped && (
            <button className="btn lg" onClick={askSkip}>Bỏ qua kiểm tra (cần QL)</button>
          )}
        </div>

        <DeviceSimulator co={co} />
      </div>

      <div className="pos-right">
        <div className="card" style={{ padding: 12 }}>
          <label className="field">
            <span className="row"><ScanBarcode size={16} /> Mã vạch{co.mode === "FAST" && co.selectedReview ? " — đang xác nhận món đã chọn trên ảnh" : ""}</span>
            <input ref={inputRef} className="scan-input" value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={onKey}
              placeholder="Quét hoặc gõ mã rồi nhấn Enter" autoFocus />
          </label>
          {co.scanError && <div className="small" role="alert" style={{ color: "var(--danger)", marginTop: 6 }}>{co.scanError}</div>}
        </div>

        <ReviewList co={co} onPick={focusInput} />
        <AlertList co={co} focus={focusAlert} onFocus={setFocusAlert} onScanMore={focusInput} onAskManager={askManagerForAlert} />
        <CartPanel co={co} onRemove={askRemoveLine} onCancel={askCancel} onPay={() => setPaying(true)} />
      </div>

      {pin && (
        <ManagerPinDialog title={pin.title} summary={pin.summary} reasons={pin.reasons} onClose={() => setPin(null)}
          onConfirm={(reason, manager) => { pin.run(reason, manager); setPin(null); focusInput(); }} />
      )}
      {paying && (
        <PaymentDialog lines={co.lines} alertCount={Object.keys(co.raised).length} onPaid={co.pay}
          onClose={() => setPaying(false)} onNew={() => { newCheckout(); co.nextTray(); }} />
      )}
    </div>
  );
}
