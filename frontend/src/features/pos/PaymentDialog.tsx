import { useState } from "react";
import { CheckCircle2, Printer } from "lucide-react";
import { Modal } from "../../components/ui";
import { money } from "../../lib/format";
import { sku } from "../../mocks/catalog";
import type { Transaction, TxLine } from "../../mocks/seed";

type Method = Transaction["payment"];
const METHOD_LABEL: Record<Method, string> = { CASH: "Tiền mặt", CARD: "Thẻ", TRANSFER: "Chuyển khoản" };

/** P05 — Payment and receipt (UC09). Payment itself is simulated. */
export function PaymentDialog({ lines, alertCount, onPaid, onNew, onClose }: {
  lines: TxLine[];
  alertCount: number;
  onPaid: (method: Method) => string;
  onNew: () => void;
  onClose: () => void;
}) {
  const total = lines.reduce((s, l) => s + l.qty * l.price, 0);
  const items = lines.reduce((s, l) => s + l.qty, 0);
  const [method, setMethod] = useState<Method>("CASH");
  const [given, setGiven] = useState(0);
  const [txId, setTxId] = useState<string | null>(null);
  const quick = [total, Math.ceil(total / 50000) * 50000, Math.ceil(total / 100000) * 100000, Math.ceil(total / 500000) * 500000]
    .filter((v, i, a) => a.indexOf(v) === i);

  if (txId) {
    return (
      <Modal title="Hóa đơn" onClose={onNew} width={440} footer={<>
        <button className="btn"><Printer size={16} /> In hóa đơn</button>
        <button className="btn primary" onClick={onNew}>Giao dịch mới</button>
      </>}>
        <div className="row" style={{ color: "var(--ok)" }}><CheckCircle2 size={22} /><span className="strong">Thanh toán thành công · {txId}</span></div>
        <div className="card" style={{ boxShadow: "none" }}>
          {lines.map((l) => (
            <div key={l.skuId} className="line">
              <span>{sku(l.skuId).name}<div className="small faint">{l.qty} × {money(l.price)}</div></span>
              <span />
              <span className="num">{money(l.qty * l.price)}</span>
            </div>
          ))}
          <div className="line"><span className="strong">Tổng</span><span /><span className="num strong">{money(total)}</span></div>
          {method === "CASH" && <div className="line"><span className="muted">Tiền thối</span><span /><span className="num">{money(given - total)}</span></div>}
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Thanh toán" onClose={onClose} width={480} footer={<>
      <button className="btn" onClick={onClose}>Quay lại</button>
      <button className="btn primary lg" disabled={method === "CASH" && given < total} onClick={() => setTxId(onPaid(method))}>Xác nhận thanh toán</button>
    </>}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <span className="muted">{items} món · {alertCount} cảnh báo đã xử lý</span>
        <span className="total">{money(total)}</span>
      </div>
      <div className="seg" role="tablist">
        {(Object.keys(METHOD_LABEL) as Method[]).map((m) => (
          <button key={m} className={method === m ? "on" : ""} onClick={() => setMethod(m)}>{METHOD_LABEL[m]}</button>
        ))}
      </div>
      {method === "CASH" ? (
        <>
          <label className="field"><span>Tiền khách đưa</span>
            <input className="input" style={{ height: 48, fontSize: 18 }} inputMode="numeric" value={given ? given.toLocaleString("vi-VN") : ""}
              onChange={(e) => setGiven(Number(e.target.value.replace(/\D/g, "")))} autoFocus />
          </label>
          <div className="row wrap">{quick.map((v) => <button key={v} className="btn" onClick={() => setGiven(v)}>{money(v)}</button>)}</div>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span className="muted">Tiền thối</span>
            <span className="strong" style={{ color: given < total ? "var(--danger)" : undefined }}>{given >= total ? money(given - total) : "Chưa đủ tiền"}</span>
          </div>
        </>
      ) : (
        <p className="muted">Giả lập: {METHOD_LABEL[method].toLowerCase()} được coi là thành công khi bấm xác nhận.</p>
      )}
    </Modal>
  );
}
