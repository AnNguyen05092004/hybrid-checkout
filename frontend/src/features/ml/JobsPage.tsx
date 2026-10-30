import { useState } from "react";
import { useStore } from "../../app/store";
import { Card, Empty, JobBadge, PageHeader, Progress } from "../../components/ui";
import { dateTime } from "../../lib/format";

/** L03 — Training / evaluation jobs (US20). */
export function JobsPage() {
  const { jobs, toast } = useStore();
  const [openId, setOpenId] = useState<string | null>(jobs[0]?.id ?? null);
  const open = jobs.find((j) => j.id === openId);

  return (
    <>
      <PageHeader title="Job huấn luyện / đánh giá" sub="Mỗi đợt nhập sinh một job chạy trên máy GPU; job xong sinh một phiên bản model chờ duyệt" />
      <div className="grid" style={{ gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", alignItems: "start" }}>
        <Card bodyClass="">
          {jobs.length === 0 ? <Empty title="Chưa có job" /> : (
            <div className="table-wrap"><table className="table">
              <thead><tr><th>Mã</th><th>Loại</th><th>Đợt</th><th>Trạng thái</th><th style={{ width: 160 }}>Tiến độ</th><th className="num">Giờ GPU</th><th>Bắt đầu</th><th>Kết thúc</th></tr></thead>
              <tbody>{jobs.map((j) => (
                <tr key={j.id} className="clickable" onClick={() => setOpenId(j.id)} style={j.id === openId ? { background: "var(--primary-soft)" } : undefined}>
                  <td className="mono">{j.id}</td><td>{j.type === "TRAIN" ? "Huấn luyện" : "Đánh giá"}</td><td>#{j.batch}</td><td><JobBadge status={j.status} /></td>
                  <td><div className="row"><div style={{ flex: 1 }}><Progress value={(j.epoch / j.epochs) * 100} tone={j.status === "XONG" ? "ok" : ""} /></div><span className="small">{j.epoch}/{j.epochs}</span></div></td>
                  <td className="num">{j.gpuHours.toFixed(2)}</td><td>{dateTime(j.startedAt)}</td><td>{j.finishedAt ? dateTime(j.finishedAt) : "—"}</td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </Card>
        <Card title={open ? `Chi tiết ${open.id}` : "Chi tiết job"}>
          {open ? (
            <div className="col" style={{ gap: 10 }}>
              <div className="row"><JobBadge status={open.status} /><span className="spacer" /><span className="small muted">Đợt {open.batch} · 16 epoch · ConvNeXt-V2-Base + PDP</span></div>
              <pre className="mono" style={{ background: "#0f172a", color: "#e2e8f0", padding: 12, borderRadius: 8, maxHeight: 320, overflow: "auto", margin: 0, whiteSpace: "pre-wrap" }}>
                {open.log.join("\n")}
              </pre>
              <div className="row">
                <button className="btn sm" disabled={open.status === "XONG" || open.status === "LOI"} onClick={() => toast("Prototype: hủy job chưa được mô phỏng.")}>Hủy job</button>
                <button className="btn sm" disabled={open.status !== "LOI"}>Chạy lại</button>
              </div>
            </div>
          ) : <Empty title="Chọn một job" />}
        </Card>
      </div>
    </>
  );
}
