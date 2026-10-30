import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../../app/store";
import { Badge, Card, Empty, PageHeader } from "../../components/ui";
import { dateTime, money } from "../../lib/format";

/** M04 — Transactions. */
export function TransactionsPage() {
  const { transactions, counters } = useStore();
  const navigate = useNavigate();
  const [counter, setCounter] = useState("ALL");
  const [mode, setMode] = useState("ALL");
  const [onlyAlerts, setOnlyAlerts] = useState(false);
  const rows = transactions.filter((t) =>
    (counter === "ALL" || t.counterId === counter) && (mode === "ALL" || t.mode === mode) && (!onlyAlerts || t.alerts.some((a) => a.severity !== "LOW")));

  return (
    <>
      <PageHeader title="Giao dịch" sub={`${rows.length} giao dịch`} />
      <Card bodyClass="" title={<div className="row wrap">
        <select className="select" value={counter} onChange={(e) => setCounter(e.target.value)}>
          <option value="ALL">Tất cả quầy</option>{counters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="select" value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="ALL">Mọi chế độ</option><option value="VERIFY">Kiểm tra chéo</option><option value="FAST">Làn nhanh</option>
        </select>
        <label className="row small"><input type="checkbox" checked={onlyAlerts} onChange={(e) => setOnlyAlerts(e.target.checked)} /> Chỉ giao dịch có cảnh báo</label>
      </div>}>
        {rows.length === 0 ? <Empty title="Không có giao dịch khớp bộ lọc" /> : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Mã</th><th>Thời gian</th><th>Quầy</th><th>Thu ngân</th><th>Chế độ</th><th className="num">Số món</th><th className="num">Tổng</th><th>Cảnh báo</th><th>Model</th><th>Trạng thái</th></tr></thead>
            <tbody>{rows.map((t) => (
              <tr key={t.id} className="clickable" onClick={() => navigate(`/transactions/${t.id}`)}>
                <td className="mono">{t.id}</td><td>{dateTime(t.at)}</td><td>{t.counterId}</td><td>{t.cashier}</td>
                <td>{t.mode === "VERIFY" ? "Kiểm tra chéo" : "Làn nhanh"}</td><td className="num">{t.lines.reduce((s, l) => s + l.qty, 0)}</td>
                <td className="num">{money(t.total)}</td>
                <td>{t.alerts.filter((a) => a.severity !== "LOW").length ? <Badge tone="warn">{t.alerts.filter((a) => a.severity !== "LOW").length}</Badge> : "—"}</td>
                <td>{t.modelVersion}</td><td><Badge tone="ok">Đã thanh toán</Badge></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </Card>
    </>
  );
}
