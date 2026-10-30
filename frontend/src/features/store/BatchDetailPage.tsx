import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Check, Circle, Images, Tag } from "lucide-react";
import { useStore } from "../../app/store";
import { MIN_CUTOUTS, MIN_VAL_BOXES, MIN_VAL_IMAGES } from "../../app/rules";
import { BATCH_STEPS, Badge, BatchBadge, Card, Empty, JobBadge, PageHeader, Progress, Stat, VersionBadge } from "../../components/ui";
import { date, dateTime } from "../../lib/format";
import { cutoutsOf } from "../../mocks/cutouts";

function Meter({ n, target }: { n: number; target: number }) {
  return (
    <div className="row">
      <div style={{ flex: 1 }}><Progress value={(n / target) * 100} tone={n >= target ? "ok" : "warn"} /></div>
      <span className="small num" style={{ width: 48 }}>{n >= target ? `${n} ✓` : `${n}/${target}`}</span>
    </div>
  );
}

function Condition({ ok, children }: { ok: boolean; children: string }) {
  return (
    <div className="row small" style={{ color: ok ? "var(--ok)" : "var(--text-2)" }}>
      {ok ? <Check size={14} /> : <Circle size={14} />}{children}
    </div>
  );
}

/** M08 — Batch detail: pipeline, data progress per SKU, send to training (US16, US19). */
export function BatchDetailPage() {
  const { id } = useParams();
  const {
    batches, skus, approved, valImages, labelQueue, labeledTrays, jobs, user, startTraining, versionStatus,
    cutoutState, composites,
  } = useStore();
  const navigate = useNavigate();
  const [mixReal, setMixReal] = useState(false);
  const b = batches.find((x) => x.id === Number(id));
  if (!b) return <Empty title="Không tìm thấy đợt nhập"><Link to="/batches">Về danh sách</Link></Empty>;

  // Batch 5 is live in the prototype; earlier batches show their final numbers.
  const isCurrent = b.id === 5;
  const finished = b.status !== "NHAP" && b.status !== "THU_THAP";
  const rows = skus.filter((s) => s.task === b.id).map((s) => ({
    s,
    cutouts: isCurrent ? cutoutsOf(s.id).filter((c) => cutoutState[c.id] === "accepted").length : finished ? 9 + (s.id % 4) : 0,
    boxes: isCurrent ? approved[s.id] ?? 0 : finished ? 20 + (s.id % 15) : 0,
  }));
  const val = isCurrent ? valImages : finished ? 60 + b.id * 3 : 0;
  const compositeCount = isCurrent ? composites.count : finished ? 14328 : 0;

  const cutoutsOk = rows.length > 0 && rows.every((r) => r.cutouts >= MIN_CUTOUTS);
  const compositesOk = compositeCount > 0;
  const valOk = val >= MIN_VAL_IMAGES && rows.length > 0 && rows.every((r) => r.boxes >= MIN_VAL_BOXES);
  const ready = cutoutsOk && compositesOk && valOk;
  const surplus = Math.max(0, val - MIN_VAL_IMAGES);

  const stepIndex = BATCH_STEPS.findIndex((s) => s.status === b.status);
  const job = jobs.find((j) => j.batch === b.id);
  const isML = user?.role === "ML_ENGINEER";
  const collecting = isCurrent && b.status === "THU_THAP";
  const vid = `v${b.id}`;
  const remaining = labelQueue.length - labeledTrays.length;

  return (
    <>
      <PageHeader title={`Đợt ${b.id}: ${b.name}`} sub={`Tạo ${date(b.createdAt)} bởi ${b.createdBy}`} actions={<BatchBadge status={b.status} />} />
      <Card>
        <div className="steps">
          {BATCH_STEPS.map((s, i) => (
            <div key={s.status} className={`step ${i < stepIndex || b.status === "DA_DEPLOY" ? "done" : i === stepIndex ? "cur" : ""}`}>
              <span className="dotc">{i < stepIndex || b.status === "DA_DEPLOY" ? <Check size={16} /> : i + 1}</span>
              <span className="small strong">{s.label}</span>
            </div>
          ))}
        </div>
      </Card>
      <div className="stats">
        <Stat label="SKU trong đợt" value={rows.length} />
        <Stat label="SKU đủ ảnh mẫu" value={`${rows.filter((r) => r.cutouts >= MIN_CUTOUTS).length}/${rows.length}`} hint={`≥ ${MIN_CUTOUTS} ảnh cắt đã nhận / SKU`} />
        <Stat label="Ảnh ghép (huấn luyện)" value={compositeCount ? compositeCount.toLocaleString("vi-VN") : "Chưa tạo"} />
        <Stat label="Tập kiểm tra ảnh thật" value={`${val} ảnh`} hint={`mục tiêu ≥ ${MIN_VAL_IMAGES} ảnh, ≥ ${MIN_VAL_BOXES} box / SKU`} />
      </div>
      <div className="grid" style={{ gridTemplateColumns: "2fr 1fr", alignItems: "start" }}>
        <Card title="Tiến độ dữ liệu theo SKU" bodyClass="">
          {rows.length === 0 ? <Empty title="Đợt chưa có SKU" /> : (
            <div className="table-wrap"><table className="table">
              <thead><tr><th>SKU</th><th>Mã vạch</th><th style={{ width: "26%" }}>Ảnh mẫu đã nhận</th><th style={{ width: "26%" }}>Box trong tập kiểm tra</th><th /></tr></thead>
              <tbody>{rows.map(({ s, cutouts, boxes }) => (
                <tr key={s.id}>
                  <td><Link to={`/skus/${s.id}`}>{s.name}</Link></td><td className="mono">{s.barcode}</td>
                  <td><Meter n={cutouts} target={MIN_CUTOUTS} /></td>
                  <td><Meter n={boxes} target={MIN_VAL_BOXES} /></td>
                  <td>{cutouts >= MIN_CUTOUTS && boxes >= MIN_VAL_BOXES ? <Badge tone="ok">Đủ</Badge> : <Badge tone="warn">Thiếu</Badge>}</td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </Card>
        <div className="col" style={{ gap: 16 }}>
          {collecting && (
            <Card title="1. Ảnh mẫu → ảnh ghép">
              <div className="col" style={{ gap: 10 }}>
                <p className="small muted">Chụp từng SKU mới, hệ thống cắt nền và ghép thành ảnh khay có sẵn box. Dùng để huấn luyện.</p>
                <Condition ok={cutoutsOk}>Mọi SKU đủ ảnh mẫu</Condition>
                <Condition ok={compositesOk}>Đã tạo ảnh ghép</Condition>
                <button className="btn" onClick={() => navigate(`/batches/${b.id}/samples`)}><Images size={16} /> Mở ảnh mẫu</button>
              </div>
            </Card>
          )}
          {collecting && (
            <Card title="2. Ảnh thật → tập kiểm tra">
              <div className="col" style={{ gap: 10 }}>
                <p className="small muted">Ảnh khay từ giao dịch có quét mã hàng mới và ảnh khó gửi từ quầy. Model đề xuất box hàng cũ, người chỉ vẽ hàng mới. Dùng để duyệt model.</p>
                <div className="small">Đã gán {labeledTrays.length}/{labelQueue.length} ảnh trong hàng đợi</div>
                <Progress value={(labeledTrays.length / labelQueue.length) * 100} />
                <Condition ok={valOk}>{`Tập kiểm tra ≥ ${MIN_VAL_IMAGES} ảnh, mỗi SKU ≥ ${MIN_VAL_BOXES} box`}</Condition>
                {isML
                  ? <button className="btn" disabled={remaining <= 0} onClick={() => navigate(`/batches/${b.id}/label`)}><Tag size={16} /> {remaining > 0 ? "Gán nhãn ảnh thật" : "Đã gán hết hàng đợi"}</button>
                  : <span className="small faint">Kỹ sư ML thực hiện bước này.</span>}
              </div>
            </Card>
          )}
          {collecting && isML && (
            <Card title="Gửi huấn luyện">
              <div className="col" style={{ gap: 10 }}>
                <label className="row small" style={{ alignItems: "flex-start", color: surplus ? undefined : "var(--text-3)" }}>
                  <input type="checkbox" checked={mixReal} disabled={!surplus} onChange={(e) => setMixReal(e.target.checked)} />
                  <span>Trộn {surplus} ảnh thật vượt mức vào huấn luyện <span className="faint">(thí nghiệm, BR-16)</span></span>
                </label>
                <button className="btn primary" disabled={!ready} onClick={() => startTraining(b.id, mixReal ? surplus : 0)}>Gửi huấn luyện</button>
                {!ready && <span className="small" style={{ color: "var(--warn)" }}>Chưa đủ dữ liệu (BR-11).</span>}
              </div>
            </Card>
          )}
          <Card title="Job và phiên bản">
            {job ? (
              <div className="col" style={{ gap: 8 }}>
                <div className="row"><span className="mono">{job.id}</span><span className="spacer" /><JobBadge status={job.status} /></div>
                <Progress value={(job.epoch / job.epochs) * 100} />
                <span className="small muted">Epoch {job.epoch}/{job.epochs} · {job.gpuHours} giờ GPU · bắt đầu {dateTime(job.startedAt)}</span>
                {isML && <Link to="/jobs" className="small">Xem log</Link>}
                {versionStatus[vid] !== "CHUA_CO" && <div className="row"><Link to={`/models/${vid}`}>Phiên bản {vid}</Link><span className="spacer" /><VersionBadge status={versionStatus[vid]} /></div>}
              </div>
            ) : <span className="small muted">Chưa có job.</span>}
          </Card>
        </div>
      </div>
    </>
  );
}
