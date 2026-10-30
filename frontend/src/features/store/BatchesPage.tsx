import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { useStore } from "../../app/store";
import { BatchBadge, Card, Empty, Modal, PageHeader } from "../../components/ui";
import { date } from "../../lib/format";

/** M07 — Import batches (US16). */
export function BatchesPage() {
  const { batches, skus, user, createBatch, learnStatus } = useStore();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [picked, setPicked] = useState<number[]>([]);
  const unassigned = skus.filter((s) => learnStatus(s) === "CHUA_HOC");
  const canCreate = user?.role === "STORE_MANAGER";

  return (
    <>
      <PageHeader title="Đợt nhập SKU" sub="Mỗi đợt là một lô SKU mới để model học thêm (một task học liên tục)"
        actions={canCreate && <button className="btn primary" onClick={() => setCreating(true)}><Plus size={16} /> Tạo đợt</button>} />
      <Card bodyClass="">
        <div className="table-wrap"><table className="table">
          <thead><tr><th>Đợt</th><th>Tên</th><th className="num">Số SKU</th><th>Trạng thái</th><th>Người tạo</th><th>Ngày tạo</th><th>Ngày deploy</th></tr></thead>
          <tbody>{[...batches].reverse().map((b) => (
            <tr key={b.id} className="clickable" onClick={() => navigate(`/batches/${b.id}`)}>
              <td className="strong">#{b.id}</td><td>{b.name}</td><td className="num">{skus.filter((s) => s.task === b.id).length}</td>
              <td><BatchBadge status={b.status} /></td><td>{b.createdBy}</td><td>{date(b.createdAt)}</td><td>{b.deployedAt ? date(b.deployedAt) : "—"}</td>
            </tr>
          ))}</tbody>
        </table></div>
      </Card>
      {creating && (
        <Modal title="Tạo đợt nhập" width={620} onClose={() => setCreating(false)} footer={<>
          <button className="btn" onClick={() => setCreating(false)}>Hủy</button>
          <button className="btn primary" disabled={!name.trim() || picked.length === 0} onClick={() => { createBatch(name.trim(), picked); setCreating(false); setPicked([]); setName(""); }}>Tạo đợt</button>
        </>}>
          <label className="field"><span>Tên đợt</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ví dụ: Đợt nhập tháng 11" /></label>
          <div className="field"><span>Chọn SKU chưa học ({picked.length} đã chọn)</span>
            {unassigned.length === 0 ? <Empty title="Không có SKU nào ở trạng thái Chưa học">Thêm SKU mới ở Danh mục SKU trước.</Empty> : (
              <div className="col" style={{ maxHeight: 280, overflowY: "auto" }}>
                {unassigned.map((s) => (
                  <label key={s.id} className="sim-item">
                    <input type="checkbox" checked={picked.includes(s.id)} onChange={(e) => setPicked(e.target.checked ? [...picked, s.id] : picked.filter((x) => x !== s.id))} />
                    {s.name}<span className="spacer" /><span className="mono small">{s.barcode}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
