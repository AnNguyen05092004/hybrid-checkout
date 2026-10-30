import { ScanBarcode, Trash2 } from "lucide-react";
import { Badge, Empty } from "../../../components/ui";
import { money } from "../../../lib/format";
import { sku } from "../../../mocks/catalog";
import type { TxLine } from "../../../mocks/seed";
import type { Checkout } from "../useCheckout";

/** Cart, total and the two final actions. Payment stays locked with its reason shown (BR-03). */
export function CartPanel({ co, onRemove, onCancel, onPay }: {
  co: Checkout;
  onRemove: (l: TxLine) => void;
  onCancel: () => void;
  onPay: () => void;
}) {
  const { lines, itemCount, total, payBlocker, isLearned } = co;

  return (
    <div className="card fill">
      <div className="card-h"><h3>Giỏ hàng</h3><div className="spacer" /><span className="muted small">{itemCount} món</span></div>
      <div className="pos-scroll">
        {lines.length === 0 ? <Empty icon={<ScanBarcode size={28} />} title="Chưa có món nào">Quét mã vạch để thêm món.</Empty> : lines.map((l) => (
          <div key={`${l.skuId}-${l.source}`} className="line">
            <span style={{ minWidth: 0 }}>
              <div className="strong">{sku(l.skuId).name}</div>
              <div className="row small faint wrap" style={{ gap: 6 }}>
                <span className="mono">{sku(l.skuId).barcode}</span>
                <Badge tone={l.source === "CAMERA" ? "primary" : ""}>{l.source === "CAMERA" ? "Camera" : "Mã vạch"}</Badge>
                {!isLearned(l.skuId) && <Badge tone="warn">Camera chưa nhận diện</Badge>}
              </div>
            </span>
            <span className="num small">{l.qty} × {money(l.price)}</span>
            <span className="row">
              <span className="num strong">{money(l.qty * l.price)}</span>
              <button className="btn ghost sm" aria-label={`Xóa ${sku(l.skuId).name}`} onClick={() => onRemove(l)}><Trash2 size={16} /></button>
            </span>
          </div>
        ))}
      </div>
      <div className="col" style={{ padding: 14, borderTop: "1px solid var(--border)" }}>
        <div className="row"><span className="muted">Tổng cộng</span><span className="spacer" /><span className="total">{money(total)}</span></div>
        {payBlocker && lines.length > 0 && <span className="small" style={{ color: "var(--warn)" }}>{payBlocker}</span>}
        <div className="row">
          <button className="btn lg" disabled={lines.length === 0} onClick={onCancel}>Hủy giao dịch</button>
          <button className="btn primary lg" style={{ flex: 1 }} disabled={!!payBlocker} onClick={onPay}>Thanh toán</button>
        </div>
      </div>
    </div>
  );
}
