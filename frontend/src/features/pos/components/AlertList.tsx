import { AlertOctagon, CheckCircle2, ScanBarcode } from "lucide-react";
import { Badge } from "../../../components/ui";
import { money } from "../../../lib/format";
import { ALERT_LABEL, SEVERITY_LABEL, SEVERITY_TONE, type TrayAlert } from "../../../lib/reconcile";
import { sku } from "../../../mocks/catalog";
import type { Checkout } from "../useCheckout";

/** Reconciliation result: one card per alert, one main action per card (Quét bổ sung). */
export function AlertList({ co, focus, onFocus, onScanMore, onFalseAlarm }: {
  co: Checkout;
  focus: string | null;
  onFocus: (id: string | null) => void;
  onScanMore: () => void;
  onFalseAlarm: (a: TrayAlert) => void;
}) {
  const { result, skipped, openAlerts, blocking } = co;
  if (!result && !skipped) return null;

  return (
    <div className="card">
      <div className="card-h">
        <h3>Kết quả đối chiếu</h3><div className="spacer" />
        {skipped ? <Badge tone="warn">Không kiểm tra</Badge>
          : openAlerts.length === 0 ? <Badge tone="ok"><CheckCircle2 size={12} /> Khớp</Badge>
          : <Badge tone={blocking.length ? "danger" : "warn"}>{openAlerts.length} cảnh báo</Badge>}
      </div>
      <div className="col" style={{ padding: 12, gap: 8, maxHeight: 280, overflowY: "auto" }}>
        {skipped && <span className="small muted">Quản lý đã cho bỏ qua kiểm tra khay do camera lỗi.</span>}
        {result && result.absorbed.size > 0 && (
          <span className="small muted">{result.absorbed.size} món camera chưa nhận ra, khớp với hàng mới đã quét: không cảnh báo.</span>
        )}
        {result && openAlerts.length === 0 && !skipped && <span className="small muted">Danh sách quét khớp với khay.</span>}
        {openAlerts.map((a) => (
          <div key={a.id} className={`alert-card ${a.severity.toLowerCase()} ${focus === a.id ? "on" : ""}`} onClick={() => onFocus(focus === a.id ? null : a.id)}>
            <div className="row">
              <AlertOctagon size={16} color={a.severity === "HIGH" ? "var(--danger)" : "var(--warn)"} />
              <span className="strong">{ALERT_LABEL[a.type]}</span>
              <Badge tone={SEVERITY_TONE[a.severity]}>Mức {SEVERITY_LABEL[a.severity]}</Badge>
              <span className="spacer" />
              {a.value > 0 && <span className="strong">{money(a.value)}</span>}
            </div>
            <div className="small">
              {a.type === "MON_CHUA_QUET" && <>Camera thấy <b>{a.qty} × {sku(a.seenSku!).name}</b> nhưng chưa quét.</>}
              {a.type === "NGHI_TRAO_MA" && <>Đã quét <b>{sku(a.scannedSku!).name}</b> ({money(sku(a.scannedSku!).price)}) nhưng camera thấy <b>{sku(a.seenSku!).name}</b> ({money(sku(a.seenSku!).price)}).</>}
              {a.type === "QUET_KHONG_THAY" && <>Đã quét {a.qty} × {sku(a.scannedSku!).name} nhưng camera không thấy (có thể đã cho vào túi).</>}
            </div>
            <div className="row" onClick={(e) => e.stopPropagation()}>
              {a.severity !== "LOW" ? (
                <>
                  <button className="btn sm primary" onClick={onScanMore}><ScanBarcode size={14} /> Quét bổ sung</button>
                  <button className="btn sm" onClick={() => onFalseAlarm(a)}>Camera báo nhầm</button>
                </>
              ) : (
                <button className="btn sm" onClick={() => co.dismiss(a.id, { reason: "Thu ngân bỏ qua cảnh báo mức thấp" })}>Bỏ qua</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
