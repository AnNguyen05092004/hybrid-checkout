import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../../app/store";
import { Badge, Card, Empty, PageHeader, RESOLUTION_LABEL, REVIEW_LABEL, Stat } from "../../components/ui";
import { dateTime, money, pct } from "../../lib/format";
import { ALERT_LABEL, SEVERITY_LABEL, SEVERITY_TONE, type AlertType, type Severity } from "../../lib/reconcile";
import { sku } from "../../mocks/catalog";
import type { Resolution } from "../../mocks/seed";

/** M02 — Alerts and post-review (US14). */
export function AlertsPage() {
  const { transactions, user } = useStore();
  const navigate = useNavigate();
  const [type, setType] = useState<AlertType | "ALL">("ALL");
  const [severity, setSeverity] = useState<Severity | "ALL">("ALL");
  const [resolution, setResolution] = useState<Resolution | "ALL">("ALL");
  const [cashier, setCashier] = useState("ALL");

  const all = transactions.flatMap((t) => t.alerts.map((a) => ({ ...a, tx: t })));
  const rows = all.filter((a) =>
    (type === "ALL" || a.type === type) && (severity === "ALL" || a.severity === severity) &&
    (resolution === "ALL" || a.resolution === resolution) && (cashier === "ALL" || a.tx.cashier === cashier));
  const cashiers = [...new Set(transactions.map((t) => t.cashier))];
  const byCashier = cashiers.map((c) => {
    const mine = all.filter((a) => a.tx.cashier === c && a.severity !== "LOW");
    const conf = mine.filter((a) => a.resolution === "QUAN_LY_XAC_NHAN_BAO_NHAM").length;
    return { c, total: mine.length, conf, rate: mine.length ? (conf / mine.length) * 100 : 0 };
  });
  const avg = byCashier.reduce((s, x) => s + x.rate, 0) / Math.max(1, byCashier.length);

  return (
    <>
      <PageHeader title="Cảnh báo & Hậu kiểm" sub="Mọi cảnh báo phát sinh tại quầy và cách chúng được xử lý"
        actions={user?.role === "STORE_MANAGER" && <Link className="btn" to="/admin/audit">Nhật ký cửa hàng</Link>} />
      <div className="stats">
        <Stat label="Tổng cảnh báo" value={all.length} />
        <Stat label="Đã quét bổ sung" value={all.filter((a) => a.resolution === "DA_QUET_BO_SUNG").length} tone="ok" />
        <Stat label="QL xác nhận báo nhầm" value={all.filter((a) => a.resolution === "QUAN_LY_XAC_NHAN_BAO_NHAM").length} />
        <Stat label="Chờ hậu kiểm" value={all.filter((a) => a.resolution === "QUAN_LY_XAC_NHAN_BAO_NHAM" && !a.review).length} tone="warn" />
      </div>
      <Card bodyClass="" title={<div className="row wrap">
        <select className="select" value={type} onChange={(e) => setType(e.target.value as AlertType | "ALL")}>
          <option value="ALL">Mọi loại</option>
          {(Object.keys(ALERT_LABEL) as AlertType[]).map((k) => <option key={k} value={k}>{ALERT_LABEL[k]}</option>)}
        </select>
        <select className="select" value={severity} onChange={(e) => setSeverity(e.target.value as Severity | "ALL")}>
          <option value="ALL">Mọi mức</option>
          {(Object.keys(SEVERITY_LABEL) as Severity[]).map((k) => <option key={k} value={k}>Mức {SEVERITY_LABEL[k]}</option>)}
        </select>
        <select className="select" value={resolution} onChange={(e) => setResolution(e.target.value as Resolution | "ALL")}>
          <option value="ALL">Mọi cách xử lý</option>
          {(Object.keys(RESOLUTION_LABEL) as Resolution[]).map((k) => <option key={k} value={k}>{RESOLUTION_LABEL[k]}</option>)}
        </select>
        <select className="select" value={cashier} onChange={(e) => setCashier(e.target.value)}>
          <option value="ALL">Mọi thu ngân</option>
          {cashiers.map((c) => <option key={c}>{c}</option>)}
        </select>
        <span className="small muted">{rows.length} cảnh báo</span>
      </div>}>
        {rows.length === 0 ? <Empty title="Không có cảnh báo khớp bộ lọc" /> : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Thời gian</th><th>Quầy</th><th>Thu ngân</th><th>Loại</th><th>Mức</th><th>SKU</th><th className="num">Giá trị</th><th>Cách xử lý</th><th>Hậu kiểm</th></tr></thead>
            <tbody>{rows.slice(0, 80).map((a) => (
              <tr key={a.tx.id + a.id} className="clickable" onClick={() => navigate(`/transactions/${a.tx.id}`)}>
                <td>{dateTime(a.tx.at)}</td><td>{a.tx.counterId}</td><td>{a.tx.cashier}</td>
                <td>{ALERT_LABEL[a.type]}</td><td><Badge tone={SEVERITY_TONE[a.severity]}>{SEVERITY_LABEL[a.severity]}</Badge></td>
                <td>{sku((a.seenSku ?? a.scannedSku)!).name}{a.qty > 1 ? ` × ${a.qty}` : ""}</td>
                <td className="num">{a.value ? money(a.value) : "—"}</td>
                <td className="small">{RESOLUTION_LABEL[a.resolution]}{a.confirmedBy ? <div className="faint">{a.confirmedBy}</div> : null}</td>
                <td>{a.review ? <Badge tone={a.review === "NGHI_GIAN_LAN" ? "danger" : ""}>{REVIEW_LABEL[a.review]}</Badge> : a.resolution === "QUAN_LY_XAC_NHAN_BAO_NHAM" ? <Badge tone="warn">Chờ</Badge> : "—"}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </Card>
      {user?.role === "STORE_MANAGER" && (
        <Card title="Thống kê theo thu ngân" bodyClass="">
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Thu ngân</th><th className="num">Cảnh báo Cao/TB</th><th className="num">QL xác nhận báo nhầm</th><th className="num">Tỉ lệ</th><th /></tr></thead>
            <tbody>{byCashier.map((x) => (
              <tr key={x.c}><td>{x.c}</td><td className="num">{x.total}</td><td className="num">{x.conf}</td><td className="num">{pct(x.rate)}</td>
                <td>{x.rate > avg * 1.5 && x.total >= 3 ? <Badge tone="danger">Cao bất thường</Badge> : null}</td></tr>
            ))}</tbody>
          </table></div>
        </Card>
      )}
    </>
  );
}
