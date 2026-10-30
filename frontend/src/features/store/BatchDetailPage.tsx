import { Link, useNavigate, useParams } from "react-router-dom";
import { Check, ImagePlus, Tag } from "lucide-react";
import { useStore } from "../../app/store";
import { BATCH_STEPS, Badge, BatchBadge, Card, Empty, JobBadge, PageHeader, Progress, Stat, VersionBadge } from "../../components/ui";
import { date, dateTime } from "../../lib/format";

const MIN_BOXES = 20; // BR-11
const MIN_VAL = 50;

/** M08 — Batch detail: pipeline, data progress per SKU, send to training (US16, US18). */
export function BatchDetailPage() {
  const { id } = useParams();
  const store = useStore();
  const { batches, skus, approved, valImages, labelQueue, labeledTrays, jobs, user, startTraining, versionStatus } = store;
  const navigate = useNavigate();
  const b = batches.find((x) => x.id === Number(id));
  if (!b) return <Empty title="Không tìm thấy đợt nhập"><Link to="/batches">Về danh sách</Link></Empty>;

  const items = skus.filter((s) => s.task === b.id);
  const isCurrent = b.id === 5;
  const counts = items.map((s) => ({ s, n: b.status === "DA_DEPLOY" && !isCurrent ? 20 + (s.id % 15) : isCurrent ? approved[s.id] ?? 0 : 0 }));
  const val = isCurrent ? valImages : b.status === "DA_DEPLOY" ? 60 + b.id * 3 : 0;
  const ready = counts.length > 0 && counts.every((c) => c.n >= MIN_BOXES) && val >= MIN_VAL;
  const stepIndex = BATCH_STEPS.findIndex((s) => s.status === (b.status === "CHO_HUAN_LUYEN" ? "DANG_GAN_NHAN" : b.status));
  const job = jobs.find((j) => j.batch === b.id);
  const isML = user?.role === "ML_ENGINEER";
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
        <Stat label="SKU trong đợt" value={items.length} />
        <Stat label="SKU đủ dữ liệu" value={`${counts.filter((c) => c.n >= MIN_BOXES).length}/${items.length}`} hint={`mục tiêu ≥ ${MIN_BOXES} box đã duyệt / SKU`} />
        <Stat label="Ảnh val của đợt" value={val} hint={`mục tiêu ≥ ${MIN_VAL} ảnh khay thật`} />
        {isCurrent && <Stat label="Ảnh chờ gán nhãn" value={Math.max(0, remaining)} hint="trong hàng đợi của phiên này" />}
      </div>
      <div className="grid" style={{ gridTemplateColumns: "2fr 1fr", alignItems: "start" }}>
        <Card title="Tiến độ dữ liệu theo SKU" bodyClass="">
          {items.length === 0 ? <Empty title="Đợt chưa có SKU" /> : (
            <div className="table-wrap"><table className="table">
              <thead><tr><th>SKU</th><th>Mã vạch</th><th style={{ width: "40%" }}>Box đã duyệt</th><th /></tr></thead>
              <tbody>{counts.map(({ s, n }) => (
                <tr key={s.id}>
                  <td><Link to={`/skus/${s.id}`}>{s.name}</Link></td><td className="mono">{s.barcode}</td>
                  <td><div className="row"><div style={{ flex: 1 }}><Progress value={(n / MIN_BOXES) * 100} tone={n >= MIN_BOXES ? "ok" : "warn"} /></div><span className="small num" style={{ width: 48 }}>{n}/{MIN_BOXES}</span></div></td>
                  <td>{n >= MIN_BOXES ? <Badge tone="ok">Đủ</Badge> : <Badge tone="warn">Thiếu {MIN_BOXES - n}</Badge>}</td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </Card>
        <div className="col" style={{ gap: 16 }}>
          {isCurrent && (b.status === "DANG_GAN_NHAN" || b.status === "CHO_HUAN_LUYEN") && (
            <Card title="Gán nhãn">
              <div className="col" style={{ gap: 10 }}>
                <p className="small muted">Ảnh khay thật có chứa SKU mới (lấy từ giao dịch có mã vạch của SKU mới). Model đang chạy tự đề xuất box SKU cũ; chỉ cần vẽ box SKU mới.</p>
                <div className="row small"><span>Đã gán {labeledTrays.length}/{labelQueue.length} ảnh trong hàng đợi</span></div>
                <Progress value={(labeledTrays.length / labelQueue.length) * 100} />
                {isML ? (
                  <>
                    <button className="btn primary" disabled={remaining <= 0} onClick={() => navigate(`/batches/${b.id}/label`)}><Tag size={16} /> {remaining > 0 ? "Bắt đầu gán nhãn" : "Đã gán hết hàng đợi"}</button>
                    <button className="btn"><ImagePlus size={16} /> Tải ảnh bổ sung</button>
                  </>
                ) : <span className="small faint">Kỹ sư ML thực hiện bước này.</span>}
              </div>
            </Card>
          )}
          {isCurrent && (b.status === "DANG_GAN_NHAN" || b.status === "CHO_HUAN_LUYEN") && (
            <Card title="Gửi huấn luyện">
              <div className="col" style={{ gap: 10 }}>
                <p className="small muted">Chỉ gửi được khi mọi SKU mới có ≥ {MIN_BOXES} box đã duyệt và tập val ≥ {MIN_VAL} ảnh (BR-11).</p>
                {isML ? <button className="btn primary" disabled={!ready} onClick={() => startTraining(b.id)}>Gửi huấn luyện</button> : null}
                {!ready && <span className="small" style={{ color: "var(--warn)" }}>Chưa đủ dữ liệu.</span>}
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
