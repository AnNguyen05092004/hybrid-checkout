import { useMemo, useState } from "react";
import { useStore, type Thresholds } from "../../app/store";
import { Card, DemoNote, PageHeader, Stat } from "../../components/ui";
import { pct } from "../../lib/format";
import { simulate } from "./simulate";

/** L06 — Detection thresholds per batch group with live preview (US23, BR-10). */
export function ThresholdsPage() {
  const { thresholds, setThresholds, activeBatch, audit } = useStore();
  const [draft, setDraft] = useState<Record<number, Thresholds>>(thresholds);
  const [group, setGroup] = useState(1);
  const t = draft[group];
  const preview = useMemo(() => simulate(activeBatch, t.alert, t.auto, t.low), [activeBatch, t]);
  const current = useMemo(() => simulate(activeBatch, thresholds[group].alert, thresholds[group].auto, thresholds[group].low), [activeBatch, thresholds, group]);
  const changed = JSON.stringify(draft) !== JSON.stringify(thresholds);
  const set = (k: keyof Thresholds, v: number) => setDraft({ ...draft, [group]: { ...t, [k]: v } });

  const slider = (k: keyof Thresholds, label: string, hint: string, min: number, max: number) => (
    <label className="field">
      <span className="row">{label}<span className="spacer" /><b className="mono">{t[k].toFixed(2)}</b></span>
      <input type="range" min={min} max={max} step={0.01} value={t[k]} onChange={(e) => set(k, Number(e.target.value))} />
      <span className="small faint">{hint}</span>
    </label>
  );

  return (
    <>
      <PageHeader title="Ngưỡng nhận diện" sub="Ngưỡng theo nhóm đợt: chọn trên tập val, không chọn trên tập test"
        actions={<>
          <button className="btn" disabled={!changed} onClick={() => setDraft(thresholds)}>Hoàn tác</button>
          <button className="btn primary" disabled={!changed} onClick={() => setThresholds(draft)}>Lưu cấu hình</button>
        </>} />
      <DemoNote>Bản xem trước chạy thật thuật toán đối chiếu trên các khay mẫu của prototype (xóa lần lượt từng món khỏi danh sách quét). Khi có backend sẽ chạy trên toàn bộ ảnh val.</DemoNote>
      <div className="grid" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", alignItems: "start" }}>
        <Card title="Chỉnh ngưỡng" actions={
          <div className="seg">{[1, 2, 3, 4, 5].map((g) => <button key={g} className={group === g ? "on" : ""} onClick={() => setGroup(g)}>Đợt {g}</button>)}</div>
        }>
          <div className="col" style={{ gap: 18 }}>
            {slider("alert", "Ngưỡng cảnh báo", "Detection có độ tin từ mức này trở lên mới được dùng để đối chiếu và sinh cảnh báo.", 0.2, 0.95)}
            {slider("auto", "Ngưỡng tự nhận (làn nhanh)", "Từ mức này trở lên, món được tự thêm vào giỏ; thấp hơn thì thu ngân phải quét xác nhận.", 0.5, 0.99)}
            {slider("low", "Ngưỡng thấp", "Dưới mức này coi như không thấy; giữa ngưỡng thấp và ngưỡng cảnh báo chỉ vẽ khung nét đứt.", 0.05, 0.5)}
            {t.low >= t.alert && <span className="small" style={{ color: "var(--danger)" }}>Ngưỡng thấp phải nhỏ hơn ngưỡng cảnh báo.</span>}
          </div>
        </Card>
        <div className="col" style={{ gap: 16 }}>
          <div className="stats">
            <Stat label="Bắt món sót" value={pct(preview.missRecall)} hint={`hiện tại ${pct(current.missRecall)} · mục tiêu ≥ 90%`} tone={preview.missRecall >= 90 ? "ok" : "danger"} />
            <Stat label="Báo nhầm khay sạch" value={pct(preview.falseAlarm)} hint={`hiện tại ${pct(current.falseAlarm)} · mục tiêu ≤ 10%`} tone={preview.falseAlarm <= 10 ? "ok" : "danger"} />
            <Stat label="Món tự nhận ở làn nhanh" value={pct(preview.autoShare)} hint={`hiện tại ${pct(current.autoShare)} · mục tiêu ≥ 70%`} />
          </div>
          <Card title="Lịch sử cấu hình">
            <div className="col small" style={{ gap: 6 }}>
              {audit.filter((a) => a.action === "UPDATE_THRESHOLDS").map((a) => <div key={a.at} className="row"><span>{a.user}</span><span className="spacer" /><span className="faint">{new Date(a.at).toLocaleString("vi-VN")}</span></div>)}
              <div className="row"><span>Cấu hình mặc định (0,50 / 0,80 / 0,30)</span><span className="spacer" /><span className="faint">khởi tạo</span></div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
