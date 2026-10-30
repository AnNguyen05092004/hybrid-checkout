import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Upload } from "lucide-react";
import { useStore, type LearnStatus } from "../../app/store";
import { Badge, Card, Empty, LearnBadge, Modal, PageHeader, Stat } from "../../components/ui";
import { money } from "../../lib/format";
import { CATEGORIES } from "../../mocks/catalog";

/** M05 — SKU catalogue (US15). */
export function SkusPage() {
  const { skus, learnStatus, user, addSku } = useStore();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("ALL");
  const [learn, setLearn] = useState<LearnStatus | "ALL">("ALL");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", barcode: "", category: "drink", price: 10000 });
  const canEdit = user?.role === "STORE_MANAGER";

  const rows = skus.filter((s) =>
    (q === "" || s.name.toLowerCase().includes(q.toLowerCase()) || s.barcode.includes(q)) &&
    (cat === "ALL" || s.category === cat) && (learn === "ALL" || learnStatus(s) === learn));
  const count = (st: LearnStatus) => skus.filter((s) => s.selling && learnStatus(s) === st).length;
  const dup = skus.some((s) => s.barcode === form.barcode.trim());
  const valid = form.name.trim() && /^\d{8,14}$/.test(form.barcode.trim()) && !dup && form.price > 0;

  return (
    <>
      <PageHeader title="Danh mục SKU" sub="Mã vạch, giá và trạng thái nhận diện của từng sản phẩm"
        actions={canEdit && <>
          <button className="btn"><Upload size={16} /> Nhập từ CSV</button>
          <button className="btn primary" onClick={() => setAdding(true)}><Plus size={16} /> Thêm SKU</button>
        </>} />
      <div className="stats">
        <Stat label="SKU đang bán" value={skus.filter((s) => s.selling).length} />
        <Stat label="Camera đã học" value={count("DA_HOC")} tone="ok" />
        <Stat label="Đang học (thuộc đợt đang xử lý)" value={count("DANG_HOC")} />
        <Stat label="Chưa học, chưa vào đợt nào" value={count("CHUA_HOC")} tone="warn" />
      </div>
      <Card bodyClass="" title={<div className="row wrap">
        <span className="row" style={{ position: "relative" }}>
          <Search size={16} style={{ position: "absolute", left: 10, color: "var(--text-3)" }} />
          <input className="input" style={{ paddingLeft: 32, width: 260 }} placeholder="Tìm tên hoặc mã vạch" value={q} onChange={(e) => setQ(e.target.value)} />
        </span>
        <select className="select" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="ALL">Mọi nhóm hàng</option>
          {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
        </select>
        <select className="select" value={learn} onChange={(e) => setLearn(e.target.value as LearnStatus | "ALL")}>
          <option value="ALL">Mọi trạng thái học</option><option value="DA_HOC">Đã học</option><option value="DANG_HOC">Đang học</option><option value="CHUA_HOC">Chưa học</option>
        </select>
        <span className="small muted">{rows.length} SKU</span>
      </div>}>
        {rows.length === 0 ? <Empty title="Không có SKU khớp bộ lọc" /> : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Tên</th><th>Mã vạch</th><th>Nhóm hàng</th><th className="num">Giá</th><th>Nhận diện</th><th>Đợt</th><th>Bán</th></tr></thead>
            <tbody>{rows.slice(0, 120).map((s) => (
              <tr key={s.id} className="clickable" onClick={() => navigate(`/skus/${s.id}`)}>
                <td className="strong">{s.name}</td><td className="mono">{s.barcode}</td><td>{s.categoryName}</td>
                <td className="num">{money(s.price)}</td><td><LearnBadge status={learnStatus(s)} /></td>
                <td>{s.task ? `Đợt ${s.task}` : "—"}</td><td>{s.selling ? <Badge tone="ok">Đang bán</Badge> : <Badge>Ngừng bán</Badge>}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
        {rows.length > 120 && <p className="small muted" style={{ padding: 12 }}>Hiển thị 120/{rows.length}. Dùng bộ lọc để thu hẹp.</p>}
      </Card>
      {adding && (
        <Modal title="Thêm SKU" onClose={() => setAdding(false)} footer={<>
          <button className="btn" onClick={() => setAdding(false)}>Hủy</button>
          <button className="btn primary" disabled={!valid} onClick={() => {
            const c = CATEGORIES[form.category];
            addSku({ name: form.name.trim(), barcode: form.barcode.trim(), category: form.category, categoryName: c.name, price: form.price });
            setAdding(false);
          }}>Thêm</button>
        </>}>
          <label className="field"><span>Tên sản phẩm</span><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label className="field"><span>Mã vạch</span><input className="input mono" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
            {dup && <span className="small" style={{ color: "var(--danger)" }}>Mã vạch đã tồn tại.</span>}</label>
          <label className="field"><span>Nhóm hàng</span>
            <select className="select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
            </select></label>
          <label className="field"><span>Giá bán (₫)</span><input className="input" inputMode="numeric" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value.replace(/\D/g, "")) })} /></label>
          <label className="field"><span>Ảnh sản phẩm</span><input type="file" accept="image/*" /></label>
          <p className="small muted">SKU mới có trạng thái <b>Chưa học</b>: bán được ngay bằng mã vạch, camera chỉ kiểm tra được sau khi SKU vào một đợt nhập và model mới được deploy.</p>
        </Modal>
      )}
    </>
  );
}
