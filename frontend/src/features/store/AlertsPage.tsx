import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../../app/store";
import { Badge, Card, Empty, PageHeader, RESOLUTION_LABEL, REVIEW_LABEL, Stat, useShowMore } from "../../components/ui";
import { AUDIT_REASON_LABEL, byPriority, cashierStats, removalStats } from "../../lib/audit";
import { dateTime, money, num, pct } from "../../lib/format";
import { ALERT_LABEL, SEVERITY_LABEL, SEVERITY_TONE, type AlertType, type Severity } from "../../lib/reconcile";
import { sku } from "../../mocks/catalog";
import type { Resolution } from "../../mocks/seed";

/** M02 — Alerts and post-review (US14): what to review first, and which cashier stands out. */
export function AlertsPage() {
  const { transactions, user } = useStore();
  const navigate = useNavigate();
  const [type, setType] = useState<AlertType | "ALL">("ALL");
  const [severity, setSeverity] = useState<Severity | "ALL">("ALL");
  const [resolution, setResolution] = useState<Resolution | "ALL">("ALL");
  const [cashier, setCashier] = useState("ALL");
  const isManager = user?.role === "STORE_MANAGER";

  const all = transactions.flatMap((t) => t.alerts.map((a) => ({ ...a, tx: t })));
  const rows = all.filter((a) =>
    (type === "ALL" || a.type === type) && (severity === "ALL" || a.severity === severity) &&
    (resolution === "ALL" || a.resolution === resolution) && (cashier === "ALL" || a.tx.cashier === cashier));
  const cashiers = [...new Set(transactions.map((t) => t.cashier))];

  const serious = all.filter((a) => a.severity !== "LOW")
    .map((a) => ({ ...a, id: `${a.tx.id}-${a.id}`, cashier: a.tx.cashier, falseAlarm: a.resolution === "FALSE_ALARM" }));
  const stats = cashierStats(serious);
  const [shown, more] = useShowMore(rows);
  const anomalous = new Set(stats.cashiers.filter((c) => c.anomalous).map((c) => c.cashier));
  const removals = removalStats(transactions.map((t) => ({ cashier: t.cashier, removed: t.removed.length })));
  const removalOf = (cashier: string) => removals.cashiers.find((r) => r.cashier === cashier);
  const queue = byPriority(serious.filter((a) => a.falseAlarm && !a.review), anomalous);
  const urgent = queue.filter((a) => a.reasons.length > 0);

  return (
    <>
      <PageHeader title="Cảnh báo & Hậu kiểm" sub="Thu ngân tự xác nhận báo nhầm; quản lý xem lại sau, ưu tiên những cảnh báo đáng ngờ"
        actions={isManager && <Link className="btn" to="/admin/audit">Nhật ký cửa hàng</Link>} />
      <div className="stats">
        <Stat label="Tổng cảnh báo" value={all.length} />
        <Stat label="Đã quét bổ sung" value={all.filter((a) => a.resolution === "SCANNED").length} tone="ok" />
        <Stat label="Thu ngân báo nhầm" value={all.filter((a) => a.resolution === "FALSE_ALARM").length} hint={`tỉ lệ cửa hàng ${pct(stats.store * 100)}`} />
        <Stat label="Chờ hậu kiểm" value={queue.length} hint={`${urgent.length} cần xem trước`} tone="warn" />
      </div>

      {isManager && (
        <Card title="Cần hậu kiểm trước" bodyClass="">
          {urgent.length === 0 ? <Empty title="Không có báo nhầm nào đáng ngờ" /> : (
            <div className="table-wrap"><table className="table">
              <thead><tr><th>Thời gian</th><th>Thu ngân</th><th>Loại</th><th>SKU</th><th className="num">Giá trị</th><th>Lý do thu ngân</th><th>Vì sao xem trước</th></tr></thead>
              <tbody>{urgent.slice(0, 8).map((a) => (
                <tr key={a.id} className="clickable" onClick={() => navigate(`/transactions/${a.tx.id}`)}>
                  <td>{dateTime(a.tx.at)}</td><td>{a.cashier}</td><td>{ALERT_LABEL[a.type]}</td>
                  <td>{sku((a.seenSku ?? a.scannedSku)!).name}</td><td className="num">{money(a.value)}</td>
                  <td className="small muted">{a.reason}</td>
                  <td><div className="row wrap" style={{ gap: 4 }}>{a.reasons.map((r) => <Badge key={r} tone={r === "RANDOM_SAMPLE" ? "" : "danger"}>{AUDIT_REASON_LABEL[r]}</Badge>)}</div></td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </Card>
      )}

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
            <tbody>{shown.map((a) => (
              <tr key={a.tx.id + a.id} className="clickable" onClick={() => navigate(`/transactions/${a.tx.id}`)}>
                <td>{dateTime(a.tx.at)}</td><td>{a.tx.counterId}</td><td>{a.tx.cashier}</td>
                <td>{ALERT_LABEL[a.type]}</td><td><Badge tone={SEVERITY_TONE[a.severity]}>{SEVERITY_LABEL[a.severity]}</Badge></td>
                <td>{sku((a.seenSku ?? a.scannedSku)!).name}{a.qty > 1 ? ` × ${a.qty}` : ""}</td>
                <td className="num">{a.value ? money(a.value) : "—"}</td>
                <td className="small">{RESOLUTION_LABEL[a.resolution]}</td>
                <td>{a.review ? <Badge tone={a.review === "SUSPECTED_FRAUD" ? "danger" : ""}>{REVIEW_LABEL[a.review]}</Badge> : a.resolution === "FALSE_ALARM" ? <Badge tone="warn">Chờ</Badge> : "—"}</td>
              </tr>
            ))}</tbody>
          </table>{more}</div>
        )}
      </Card>

      {isManager && (
        <Card title="Báo nhầm và xóa dòng theo thu ngân" bodyClass="">
          <p className="small muted" style={{ margin: "12px 16px 0" }}>
            Model sai thì mọi thu ngân đều gặp như nhau. Thu ngân có tỉ lệ báo nhầm ≥ 1,5 lần mức chung của cửa hàng ({pct(stats.store * 100)}) bị gắn cờ, và mọi báo nhầm của họ được đưa lên xem trước. Xóa dòng không cần PIN nên cũng được so như vậy: số dòng xóa trên mỗi giao dịch so với mức chung ({num(removals.store, 2)}).
          </p>
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Thu ngân</th><th className="num">Cảnh báo Cao/TB</th><th className="num">Báo nhầm</th><th className="num">Tỉ lệ</th><th className="num">Dòng đã xóa</th><th className="num">Xóa / GD</th><th /></tr></thead>
            <tbody>{stats.cashiers.map((x) => (
              <tr key={x.cashier}><td>{x.cashier}</td><td className="num">{x.alerts}</td><td className="num">{x.falseAlarms}</td><td className="num">{pct(x.rate * 100)}</td>
                <td className="num">{removalOf(x.cashier)?.removed ?? 0}</td><td className="num">{num(removalOf(x.cashier)?.rate ?? 0, 2)}</td>
                <td><span className="row">{x.anomalous && <Badge tone="danger">Báo nhầm bất thường</Badge>}{removalOf(x.cashier)?.anomalous && <Badge tone="danger">Xóa dòng bất thường</Badge>}</span></td></tr>
            ))}</tbody>
          </table></div>
        </Card>
      )}
    </>
  );
}
