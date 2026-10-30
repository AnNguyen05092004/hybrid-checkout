import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useStore } from "../../app/store";
import { Badge, Card, Empty, PageHeader, RESOLUTION_LABEL, REVIEW_LABEL } from "../../components/ui";
import { TrayViewer, type TrayBox } from "../../components/TrayViewer";
import { dateTime, money } from "../../lib/format";
import { ALERT_LABEL, SEVERITY_LABEL, SEVERITY_TONE } from "../../lib/reconcile";
import { sku } from "../../mocks/catalog";
import type { Review } from "../../mocks/seed";
import { detect, tray } from "../../mocks/trays";

/** M03 — Transaction detail with reconciliation and post-review (US14). */
export function TransactionDetailPage() {
  const { id } = useParams();
  const { transactions, updateTransaction, user, toast, log } = useStore();
  const tx = transactions.find((t) => t.id === id);
  const [focus, setFocus] = useState<string | null>(null);
  if (!tx) return <Empty title="Không tìm thấy giao dịch"><Link to="/transactions">Về danh sách</Link></Empty>;

  const t = tray(tx.trayId);
  const dets = detect(t, Number(tx.modelVersion.slice(1)));
  const alertDets = new Set(tx.alerts.flatMap((a) => a.detectionIds));
  const boxes: TrayBox[] = dets.filter((d) => d.score >= 0.5).map((d) => ({
    id: d.id, box: d.box, kind: alertDets.has(d.id) ? "alert" : "match",
    label: `${alertDets.has(d.id) ? "!" : "✓"} ${sku(d.skuId).name}`,
  }));
  const scanned = new Map<number, number>();
  tx.lines.forEach((l) => scanned.set(l.skuId, (scanned.get(l.skuId) ?? 0) + l.qty));
  const seen = new Map<number, number>();
  dets.filter((d) => d.score >= 0.5).forEach((d) => seen.set(d.skuId, (seen.get(d.skuId) ?? 0) + 1));
  const skuIds = [...new Set([...scanned.keys(), ...seen.keys()])];
  const canReview = user?.role === "STORE_MANAGER";

  const setReview = (alertId: string, review: Review) => {
    updateTransaction(tx.id, (x) => ({ ...x, alerts: x.alerts.map((a) => (a.id === alertId ? { ...a, review } : a)) }));
    log("REVIEW_ALERT", tx.id, REVIEW_LABEL[review]);
    toast("Đã lưu kết quả hậu kiểm.");
  };

  return (
    <>
      <PageHeader title={`Giao dịch ${tx.id}`} sub={`${dateTime(tx.at)} · ${tx.counterId} · ${tx.cashier} · ${tx.mode === "VERIFY" ? "Kiểm tra chéo" : "Làn nhanh"} · model ${tx.modelVersion}`}
        actions={<><Badge tone="ok">Đã thanh toán</Badge><span className="strong">{money(tx.total)}</span></>} />
      <div className="grid" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", alignItems: "start" }}>
        <Card title="Ảnh khay">
          <TrayViewer src={t.file} boxes={boxes} focus={focus ? tx.alerts.find((a) => a.id === focus)?.detectionIds : undefined} />
        </Card>
        <div className="col" style={{ gap: 16 }}>
          <Card title="Cảnh báo">
            {tx.alerts.length === 0 ? <span className="muted small">Giao dịch không có cảnh báo.</span> : (
              <div className="col">
                {tx.alerts.map((a) => (
                  <div key={a.id} className={`alert-card ${a.severity.toLowerCase()} ${focus === a.id ? "on" : ""}`} onClick={() => setFocus(focus === a.id ? null : a.id)}>
                    <div className="row"><span className="strong">{ALERT_LABEL[a.type]}</span><Badge tone={SEVERITY_TONE[a.severity]}>{SEVERITY_LABEL[a.severity]}</Badge><span className="spacer" />{a.value ? money(a.value) : ""}</div>
                    <div className="small">{sku((a.seenSku ?? a.scannedSku)!).name} × {a.qty} — {RESOLUTION_LABEL[a.resolution]}{a.resolution === "BAO_NHAM" ? ` (${tx.cashier})` : ""}</div>
                    {a.reason && <div className="small muted">Lý do: {a.reason}</div>}
                    {a.resolution === "BAO_NHAM" && (
                      <div className="row wrap" onClick={(e) => e.stopPropagation()}>
                        <span className="small muted">Hậu kiểm:</span>
                        {(Object.keys(REVIEW_LABEL) as Review[]).map((r) => (
                          <button key={r} className={`btn sm ${a.review === r ? "primary" : ""}`} disabled={!canReview} onClick={() => setReview(a.id, r)}>{REVIEW_LABEL[r]}</button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card title="Đối chiếu theo SKU" bodyClass="">
            <div className="table-wrap"><table className="table">
              <thead><tr><th>SKU</th><th className="num">Đã quét</th><th className="num">Camera thấy</th><th className="num">Chênh</th><th className="num">Thành tiền</th></tr></thead>
              <tbody>{skuIds.map((s) => {
                const diff = (seen.get(s) ?? 0) - (scanned.get(s) ?? 0);
                return (
                  <tr key={s}><td>{sku(s).name}</td><td className="num">{scanned.get(s) ?? 0}</td><td className="num">{seen.get(s) ?? 0}</td>
                    <td className="num" style={{ color: diff ? "var(--danger)" : undefined }}>{diff > 0 ? `+${diff}` : diff}</td>
                    <td className="num">{money((scanned.get(s) ?? 0) * sku(s).price)}</td></tr>
                );
              })}</tbody>
            </table></div>
          </Card>
          {(canReview || user?.role === "ML_ENGINEER") && <button className="btn" onClick={() => toast("Đã thêm ảnh khay vào hàng đợi ảnh khó. Kỹ sư ML gán nhãn ở đợt nhập tới.")}>Gửi vào hàng đợi ảnh khó</button>}
        </div>
      </div>
    </>
  );
}
