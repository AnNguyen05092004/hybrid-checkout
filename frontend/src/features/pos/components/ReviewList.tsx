import { CheckCircle2, CircleHelp } from "lucide-react";
import { Badge } from "../../../components/ui";
import { sku } from "../../../mocks/catalog";
import type { Checkout } from "../useCheckout";

/** Fast lane: items the cashier must confirm with a scan (UC06 step 3-4). */
export function ReviewList({ co, onPick }: { co: Checkout; onPick: () => void }) {
  const { mode, phase, reviews, pendingReviews, selectedReview, setSelectedReview, outsideDone, setOutsideDone } = co;
  if (mode !== "FAST" || phase !== "done") return null;

  return (
    <div className="card">
      <div className="card-h">
        <h3>Cần quét xác nhận</h3><div className="spacer" />
        <Badge tone={pendingReviews.length ? "warn" : "ok"}>{reviews.length - pendingReviews.length}/{reviews.length} đã xử lý</Badge>
      </div>
      <div className="col" style={{ padding: 12, gap: 6 }}>
        {reviews.length === 0 && <span className="small muted">Không có món nào cần xác nhận.</span>}
        {reviews.map((r, i) => (
          <button key={r.det.id} className={`alert-card medium ${selectedReview === r.det.id ? "on" : ""}`} style={{ textAlign: "left" }}
            disabled={r.resolved !== null} onClick={() => { setSelectedReview(r.det.id); onPick(); }}>
            <span className="row">
              <b>{i + 1}.</b>
              {r.resolved !== null
                ? <><CheckCircle2 size={16} color="var(--ok)" /> {sku(r.resolved).name}</>
                : <>Có thể là <b>{sku(r.det.skuId).name}</b> <span className="faint small">độ tin {r.det.score.toFixed(2)}</span></>}
            </span>
          </button>
        ))}
        <div className="small muted row"><CircleHelp size={14} /> Quét cả các món <b>không có khung</b> trên ảnh (thường là hàng mới).</div>
        <label className="row small" style={{ cursor: "pointer" }}>
          <input type="checkbox" checked={outsideDone} disabled={pendingReviews.length > 0} onChange={(e) => setOutsideDone(e.target.checked)} />
          Đã quét hết món ngoài vùng nhận diện
        </label>
      </div>
    </div>
  );
}
