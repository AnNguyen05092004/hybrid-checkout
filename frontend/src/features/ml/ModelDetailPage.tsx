import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, RotateCcw, Rocket, XCircle } from "lucide-react";
import { useStore } from "../../app/store";
import { Badge, Card, DemoNote, Empty, Modal, PageHeader, VersionBadge } from "../../components/ui";
import { dateTime, pct } from "../../lib/format";
import { CONFUSED_PAIRS, GATE, MODEL_VERSIONS } from "../../mocks/models";
import { sku } from "../../mocks/catalog";

/** L05 — Version detail and deployment gate (US21, US22, BR-08, BR-09). */
export function ModelDetailPage() {
  const { id } = useParams();
  const { versionStatus, versionCreatedAt, activeBatch, deploy, rollback, reject, user, jobs } = useStore();
  const [confirm, setConfirm] = useState<"deploy" | "rollback" | null>(null);
  const [reason, setReason] = useState("");
  const v = MODEL_VERSIONS.find((m) => m.id === id);
  if (!v || versionStatus[v.id] === "CHUA_CO") return <Empty title="Phiên bản chưa tồn tại"><Link to="/models">Về danh sách</Link></Empty>;

  const status = versionStatus[v.id];
  const active = MODEL_VERSIONS.find((m) => m.batch === activeBatch)!;
  // A candidate is compared with the running version; other versions with the one before them.
  const base = status === "SAN_SANG" ? active : MODEL_VERSIONS.find((m) => m.batch === v.batch - 1);
  const gates = [
    { name: "AP50 val không giảm quá 1 điểm", cand: pct(v.ap50, 2), ref: base ? pct(base.ap50, 2) : "—", pass: !base || v.ap50 >= base.ap50 - GATE.maxAp50Drop },
    { name: `Mức quên SKU cũ ≤ ${GATE.maxForgetting} điểm AP50`, cand: "≈ 0", ref: "—", pass: v.forgetting <= GATE.maxForgetting },
    { name: `Bắt món sót (giả lập) ≥ ${GATE.minMissRecall}%`, cand: pct(v.missRecall), ref: base ? pct(base.missRecall) : "—", pass: v.missRecall >= GATE.minMissRecall },
    { name: `Báo nhầm khay sạch (giả lập) ≤ ${GATE.maxFalseAlarm}%`, cand: pct(v.falseAlarm), ref: base ? pct(base.falseAlarm) : "—", pass: v.falseAlarm <= GATE.maxFalseAlarm },
  ];
  const allPass = gates.every((g) => g.pass);
  const isML = user?.role === "ML_ENGINEER";
  const canDeploy = status === "SAN_SANG" && v.batch === activeBatch + 1;
  const job = jobs.find((j) => j.batch === v.batch);

  return (
    <>
      <PageHeader title={v.name} sub={`${v.backbone} · ${v.checkpoint}`} actions={<>
        <VersionBadge status={status} />
        {isML && canDeploy && <button className="btn" onClick={() => reject(v.id)}>Từ chối</button>}
        {isML && canDeploy && <button className="btn primary" onClick={() => setConfirm("deploy")}><Rocket size={16} /> Deploy</button>}
        {isML && status === "ACTIVE" && v.batch > 1 && <button className="btn" onClick={() => setConfirm("rollback")}><RotateCcw size={16} /> Rollback về v{v.batch - 1}</button>}
      </>} />
      {status === "SAN_SANG" && !canDeploy && <DemoNote>Chỉ deploy được phiên bản của đợt liền sau phiên bản đang chạy (v{activeBatch + 1}).</DemoNote>}
      <div className="grid" style={{ gridTemplateColumns: "minmax(0, 3fr) minmax(0, 2fr)", alignItems: "start" }}>
        <Card title="Cổng duyệt" actions={allPass ? <Badge tone="ok"><CheckCircle2 size={12} /> Đạt tất cả</Badge> : <Badge tone="danger">Có điều kiện không đạt</Badge>} bodyClass="">
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Điều kiện (BR-09)</th><th className="num">Phiên bản này</th><th className="num">So với {base?.id ?? "—"}</th><th>Kết quả</th></tr></thead>
            <tbody>{gates.map((g) => (
              <tr key={g.name}><td>{g.name}</td><td className="num strong">{g.cand}</td><td className="num muted">{g.ref}</td>
                <td>{g.pass ? <Badge tone="ok"><CheckCircle2 size={12} /> Đạt</Badge> : <Badge tone="danger"><XCircle size={12} /> Không đạt</Badge>}</td></tr>
            ))}</tbody>
          </table></div>
          <p className="small muted" style={{ padding: "0 16px 14px" }}>Chỉ số đối chiếu giả lập là số minh họa; khi có backend sẽ tính bằng thí nghiệm xóa món trên ảnh test (mục tiêu G1, G2).</p>
        </Card>
        <Card title="Thông tin">
          <div className="col small" style={{ gap: 8 }}>
            <div className="row"><span className="muted">Đợt mới nhất đã học</span><span className="spacer" /><Link to={`/batches/${v.batch}`}>Đợt {v.batch}</Link></div>
            <div className="row"><span className="muted">Số SKU</span><span className="spacer" />{v.skuCount}</div>
            <div className="row"><span className="muted">cAcc val</span><span className="spacer" />{pct(v.cacc, 2)}</div>
            <div className="row"><span className="muted">Phát hiện tráo mã (giả lập)</span><span className="spacer" />{pct(v.swapRecall)}</div>
            <div className="row"><span className="muted">Giờ GPU huấn luyện</span><span className="spacer" />{v.gpuHours}</div>
            <div className="row"><span className="muted">Tạo lúc</span><span className="spacer" />{versionCreatedAt[v.id] ? dateTime(versionCreatedAt[v.id]) : "—"}</div>
            <div className="row"><span className="muted">Job</span><span className="spacer" />{job?.id ?? "—"}</div>
          </div>
        </Card>
      </div>
      <Card title="Cặp SKU hay nhầm (tập val)" bodyClass="">
        <div className="table-wrap"><table className="table">
          <thead><tr><th>SKU thật</th><th>Bị nhận thành</th><th>Nhóm hàng</th><th className="num">Số lần</th></tr></thead>
          <tbody>{CONFUSED_PAIRS.map((p) => (
            <tr key={`${p.from}-${p.to}`}><td><Link to={`/skus/${p.from}`}>{sku(p.from).name}</Link></td><td><Link to={`/skus/${p.to}`}>{sku(p.to).name}</Link></td><td>{sku(p.from).categoryName}</td><td className="num">{p.count}</td></tr>
          ))}</tbody>
        </table></div>
        <p className="small faint" style={{ padding: "8px 16px 14px" }}>Nguồn: kết quả đánh giá model trên tập val.</p>
      </Card>

      {confirm === "deploy" && (
        <Modal title={`Deploy ${v.name}?`} onClose={() => setConfirm(null)} footer={<>
          <button className="btn" onClick={() => setConfirm(null)}>Hủy</button>
          <button className="btn primary" disabled={!allPass && !reason.trim()} onClick={() => { deploy(v.id, allPass ? undefined : reason); setConfirm(null); }}>Xác nhận deploy</button>
        </>}>
          <p>Mọi quầy sẽ dùng {v.id} cho lần nhận diện tiếp theo. {v.skuCount - active.skuCount} SKU của đợt {v.batch} chuyển sang <b>Đã học</b> và bắt đầu được camera kiểm tra.</p>
          {!allPass && <label className="field"><span>Lý do override (bắt buộc vì có điều kiện không đạt)</span><input className="input" value={reason} onChange={(e) => setReason(e.target.value)} /></label>}
        </Modal>
      )}
      {confirm === "rollback" && (
        <Modal title={`Rollback về v${v.batch - 1}?`} onClose={() => setConfirm(null)} footer={<>
          <button className="btn" onClick={() => setConfirm(null)}>Hủy</button>
          <button className="btn danger" onClick={() => { rollback(); setConfirm(null); }}>Xác nhận rollback</button>
        </>}>
          <p>Quầy quay về dùng v{v.batch - 1}. SKU của đợt {v.batch} quay về <b>chưa học</b>: vẫn bán bằng mã vạch nhưng camera không kiểm tra.</p>
        </Modal>
      )}
    </>
  );
}
