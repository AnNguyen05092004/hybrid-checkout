import { useState } from "react";
import { Modal } from "../../components/ui";

/** Cashier closes an alert as a model error without waiting for anyone; it is logged for post-review (UC08, BR-04). */
export function FalseAlarmDialog({ summary, reasons, onConfirm, onClose }: {
  summary: string;
  reasons: string[];
  onConfirm: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState(reasons[0]);
  const [note, setNote] = useState("");

  return (
    <Modal title="Camera báo nhầm" onClose={onClose} width={460} footer={<>
      <button className="btn" onClick={onClose}>Quay lại</button>
      <button className="btn primary" onClick={() => onConfirm(note ? `${reason} — ${note}` : reason)}>Xác nhận báo nhầm</button>
    </>}>
      <div className="sim small">{summary}</div>
      <label className="field"><span>Lý do</span>
        <select className="select" value={reason} onChange={(e) => setReason(e.target.value)} autoFocus>
          {reasons.map((r) => <option key={r}>{r}</option>)}
        </select>
      </label>
      <label className="field"><span>Ghi chú (không bắt buộc)</span>
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <p className="small muted" style={{ margin: 0 }}>
        Hệ thống lưu ảnh khay, lý do và tên bạn để quản lý hậu kiểm. Báo nhầm của model cũng được dùng để cải thiện model.
      </p>
    </Modal>
  );
}
