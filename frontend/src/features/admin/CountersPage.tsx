import { useState } from "react";
import { Camera, CameraOff, Plus } from "lucide-react";
import { useStore } from "../../app/store";
import { Badge, Card, Modal, PageHeader } from "../../components/ui";
import { TRAYS } from "../../mocks/trays";

/** A02 — Counters and cameras (US26). */
export function CountersPage() {
  const { counters, shift, toast } = useStore();
  const [testing, setTesting] = useState<string | null>(null);
  const counter = counters.find((c) => c.id === testing);

  return (
    <>
      <PageHeader title="Quầy & Camera" actions={<button className="btn primary" onClick={() => toast("Prototype: thêm quầy chưa được mô phỏng.")}><Plus size={16} /> Thêm quầy</button>} />
      <Card bodyClass="">
        <div className="table-wrap"><table className="table">
          <thead><tr><th>Quầy</th><th>Camera</th><th>Kết nối</th><th>Ca đang mở</th><th /></tr></thead>
          <tbody>{counters.map((c) => (
            <tr key={c.id}>
              <td className="strong">{c.name}</td><td>{c.camera}</td>
              <td>{c.cameraOnline ? <Badge tone="ok"><Camera size={12} /> Hoạt động</Badge> : <Badge tone="danger"><CameraOff size={12} /> Mất kết nối</Badge>}</td>
              <td>{shift?.counterId === c.id ? <Badge tone="info">Đang có ca</Badge> : "—"}</td>
              <td><button className="btn sm" onClick={() => setTesting(c.id)}>Chụp thử</button></td>
            </tr>
          ))}</tbody>
        </table></div>
      </Card>
      {counter && (
        <Modal title={`Chụp thử — ${counter.name}`} onClose={() => setTesting(null)} width={560}>
          {counter.cameraOnline
            ? <img src={`/${TRAYS[1].file}`} alt="Ảnh chụp thử" style={{ width: "100%", borderRadius: 8 }} />
            : <div className="empty" style={{ background: "var(--danger-soft)", borderRadius: 8 }}><CameraOff /> Không kết nối được {counter.camera}. Kiểm tra cáp và nguồn.</div>}
        </Modal>
      )}
    </>
  );
}
