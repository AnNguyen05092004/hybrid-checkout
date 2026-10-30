import { useNavigate } from "react-router-dom";
import { useStore } from "../../app/store";
import { Card, DemoNote, PageHeader, Stat, VersionBadge } from "../../components/ui";
import { Lines } from "../../components/charts";
import { date, pct } from "../../lib/format";
import { GATE, MODEL_VERSIONS } from "../../mocks/models";

/** L04 — Model versions (US21). */
export function ModelsPage() {
  const { versionStatus, versionCreatedAt, activeBatch } = useStore();
  const navigate = useNavigate();
  const shown = MODEL_VERSIONS.filter((v) => versionStatus[v.id] !== "CHUA_CO");
  const active = MODEL_VERSIONS.find((v) => v.batch === activeBatch)!;
  const prev = (i: number) => MODEL_VERSIONS[i - 1];

  return (
    <>
      <PageHeader title="Phiên bản model" sub="Mỗi đợt nhập sinh một phiên bản; chỉ một phiên bản chạy ở quầy tại một thời điểm" />
      <DemoNote>AP50, cAcc (tập val) và giờ GPU là kết quả đánh giá thật của model. Chỉ số đối chiếu (bắt món sót, báo nhầm) là số minh họa của prototype.</DemoNote>
      <div className="stats">
        <Stat label="Đang chạy ở quầy" value={active.id} hint={active.name} tone="ok" />
        <Stat label="SKU camera nhận diện" value={active.skuCount} />
        <Stat label="AP50 val" value={pct(active.ap50, 2)} />
        <Stat label="cAcc val" value={pct(active.cacc, 2)} hint="tỉ lệ khay đếm đúng toàn bộ" />
      </div>
      <div className="grid" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", alignItems: "start" }}>
        <Card title="Chỉ số qua các phiên bản (tập val)">
          <Lines labels={shown.map((v) => v.id)} min={40} max={100} series={[
            { name: "AP50", color: "#0d6e6e", values: shown.map((v) => v.ap50) },
            { name: "cAcc", color: "#f59e0b", values: shown.map((v) => v.cacc) },
          ]} />
          <p className="small muted" style={{ marginTop: 8 }}>AP50 giữ ổn định khi thêm SKU (model không quên SKU cũ). cAcc giảm vì khay chứa nhiều SKU hơn và mỗi khay có nhiều món: đúng từng món tốt chưa đủ để đúng cả khay, nên mã vạch vẫn là kênh tính tiền.</p>
        </Card>
        <Card title="Dòng thời gian">
          <div className="col" style={{ gap: 10 }}>
            {[...shown].reverse().map((v) => (
              <div key={v.id} className="sim-item" style={{ cursor: "pointer", padding: 10 }} onClick={() => navigate(`/models/${v.id}`)}>
                <span className="strong" style={{ width: 32 }}>{v.id}</span>
                <span style={{ flex: 1 }}>{v.name}<div className="small faint">{v.skuCount} SKU · {versionCreatedAt[v.id] ? date(versionCreatedAt[v.id]) : ""}</div></span>
                <VersionBadge status={versionStatus[v.id]} />
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card title="Tất cả phiên bản" bodyClass="">
        <div className="table-wrap"><table className="table">
          <thead><tr><th>Phiên bản</th><th>Đợt</th><th className="num">SKU</th><th className="num">AP50 val</th><th className="num">cAcc val</th><th className="num">Mức quên</th><th className="num">Giờ GPU</th><th>Cổng duyệt</th><th>Trạng thái</th></tr></thead>
          <tbody>{shown.map((v, i) => {
            const pass = (!prev(i) || v.ap50 >= prev(i).ap50 - GATE.maxAp50Drop) && v.forgetting <= GATE.maxForgetting && v.missRecall >= GATE.minMissRecall && v.falseAlarm <= GATE.maxFalseAlarm;
            return (
              <tr key={v.id} className="clickable" onClick={() => navigate(`/models/${v.id}`)}>
                <td className="strong">{v.name}</td><td>#{v.batch}</td><td className="num">{v.skuCount}</td><td className="num">{pct(v.ap50, 2)}</td>
                <td className="num">{pct(v.cacc, 2)}</td><td className="num">≈ 0</td><td className="num">{v.gpuHours}</td>
                <td>{pass ? <span className="badge ok">Đạt</span> : <span className="badge danger">Không đạt</span>}</td><td><VersionBadge status={versionStatus[v.id]} /></td>
              </tr>
            );
          })}</tbody>
        </table></div>
      </Card>
    </>
  );
}
