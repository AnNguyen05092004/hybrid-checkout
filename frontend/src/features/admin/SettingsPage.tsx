import { useState } from "react";
import { useStore } from "../../app/store";
import { Card, PageHeader } from "../../components/ui";
import { GATE } from "../../mocks/models";

/** A04 — Data retention and default gates (US28, BR-09, BR-11, BR-13). */
export function SettingsPage() {
  const { retention, setRetention, toast, log } = useStore();
  const [draft, setDraft] = useState(retention);

  return (
    <>
      <PageHeader title="Cài đặt lưu trữ dữ liệu" actions={<button className="btn primary" onClick={() => { setRetention(draft); log("UPDATE_RETENTION", "Lưu trữ", `${draft.txDays} / ${draft.batchDays} ngày`); toast("Đã lưu cài đặt."); }}>Lưu</button>} />
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", alignItems: "start" }}>
        <Card title="Thời gian lưu ảnh">
          <div className="col" style={{ gap: 14 }}>
            <label className="field"><span>Ảnh khay của giao dịch (ngày)</span>
              <input className="input" type="number" min={1} value={draft.txDays} onChange={(e) => setDraft({ ...draft, txDays: Number(e.target.value) })} />
              <span className="small faint">Dùng cho hậu kiểm. Hết hạn thì xóa ảnh, giữ lại kết quả đối chiếu.</span></label>
            <label className="field"><span>Ảnh của đợt nhập, tính từ khi deploy (ngày)</span>
              <input className="input" type="number" min={0} value={draft.batchDays} onChange={(e) => setDraft({ ...draft, batchDays: Number(e.target.value) })} />
              <span className="small faint">Model học thêm không cần ảnh cũ, nên ảnh đợt được xóa sau thời gian theo dõi.</span></label>
          </div>
        </Card>
        <Card title="Dung lượng">
          <div className="col small" style={{ gap: 8 }}>
            <div className="row"><span className="muted">Ảnh giao dịch</span><span className="spacer" />3,8 GB</div>
            <div className="row"><span className="muted">Ảnh đợt nhập</span><span className="spacer" />1,1 GB</div>
            <div className="row"><span className="muted">Checkpoint model</span><span className="spacer" />2,4 GB</div>
            <div className="row"><span className="muted">Lần dọn gần nhất</span><span className="spacer" />29/10/2026 02:00</div>
            <p className="faint">Số liệu minh họa.</p>
          </div>
        </Card>
        <Card title="Cổng duyệt mặc định">
          <div className="col small" style={{ gap: 8 }}>
            <div className="row"><span className="muted">AP50 val giảm tối đa</span><span className="spacer" />{GATE.maxAp50Drop} điểm</div>
            <div className="row"><span className="muted">Mức quên tối đa</span><span className="spacer" />{GATE.maxForgetting} điểm AP50</div>
            <div className="row"><span className="muted">Bắt món sót tối thiểu</span><span className="spacer" />{GATE.minMissRecall}%</div>
            <div className="row"><span className="muted">Báo nhầm tối đa</span><span className="spacer" />{GATE.maxFalseAlarm}%</div>
            <div className="row"><span className="muted">Dữ liệu tối thiểu mỗi SKU mới</span><span className="spacer" />20 box, 50 ảnh val</div>
          </div>
        </Card>
      </div>
    </>
  );
}
