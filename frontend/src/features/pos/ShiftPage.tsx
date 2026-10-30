import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useStore } from "../../app/store";
import { Badge, Card, Empty, Modal, Stat } from "../../components/ui";
import { TrayViewer } from "../../components/TrayViewer";
import { money, time } from "../../lib/format";
import { ALERT_LABEL } from "../../lib/reconcile";
import { sku } from "../../mocks/catalog";
import type { Transaction } from "../../mocks/seed";
import { tray } from "../../mocks/trays";
import { RESOLUTION_LABEL } from "../../components/ui";

/** P06 — Shift history and closing (UC11, UC04). */
export function ShiftPage() {
  const { shift, transactions, user, closeShift, toast } = useStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState<Transaction | null>(null);
  const [closing, setClosing] = useState(false);
  const [cash, setCash] = useState(0);
  if (!shift) return null;
  const mine = transactions.filter((t) => t.cashier === user?.name && t.at >= shift.openedAt);
  const revenue = mine.reduce((s, t) => s + t.total, 0);
  const alerts = mine.flatMap((t) => t.alerts);
  const cashExpected = shift.openingCash + mine.filter((t) => t.payment === "CASH").reduce((s, t) => s + t.total, 0);

  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" }}>
      <div className="row">
        <button className="btn" onClick={() => navigate("/pos")}><ArrowLeft size={16} /> Về màn quầy</button>
        <h2>Lịch sử ca</h2>
        <span className="muted">mở lúc {time(shift.openedAt)}</span>
        <div className="spacer" />
        <button className="btn primary" onClick={() => { setCash(cashExpected); setClosing(true); }}>Đóng ca</button>
      </div>
      <div className="stats">
        <Stat label="Giao dịch" value={mine.length} />
        <Stat label="Doanh thu ca" value={money(revenue)} />
        <Stat label="Cảnh báo đã quét bổ sung" value={alerts.filter((a) => a.resolution === "DA_QUET_BO_SUNG").length} />
        <Stat label="Cảnh báo QL xác nhận báo nhầm" value={alerts.filter((a) => a.resolution === "QUAN_LY_XAC_NHAN_BAO_NHAM").length} />
      </div>
      <Card title="Giao dịch trong ca" bodyClass="">
        {mine.length === 0 ? <Empty title="Chưa có giao dịch nào trong ca này" /> : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Mã</th><th>Giờ</th><th>Chế độ</th><th className="num">Số món</th><th className="num">Tổng</th><th>Cảnh báo</th><th>Trạng thái</th></tr></thead>
            <tbody>{mine.map((t) => (
              <tr key={t.id} className="clickable" onClick={() => setOpen(t)}>
                <td className="mono">{t.id}</td><td>{time(t.at)}</td><td>{t.mode === "VERIFY" ? "Kiểm tra chéo" : "Làn nhanh"}</td>
                <td className="num">{t.lines.reduce((s, l) => s + l.qty, 0)}</td><td className="num">{money(t.total)}</td>
                <td>{t.alerts.length ? <Badge tone="warn">{t.alerts.length}</Badge> : "—"}</td><td><Badge tone="ok">Đã thanh toán</Badge></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </Card>

      {open && (
        <Modal title={`Giao dịch ${open.id}`} onClose={() => setOpen(null)} width={760}>
          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <TrayViewer src={tray(open.trayId).file} boxes={[]} />
            <div className="col">
              {open.lines.map((l) => <div key={l.skuId} className="row small"><span>{sku(l.skuId).name} × {l.qty}</span><span className="spacer" /><span>{money(l.qty * l.price)}</span></div>)}
              <div className="row strong"><span>Tổng</span><span className="spacer" /><span>{money(open.total)}</span></div>
              {open.alerts.map((a) => <div key={a.id} className="small"><Badge tone="warn">{ALERT_LABEL[a.type]}</Badge> {RESOLUTION_LABEL[a.resolution]}</div>)}
            </div>
          </div>
        </Modal>
      )}
      {closing && (
        <Modal title="Đóng ca" onClose={() => setClosing(false)} footer={<>
          <button className="btn" onClick={() => setClosing(false)}>Quay lại</button>
          <button className="btn primary" onClick={() => { closeShift(); toast("Đã đóng ca."); navigate("/pos/open-shift"); }}>Xác nhận đóng ca</button>
        </>}>
          <div className="row"><span className="muted">Tiền mặt theo hệ thống</span><span className="spacer" /><b>{money(cashExpected)}</b></div>
          <label className="field"><span>Tiền mặt thực đếm</span>
            <input className="input" value={cash.toLocaleString("vi-VN")} onChange={(e) => setCash(Number(e.target.value.replace(/\D/g, "")))} />
          </label>
          <div className="row"><span className="muted">Chênh lệch</span><span className="spacer" /><b style={{ color: cash === cashExpected ? "var(--ok)" : "var(--danger)" }}>{money(cash - cashExpected)}</b></div>
        </Modal>
      )}
    </div>
  );
}
