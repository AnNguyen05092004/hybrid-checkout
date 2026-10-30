import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../../app/store";
import { Badge, BatchBadge, Card, DemoNote, Empty, PageHeader, Progress, Stat } from "../../components/ui";
import { StackedBars } from "../../components/charts";
import { dateTime, money, pct } from "../../lib/format";
import { ALERT_LABEL } from "../../lib/reconcile";
import { sku } from "../../mocks/catalog";
import { MODEL_VERSIONS } from "../../mocks/models";
import { AUDIT_REASON_LABEL, byPriority, cashierStats } from "../../lib/audit";

const RANGES = [{ days: 1, label: "Hôm nay" }, { days: 7, label: "7 ngày" }, { days: 30, label: "30 ngày" }];

/** M01 — Store dashboard (US13). */
export function DashboardPage() {
  const { transactions, skus, isLearned, batches, activeBatch, counters, versionCreatedAt } = useStore();
  const navigate = useNavigate();
  const [days, setDays] = useState(7);
  const [counter, setCounter] = useState("ALL");

  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));
  const txs = transactions.filter((t) => t.status === "DA_THANH_TOAN" && new Date(t.at) >= since && (counter === "ALL" || t.counterId === counter));
  const alerts = txs.flatMap((t) => t.alerts.map((a) => ({ ...a, tx: t })));
  const caught = alerts.filter((a) => a.resolution === "DA_QUET_BO_SUNG").reduce((s, a) => s + a.value, 0);
  const withAlert = txs.filter((t) => t.alerts.some((a) => a.severity !== "LOW")).length;
  const serious = alerts.filter((a) => a.severity !== "LOW")
    .map((a) => ({ ...a, id: `${a.tx.id}-${a.id}`, cashier: a.tx.cashier, falseAlarm: a.resolution === "BAO_NHAM" }));
  const falseConfirmed = serious.filter((a) => a.falseAlarm);
  const selling = skus.filter((s) => s.selling);
  const covered = selling.filter((s) => isLearned(s.id)).length;
  // Post-review queue in priority order, same as M02 (UC14).
  const anomalous = new Set(cashierStats(serious).cashiers.filter((c) => c.anomalous).map((c) => c.cashier));
  const pending = byPriority(falseConfirmed.filter((a) => !a.review), anomalous).slice(0, 5);
  const openBatch = batches.find((b) => b.status !== "DA_DEPLOY");
  const model = MODEL_VERSIONS.find((m) => m.batch === activeBatch)!;

  const dayLabels: string[] = [];
  const dayKeys: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dayKeys.push(d.toDateString());
    dayLabels.push(`${d.getDate()}/${d.getMonth() + 1}`);
  }
  const perDay = (type: string) => dayKeys.map((k) => transactions.flatMap((t) => (new Date(t.at).toDateString() === k ? t.alerts : [])).filter((a) => a.type === type).length);

  return (
    <>
      <PageHeader title="Dashboard cửa hàng" sub="Doanh thu, cảnh báo tại quầy và độ phủ nhận diện"
        actions={<>
          <div className="seg">{RANGES.map((r) => <button key={r.days} className={days === r.days ? "on" : ""} onClick={() => setDays(r.days)}>{r.label}</button>)}</div>
          <select className="select" value={counter} onChange={(e) => setCounter(e.target.value)}>
            <option value="ALL">Tất cả quầy</option>
            {counters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </>} />
      <DemoNote>Dữ liệu giao dịch trong prototype là dữ liệu giả lập, sinh từ ảnh khay mẫu và chạy qua đúng thuật toán đối chiếu.</DemoNote>
      <div className="stats">
        <Stat label="Doanh thu" value={money(txs.reduce((s, t) => s + t.total, 0))} hint={`${txs.length} giao dịch`} />
        <Stat label="Món chưa quét đã phát hiện" value={money(caught)} hint="giá trị được quét bổ sung" tone="ok" />
        <Stat label="Khay có cảnh báo" value={txs.length ? pct((withAlert / txs.length) * 100) : "—"} hint={`${withAlert} khay`} />
        <Stat label="Tỉ lệ báo nhầm" value={serious.length ? pct((falseConfirmed.length / serious.length) * 100) : "—"} hint="cảnh báo Cao/TB được xác nhận là báo nhầm" />
        <Stat label="Độ phủ SKU" value={pct((covered / selling.length) * 100)} hint={`${covered}/${selling.length} SKU camera nhận diện được`} />
      </div>
      <div className="grid" style={{ gridTemplateColumns: "2fr 1fr", alignItems: "start" }}>
        <Card title="Cảnh báo theo ngày (7 ngày gần nhất)">
          <StackedBars labels={dayLabels} series={[
            { name: ALERT_LABEL.MON_CHUA_QUET, color: "#dc2626", values: perDay("MON_CHUA_QUET") },
            { name: ALERT_LABEL.NGHI_TRAO_MA, color: "#f59e0b", values: perDay("NGHI_TRAO_MA") },
            { name: ALERT_LABEL.QUET_KHONG_THAY, color: "#94a3b8", values: perDay("QUET_KHONG_THAY") },
          ]} />
        </Card>
        <div className="col" style={{ gap: 16 }}>
          <Card title="Model đang chạy" actions={<Link to={`/models/v${activeBatch}`} className="small">Chi tiết</Link>}>
            <div className="col" style={{ gap: 6 }}>
              <span className="strong">{model.name}</span>
              <span className="small muted">Deploy {versionCreatedAt[model.id] ? dateTime(versionCreatedAt[model.id]) : "—"} · {model.skuCount} SKU</span>
            </div>
          </Card>
          <Card title="Đợt nhập đang xử lý">
            {openBatch ? (
              <div className="col" style={{ gap: 8 }}>
                <Link to={`/batches/${openBatch.id}`} className="strong">{openBatch.name}</Link>
                <BatchBadge status={openBatch.status} />
                <span className="small muted">{selling.length - covered} SKU đang bán chưa được camera kiểm tra</span>
                <Progress value={(covered / selling.length) * 100} />
              </div>
            ) : <span className="muted small">Không có đợt nào đang mở.</span>}
          </Card>
        </div>
      </div>
      <Card title="Cảnh báo chờ hậu kiểm" actions={<Link to="/alerts" className="small">Xem tất cả</Link>} bodyClass="">
        {pending.length === 0 ? <Empty title="Không có cảnh báo nào chờ hậu kiểm" /> : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Thời gian</th><th>Giao dịch</th><th>Loại</th><th>SKU</th><th>Thu ngân</th><th>Lý do thu ngân</th><th>Vì sao xem trước</th></tr></thead>
            <tbody>{pending.map((a) => (
              <tr key={a.id} className="clickable" onClick={() => navigate(`/transactions/${a.tx.id}`)}>
                <td>{dateTime(a.tx.at)}</td><td className="mono">{a.tx.id}</td><td><Badge tone="danger">{ALERT_LABEL[a.type]}</Badge></td>
                <td>{sku((a.seenSku ?? a.scannedSku)!).name}</td><td>{a.tx.cashier}</td><td className="small muted">{a.reason}</td>
                <td className="small">{a.reasons.map((r) => AUDIT_REASON_LABEL[r]).join(", ") || "—"}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </Card>
    </>
  );
}
