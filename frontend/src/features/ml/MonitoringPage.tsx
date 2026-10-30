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
  const { transactions, user } = useStore();
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
      falseRate: serious.length ? (serious.filter((a) => a.resolution === "QUAN_LY_XAC_NHAN_BAO_NHAM").length / serious.length) * 100 : 0,
      latency: 1.1 + hash01(key) * 0.6,
      corrections: txs.reduce((s, t) => s + t.corrections, 0),
    };
  });
  const last = per[per.length - 1];
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
        <Stat label="QL xác nhận báo nhầm (hôm nay)" value={pct(last.falseRate)} />
        <Stat label="Món tự nhận ở làn nhanh" value={pct(autoShare)} hint="mục tiêu ≥ 70% (G4)" />
      </div>
      <div className="grid" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", alignItems: "start" }}>
        <Card title="Tỉ lệ cảnh báo và báo nhầm theo ngày">
          <Lines labels={days.map((d) => d.label)} min={0} max={100} series={[
            { name: "Khay có cảnh báo", color: "#dc2626", values: per.map((p) => p.alertRate) },
            { name: "QL xác nhận báo nhầm", color: "#64748b", values: per.map((p) => p.falseRate) },
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
