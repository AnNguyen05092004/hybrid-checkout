import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, CheckCheck, ImagePlus, Layers, Loader2, X } from "lucide-react";
import { useStore } from "../../app/store";
import { CUTOUT_REVIEW_BELOW, MIN_CUTOUTS } from "../../app/rules";
import { Badge, Card, Empty } from "../../components/ui";
import { cutoutsOf } from "../../mocks/cutouts";
import { TRAYS } from "../../mocks/trays";

/** L01 — Sample photos and composites (UC17, US17): review background-removed cutouts, then generate composites. */
export function SamplesPage() {
  const { id } = useParams();
  const { batches, skus, user, cutoutState, setCutoutState, composites, generateComposites, toast } = useStore();
  const navigate = useNavigate();
  const b = batches.find((x) => x.id === Number(id));
  const items = skus.filter((s) => s.task === b?.id && cutoutsOf(s.id).length > 0);
  const accepted = (skuId: number) => cutoutsOf(skuId).filter((c) => cutoutState[c.id] === "accepted").length;
  const [current, setCurrent] = useState(items.find((s) => accepted(s.id) < MIN_CUTOUTS)?.id ?? items[0]?.id);

  if (!b || items.length === 0) {
    return <Card><Empty title="Đợt này không có ảnh mẫu trong bản demo"><Link to={`/batches/${id}`}>Về chi tiết đợt</Link></Empty></Card>;
  }

  const editable = b.status === "THU_THAP";
  const isML = user?.role === "ML_ENGINEER";
  const done = items.filter((s) => accepted(s.id) >= MIN_CUTOUTS).length;
  const ready = done === items.length;
  const sku = items.find((s) => s.id === current) ?? items[0];
  const cutouts = cutoutsOf(sku.id);
  const pending = cutouts.filter((c) => !cutoutState[c.id]);
  const examples = TRAYS.filter((t) => t.task === b.id).slice(0, 4);

  return (
    <>
      <div className="row wrap">
        <button className="btn" onClick={() => navigate(`/batches/${b.id}`)}><ArrowLeft size={16} /> Đợt {b.id}</button>
        <h2>Ảnh mẫu & ảnh ghép</h2>
        <Badge tone={ready ? "ok" : "warn"}>{done}/{items.length} SKU đủ ảnh mẫu</Badge>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "260px minmax(0, 1fr) 300px", alignItems: "start" }}>
        <Card title="SKU mới" bodyClass="">
          <div className="col" style={{ gap: 6, padding: 12, maxHeight: 620, overflowY: "auto" }}>
            {items.map((s) => {
              const n = accepted(s.id);
              return (
                <button key={s.id} className={`alert-card ${s.id === sku.id ? "on" : ""} ${n >= MIN_CUTOUTS ? "" : "medium"}`} onClick={() => setCurrent(s.id)}>
                  <span className="row"><span className="strong ellipsis" style={{ flex: 1, textAlign: "left" }}>{s.name}</span>
                    <Badge tone={n >= MIN_CUTOUTS ? "ok" : "warn"}>{n >= MIN_CUTOUTS ? `${n} ✓` : `${n}/${MIN_CUTOUTS}`}</Badge></span>
                </button>
              );
            })}
          </div>
        </Card>

        <Card title={sku.name} actions={editable && <div className="row">
          <button className="btn sm" onClick={() => toast("Prototype: ảnh mẫu đã có sẵn, không tải ảnh mới.")}><ImagePlus size={14} /> Tải ảnh mẫu</button>
          {isML && <button className="btn sm" disabled={pending.length === 0}
            onClick={() => setCutoutState(pending.filter((c) => c.quality >= CUTOUT_REVIEW_BELOW).map((c) => c.id), "accepted")}>
            <CheckCheck size={14} /> Nhận ảnh rõ</button>}
        </div>}>
          <div className="col" style={{ gap: 12 }}>
            <p className="small muted">Chụp từ trên xuống, mỗi ảnh một sản phẩm, đủ các mặt và vài góc nghiêng. Hệ thống tự cắt nền; {isML ? "nhận ảnh cắt sạch, loại ảnh bị lẹm hoặc dính vật khác." : "kỹ sư ML duyệt ảnh cắt."}</p>
            <div className="cutouts">
              {cutouts.map((c) => {
                const state = cutoutState[c.id];
                return (
                  <figure key={c.id} className={`cutout ${state ?? ""}`}>
                    <img src={`/${c.file}`} alt={`${sku.name}, ảnh cắt ${c.id}`} loading="lazy" />
                    <figcaption className="row small">
                      {state === "accepted" ? <Badge tone="ok">Nhận</Badge> : state === "rejected" ? <Badge tone="danger">Loại</Badge>
                        : c.quality < CUTOUT_REVIEW_BELOW ? <Badge tone="warn">Cần xem kỹ</Badge> : <Badge>Chờ duyệt</Badge>}
                      <span className="spacer" />
                      {isML && editable && <>
                        <button className="btn sm ghost" aria-label="Nhận" onClick={() => setCutoutState([c.id], "accepted")}><Check size={14} /></button>
                        <button className="btn sm ghost" aria-label="Loại" onClick={() => setCutoutState([c.id], "rejected")}><X size={14} /></button>
                      </>}
                    </figcaption>
                  </figure>
                );
              })}
            </div>
          </div>
        </Card>

        <div className="col" style={{ gap: 12 }}>
          <Card title="Ảnh ghép">
            <div className="col" style={{ gap: 10 }}>
              <p className="small muted">Dán ảnh cắt đã nhận lên nền khay theo bố cục giống quầy thật. Box có sẵn khi ghép, không cần vẽ.</p>
              {composites.status === "DONE" && <div className="row"><span className="muted small">Đã tạo</span><span className="spacer" /><b>{composites.count.toLocaleString("vi-VN")} ảnh</b></div>}
              {isML && editable && (
                <button className="btn primary" disabled={!ready || composites.status === "RUNNING"} onClick={() => generateComposites(b.id)}>
                  {composites.status === "RUNNING" ? <><Loader2 size={16} className="spin" /> Đang tạo…</> : <><Layers size={16} /> {composites.status === "DONE" ? "Tạo lại ảnh ghép" : "Tạo ảnh ghép"}</>}
                </button>
              )}
              {!ready && <span className="small" style={{ color: "var(--warn)" }}>Cần mọi SKU có ≥ {MIN_CUTOUTS} ảnh cắt đã nhận.</span>}
              <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {examples.map((t) => <img key={t.id} src={`/${t.file}`} alt={`Ảnh ghép ${t.id}`} style={{ width: "100%", borderRadius: 6 }} loading="lazy" />)}
              </div>
              <span className="small faint">Ví dụ ảnh ghép của đợt.</span>
            </div>
          </Card>
          <Card title="Ảnh ghép dùng để làm gì">
            <p className="small muted" style={{ margin: 0 }}>Chỉ dùng để <b>huấn luyện</b>. Cổng duyệt đo trên <b>ảnh khay thật</b> ở bước Gán nhãn ảnh thật, vì ảnh ghép khác ảnh camera về ánh sáng, bóng và cách xếp.</p>
          </Card>
        </div>
      </div>
    </>
  );
}
