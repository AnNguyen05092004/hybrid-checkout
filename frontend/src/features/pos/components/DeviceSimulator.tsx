import { Cpu } from "lucide-react";
import { useStore } from "../../../app/store";
import { Badge } from "../../../components/ui";
import { sku } from "../../../mocks/catalog";
import { LEVEL_LABEL, TRAYS } from "../../../mocks/trays";
import type { Checkout } from "../useCheckout";

/**
 * Prototype only: stands in for the tray on the counter and the barcode scanner.
 * "Quét" scans one item; "Tráo" scans a cheaper SKU of the same category instead (swap fraud).
 */
export function DeviceSimulator({ co }: { co: Checkout }) {
  const { skus } = useStore();
  const { tray, trayId, setTrayId, nextTray, lines, phase, scanned, scan, isLearned } = co;
  const locked = lines.length > 0 || phase !== "idle";
  const onTray = new Map<number, number>();
  tray.objects.forEach((o) => onTray.set(o.rpcId, (onTray.get(o.rpcId) ?? 0) + 1));
  const scanAll = () => [...onTray].forEach(([id, n]) => {
    for (let i = (scanned.get(id) ?? 0); i < n; i++) scan(sku(id).barcode);
  });

  return (
    <details className="sim" open>
      <summary className="small strong row" style={{ color: "var(--info)", cursor: "pointer" }}>
        <Cpu size={14} /> Mô phỏng thiết bị — khay trên quầy và máy quét (chỉ có trong prototype)
      </summary>
      <div className="col" style={{ marginTop: 10 }}>
        <div className="row wrap">
          <select className="select" value={trayId} disabled={locked} onChange={(e) => setTrayId(e.target.value)} aria-label="Chọn khay mẫu">
            {TRAYS.map((t) => (
              <option key={t.id} value={t.id}>
                Khay {t.id} — {LEVEL_LABEL[t.level]}, {t.objects.length} món{t.objects.some((o) => !isLearned(o.rpcId)) ? " · có hàng mới" : ""}
              </option>
            ))}
          </select>
          <button className="btn sm" disabled={locked} onClick={nextTray}>Khay khác</button>
          <button className="btn sm" onClick={scanAll}>Quét hết</button>
          {tray.objects.some((o) => !isLearned(o.rpcId)) && <Badge tone="warn">Có hàng mới chưa học</Badge>}
        </div>
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 6 }}>
          {[...onTray].map(([id, n]) => {
            const s = sku(id);
            const cheaper = skus.filter((x) => x.category === s.category && x.id !== id && x.price < s.price).sort((a, b) => a.price - b.price)[0];
            return (
              <div key={id} className="sim-item">
                <span style={{ flex: 1, minWidth: 0 }}>
                  <div className="small strong ellipsis">{s.name}</div>
                  <div className="small faint">trên khay {n} · đã quét {scanned.get(id) ?? 0}{!isLearned(id) ? " · chưa học" : ""}</div>
                </span>
                <button className="btn sm" onClick={() => scan(s.barcode)}>Quét</button>
                {cheaper && <button className="btn sm ghost" onClick={() => scan(cheaper.barcode)} title={`Quét nhầm thành ${cheaper.name} (rẻ hơn)`}>Tráo</button>}
              </div>
            );
          })}
        </div>
      </div>
    </details>
  );
}
