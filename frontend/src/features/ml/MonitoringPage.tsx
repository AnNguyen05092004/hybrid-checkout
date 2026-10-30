import { Link } from "react-router-dom";
import { Lightbulb } from "lucide-react";
import { useStore } from "../../app/store";
import { Card, DemoNote, PageHeader, Stat } from "../../components/ui";
import { Lines } from "../../components/charts";
import { hash01, pct } from "../../lib/format";
import { sku } from "../../mocks/catalog";
import { CONFUSED_PAIRS } from "../../mocks/models";

/** L07 — Model monitoring in the store (US24). */
export function MonitoringPage() {
  const { transactions, user, toast } = useStore();
  const days: { key: string; label: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({ key: d.toDateString(), label: `${d.getDate()}/${d.getMonth() + 1}` });
  }
  const per = days.map(({ key }) => {
    const txs = transactions.filter((t) => new Date(t.at).toDateString() === key);
    const serious = txs.flatMap((t) => t.alerts.filter((a) => a.severity !== "LOW"));
    return {
      alertRate: txs.length ? (txs.filter((t) => t.alerts.some((a) => a.severity !== "LOW")).length / txs.length) * 100 : 0,
      falseRate: serious.length ? (serious.filter((a) => a.resolution === "BAO_NHAM").length / serious.length) * 100 : 0,
      latency: 1.1 + hash01(key) * 0.6,
      corrections: txs.reduce((s, t) => s + t.corrections, 0),
    };
  });
  const last = per[per.length - 1];
  // False alarms from the counters, grouped by what the model saw: recurring ones point at the model, not the cashier.
  const byPair = new Map<string, { seen: number; scanned?: number; count: number }>();
  transactions.flatMap((t) => t.alerts).filter((a) => a.resolution === "BAO_NHAM" && a.seenSku).forEach((a) => {
    const key = `${a.seenSku}-${a.scannedSku ?? ""}`;
    const row = byPair.get(key) ?? { seen: a.seenSku!, scanned: a.scannedSku, count: 0 };
    byPair.set(key, { ...row, count: row.count + 1 });
  });
  const falsePairs = [...byPair.values()].sort((a, b) => b.count - a.count).slice(0, 5);
  const fast = transactions.filter((t) => t.mode === "FAST");
  const fastItems = fast.flatMap((t) => t.lines);
  const autoShare = fastItems.length ? (fastItems.filter((l) => l.source === "CAMERA").reduce((s, l) => s + l.qty, 0) / fastItems.reduce((s, l) => s + l.qty, 0)) * 100 : 0;

  return (
    <>
      <PageHeader title="Giám sát model" sub="Chất lượng nhận diện ngoài thực tế, từ cảnh báo, hậu kiểm và bản sửa ở làn nhanh" />
      <DemoNote>Độ trễ là số giả lập. Các tỉ lệ khác tính từ giao dịch giả lập của prototype.</DemoNote>
      <div className="stats">
        <Stat label="Độ trễ nhận diện trung vị" value={`${last.latency.toFixed(2).replace(".", ",")} giây`} hint="mục tiêu ≤ 3 giây (G5)" />
        <Stat label="Khay có cảnh báo (hôm nay)" value={pct(last.alertRate)} />
        <Stat label="Báo nhầm (hôm nay)" value={pct(last.falseRate)} hint="mục tiêu ≤ 10% (G2)" />
        <Stat label="Món tự nhận ở làn nhanh" value={pct(autoShare)} hint="mục tiêu ≥ 70% (G4)" />
      </div>
      <div className="grid" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", alignItems: "start" }}>
        <Card title="Tỉ lệ cảnh báo và báo nhầm theo ngày">
          <Lines labels={days.map((d) => d.label)} min={0} max={100} series={[
            { name: "Khay có cảnh báo", color: "#dc2626", values: per.map((p) => p.alertRate) },
            { name: "Báo nhầm", color: "#64748b", values: per.map((p) => p.falseRate) },
          ]} />
        </Card>
        <Card title="Cặp SKU hay nhầm" bodyClass="">
          <div className="table-wrap"><table className="table">
            <thead><tr><th>SKU thật</th><th>Bị nhận thành</th><th className="num">Số lần</th></tr></thead>
            <tbody>{CONFUSED_PAIRS.map((p) => (
              <tr key={`${p.from}-${p.to}`}><td><Link to={`/skus/${p.from}`}>{sku(p.from).name}</Link></td><td><Link to={`/skus/${p.to}`}>{sku(p.to).name}</Link></td><td className="num">{p.count}</td></tr>
            ))}</tbody>
          </table></div>
        </Card>
      </div>
      <Card title="Báo nhầm tại quầy theo SKU" bodyClass="">
        {falsePairs.length === 0 ? <p className="small muted" style={{ margin: 16 }}>Chưa có báo nhầm nào.</p> : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Model thấy</th><th>Thu ngân đã quét</th><th className="num">Số lần báo nhầm</th><th /></tr></thead>
            <tbody>{falsePairs.map((p) => (
              <tr key={`${p.seen}-${p.scanned}`}>
                <td><Link to={`/skus/${p.seen}`}>{sku(p.seen).name}</Link></td>
                <td>{p.scanned ? <Link to={`/skus/${p.scanned}`}>{sku(p.scanned).name}</Link> : "—"}</td>
                <td className="num">{p.count}</td>
                <td>{user?.role === "ML_ENGINEER" && <button className="btn sm" onClick={() => toast(`Đã đưa ${p.count} ảnh khay vào hàng đợi ảnh khó của đợt tới.`)}>Vào hàng đợi ảnh khó</button>}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </Card>
      {user?.role === "ML_ENGINEER" && (
        <Card title="Gợi ý hành động">
          <div className="col" style={{ gap: 8 }}>
            {CONFUSED_PAIRS.slice(0, 2).map((p) => (
              <div key={p.from} className="row small"><Lightbulb size={16} color="var(--warn)" />
                <span><b>{sku(p.from).name}</b> hay bị nhận thành <b>{sku(p.to).name}</b>: gửi ảnh khay có cả hai SKU vào hàng đợi ảnh khó của đợt sau, và cân nhắc hạ mức cảnh báo tráo mã của cặp này xuống Trung bình.</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}
