import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Camera, CameraOff } from "lucide-react";
import { useStore } from "../../app/store";
import { Badge, Card } from "../../components/ui";
import { MODEL_VERSIONS } from "../../mocks/models";
import { TRAYS } from "../../mocks/trays";

/** P01 — Open a shift at a counter (UC04). */
export function OpenShiftPage() {
  const { shift, counters, openShift, activeBatch, skus, isLearned } = useStore();
  const navigate = useNavigate();
  const [counterId, setCounterId] = useState(counters[0].id);
  const [cash, setCash] = useState(2000000);
  if (shift) return <Navigate to="/pos" replace />;
  const counter = counters.find((c) => c.id === counterId)!;
  const selling = skus.filter((s) => s.selling);
  const covered = selling.filter((s) => isLearned(s.id)).length;
  const model = MODEL_VERSIONS.find((m) => m.batch === activeBatch)!;

  return (
    <div style={{ padding: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 1100, margin: "0 auto", width: "100%" }}>
      <Card title="Mở ca bán hàng">
        <div className="col" style={{ gap: 16 }}>
          <div className="field"><span>Chọn quầy</span>
            <div className="col">
              {counters.map((c) => (
                <label key={c.id} className="sim-item" style={{ cursor: "pointer", padding: 12, borderColor: c.id === counterId ? "var(--primary)" : undefined }}>
                  <input type="radio" name="counter" checked={c.id === counterId} onChange={() => setCounterId(c.id)} />
                  <span className="strong">{c.name}</span>
                  <span className="spacer" />
                  {c.cameraOnline ? <Badge tone="ok"><Camera size={12} /> Camera OK</Badge> : <Badge tone="danger"><CameraOff size={12} /> Camera mất kết nối</Badge>}
                </label>
              ))}
            </div>
          </div>
          <label className="field"><span>Tiền mặt đầu ca</span>
            <input className="input" style={{ height: 48, fontSize: 18 }} value={cash.toLocaleString("vi-VN")} onChange={(e) => setCash(Number(e.target.value.replace(/\D/g, "")))} />
          </label>
          <button className="btn primary lg" onClick={() => { openShift({ counterId, openedAt: new Date().toISOString(), openingCash: cash }); navigate("/pos"); }}>Mở ca</button>
        </div>
      </Card>
      <Card title="Kiểm tra trước ca">
        <div className="col" style={{ gap: 14 }}>
          <div>
            <div className="small muted">Ảnh chụp thử từ {counter.camera}</div>
            {counter.cameraOnline
              ? <img src={`/${TRAYS[0].file}`} alt="Ảnh chụp thử" style={{ width: "100%", borderRadius: 8, marginTop: 6, filter: "grayscale(0.2)" }} />
              : <div className="empty" style={{ background: "var(--danger-soft)", borderRadius: 8, marginTop: 6 }}><CameraOff /> Không lấy được ảnh. Vẫn mở ca được, nhưng kiểm tra khay sẽ cần quản lý cho bỏ qua.</div>}
          </div>
          <div className="row"><span className="muted">Model đang chạy</span><span className="spacer" /><span className="strong">{model.name}</span></div>
          <div className="row"><span className="muted">SKU camera nhận diện được</span><span className="spacer" /><span className="strong">{covered} / {selling.length}</span></div>
          {covered < selling.length && <p className="small muted">{selling.length - covered} SKU mới chưa được model học: bán bằng mã vạch, camera bỏ qua khi đối chiếu.</p>}
        </div>
      </Card>
    </div>
  );
}
