import { useState, type ReactNode } from "react";
import { Delete } from "lucide-react";
import { useStore } from "../../app/store";
import { Modal } from "../../components/ui";
import { MANAGER_PIN, USERS } from "../../mocks/seed";

/** P04 — Manager confirmation with PIN at the counter (UC12, BR-04, BR-05). */
export function ManagerPinDialog({ title, summary, reasons, onConfirm, onClose }: {
  title: string;
  summary: ReactNode;
  reasons: string[];
  onConfirm: (reason: string, manager: string) => void;
  onClose: () => void;
}) {
  const { user } = useStore();
  const [reason, setReason] = useState(reasons[0]);
  const [note, setNote] = useState("");
  const [pin, setPin] = useState("");
  const [fails, setFails] = useState(0);
  const [error, setError] = useState("");
  const locked = fails >= 3;
  const manager = USERS.find((u) => u.role === "STORE_MANAGER")!;

  const press = (d: string) => {
    if (locked) return;
    const next = (pin + d).slice(0, 6);
    setPin(next);
    setError("");
    if (next.length < 6) return;
    if (user?.id === manager.id) {
      setError("Không dùng PIN của chính người đang đứng quầy. Cần một quản lý khác xác nhận.");
      setPin("");
    } else if (next === MANAGER_PIN) {
      onConfirm(note ? `${reason} — ${note}` : reason, manager.name);
    } else {
      setFails(fails + 1);
      setError(fails + 1 >= 3 ? "Sai PIN 3 lần. Xác nhận tại quầy này bị khóa 5 phút." : `PIN không đúng (${fails + 1}/3).`);
      setPin("");
    }
  };

  return (
    <Modal title={title} onClose={onClose} width={460}>
      <div className="sim small">{summary}</div>
      <label className="field"><span>Lý do</span>
        <select className="select" value={reason} onChange={(e) => setReason(e.target.value)}>
          {reasons.map((r) => <option key={r}>{r}</option>)}
        </select>
      </label>
      <label className="field"><span>Ghi chú (không bắt buộc)</span>
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <div className="col" style={{ alignItems: "center", gap: 10 }}>
        <span className="small muted">Quản lý nhập PIN 6 số <span className="faint">(demo: {MANAGER_PIN})</span></span>
        <div className="pin-dots">{[0, 1, 2, 3, 4, 5].map((i) => <i key={i} className={i < pin.length ? "on" : ""} />)}</div>
        {error && <span className="small" role="alert" style={{ color: "var(--danger)", textAlign: "center" }}>{error}</span>}
      </div>
      <div className="pin-pad">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => <button key={d} onClick={() => press(d)} disabled={locked}>{d}</button>)}
        <button onClick={onClose}>Hủy</button>
        <button onClick={() => press("0")} disabled={locked}>0</button>
        <button onClick={() => setPin(pin.slice(0, -1))} aria-label="Xóa số"><Delete size={20} /></button>
      </div>
    </Modal>
  );
}
