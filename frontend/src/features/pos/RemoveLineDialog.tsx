import { useState } from "react";
import { Modal } from "../../components/ui";

/** Cashier deletes a line alone, without a PIN: the post-review covers it (UC10, BR-05, BR-17). */
export function RemoveLineDialog({ summary, reasons, onConfirm, onClose }: {
  summary: string;
  reasons: string[];
  onConfirm: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState(reasons[0]);

  return (
    <Modal title="Xóa dòng" onClose={onClose} width={460} footer={<>
      <button className="btn" onClick={onClose}>Quay lại</button>
      <button className="btn danger" onClick={() => onConfirm(reason)}>Xóa dòng</button>
    </>}>
      <div className="sim small">{summary}</div>
      <label className="field"><span>Lý do</span>
        <select className="select" value={reason} onChange={(e) => setReason(e.target.value)} autoFocus>
          {reasons.map((r) => <option key={r}>{r}</option>)}
        </select>
      </label>
      <p className="small muted" style={{ margin: 0 }}>
        {reason === reasons[0] ? "Khách trả lại món: khi đối chiếu, món này được trừ khỏi ảnh khay. " : "Món vẫn trên khay: nhớ quét đúng mã. "}
        Hệ thống lưu dòng đã xóa, lý do và tên bạn để quản lý hậu kiểm.
      </p>
    </Modal>
  );
}
