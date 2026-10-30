import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useStore } from "../../app/store";
import { Badge, Card, Empty, LearnBadge, PageHeader } from "../../components/ui";
import { money } from "../../lib/format";
import { CONFUSED_PAIRS } from "../../mocks/models";
import { TRAYS } from "../../mocks/trays";

/** M06 — SKU detail. */
export function SkuDetailPage() {
  const { id } = useParams();
  const { skus, learnStatus, updateSku, user, toast, log, activeBatch } = useStore();
  const s = skus.find((x) => x.id === Number(id));
  const [price, setPrice] = useState(s?.price ?? 0);
  if (!s) return <Empty title="Không tìm thấy SKU"><Link to="/skus">Về danh mục</Link></Empty>;
  const canEdit = user?.role === "STORE_MANAGER";
  const confused = CONFUSED_PAIRS.filter((p) => p.from === s.id || p.to === s.id);
  const example = TRAYS.flatMap((t) => t.objects.map((o) => ({ t, o }))).find((x) => x.o.rpcId === s.id);

  return (
    <>
      <PageHeader title={s.name} sub={<span className="mono">{s.barcode}</span>} actions={<LearnBadge status={learnStatus(s)} />} />
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", alignItems: "start" }}>
        <Card title="Thông tin">
          <div className="col" style={{ gap: 12 }}>
            <div className="row"><span className="muted">Nhóm hàng</span><span className="spacer" />{s.categoryName}</div>
            <label className="field"><span>Giá bán (₫)</span>
              <span className="row">
                <input className="input" style={{ flex: 1 }} disabled={!canEdit} value={price.toLocaleString("vi-VN")} onChange={(e) => setPrice(Number(e.target.value.replace(/\D/g, "")))} />
                {canEdit && <button className="btn primary" disabled={price === s.price || price <= 0} onClick={() => {
                  log("UPDATE_PRICE", s.name, `${money(s.price)} → ${money(price)}`); updateSku(s.id, { price }); toast("Đã đổi giá. Giao dịch đã thanh toán giữ giá cũ.");
                }}>Lưu giá</button>}
              </span>
            </label>
            <div className="row"><span className="muted">Trạng thái bán</span><span className="spacer" />
              {canEdit ? <button className="btn sm" onClick={() => updateSku(s.id, { selling: !s.selling })}>{s.selling ? "Ngừng bán" : "Bán lại"}</button> : null}
              {s.selling ? <Badge tone="ok">Đang bán</Badge> : <Badge>Ngừng bán</Badge>}
            </div>
          </div>
        </Card>
        <Card title="Nhận diện bằng camera">
          <div className="col" style={{ gap: 10 }}>
            <div className="row"><span className="muted">Trạng thái học</span><span className="spacer" /><LearnBadge status={learnStatus(s)} /></div>
            <div className="row"><span className="muted">Thuộc đợt nhập</span><span className="spacer" />{s.task ? <Link to={`/batches/${s.task}`}>Đợt {s.task}</Link> : "Chưa vào đợt nào"}</div>
            <div className="row"><span className="muted">Model học SKU này</span><span className="spacer" />{s.task && s.task <= activeBatch ? `v${s.task} trở đi` : "—"}</div>
            <div>
              <div className="small muted" style={{ marginBottom: 6 }}>Hay bị nhầm với</div>
              {confused.length === 0 ? <span className="small faint">Không nằm trong các cặp nhầm nhiều nhất trên val.</span> : confused.map((p) => {
                const other = p.from === s.id ? p.to : p.from;
                return <div key={other} className="row small"><Link to={`/skus/${other}`}>{skus.find((x) => x.id === other)?.name}</Link><span className="spacer" />{p.count} lần (val, FSA)</div>;
              })}
            </div>
          </div>
        </Card>
        <Card title="Ảnh mẫu">
          {example ? (
            <div style={{ position: "relative", overflow: "hidden", borderRadius: 8, aspectRatio: "1 / 1", background: "#1e293b" }}>
              <img src={`/${example.t.file}`} alt={s.name} style={{
                position: "absolute", width: `${100 / example.o.box[2]}%`, left: `${(-example.o.box[0] / example.o.box[2]) * 100}%`, top: `${(-example.o.box[1] / example.o.box[2]) * 100}%`,
              }} />
            </div>
          ) : <Empty title="Chưa có ảnh mẫu" />}
          <p className="small faint" style={{ marginTop: 8 }}>Cắt từ ảnh khay mẫu (RPC, CC BY-NC-SA 4.0).</p>
        </Card>
      </div>
    </>
  );
}
